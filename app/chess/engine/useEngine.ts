import { useCallback, useEffect, useRef, useState } from "react";
import Engine from "./engine";

export type EvalState = {
    cp?: number;
    mate?: string;
    depth?: number;
    bestMove?: string;
    pv?: string;
    turn?: 'w' | 'b';
};

type Candidate = {
    move: string;
    eval: number; // centipawns
};

const PROFILES = {
    strong: { inaccuracyRate: 0.00, mistakeRate: 0.00, blunderRate: 0.000 },
    club: { inaccuracyRate: 0.18, mistakeRate: 0.06, blunderRate: 0.015 },
    casual: { inaccuracyRate: 0.28, mistakeRate: 0.12, blunderRate: 0.04 },
    beginner: { inaccuracyRate: 0.35, mistakeRate: 0.18, blunderRate: 0.08 }
};

export function useEngine() {
    const engineRef = useRef<Engine | null>(null);
    const [evaluation, setEvaluation] = useState<EvalState>({});
    const [blunderMeter, setBlunderMeterState] = useState(50); // 0-100
    const blunderMeterRef = useRef(blunderMeter);
    const [isReady, setIsReady] = useState(false);
    const candidatesRef = useRef<Record<number, Candidate>>({});

    useEffect(() => {
        blunderMeterRef.current = blunderMeter;
    }, [blunderMeter]);

    useEffect(() => {
        const engine = new Engine();
        engineRef.current = engine;

        engine.onReady(() => {
            setIsReady(true);
            engine.setMultiPv(5);
            engine.onMessage(({ positionEvaluation, possibleMate, pv, depth, bestMove, multipv, uciMessage }) => {
                // If bestMove is present, it's the final answer from Stockfish for the requested search.
                // However, we might want to override matches with our error model.

                if (multipv && multipv > 0 && pv) {
                    const firstMove = pv.split(' ')[0];
                    let score = 0;
                    if (possibleMate !== undefined) {
                        // Map mate to high centipawn values for calculation
                        const mateVal = parseInt(possibleMate);
                        score = mateVal > 0 ? 10000 - mateVal : -10000 - mateVal;
                    } else if (positionEvaluation !== undefined) {
                        score = parseInt(positionEvaluation);
                    }
                    candidatesRef.current[multipv] = { move: firstMove, eval: score };
                }

                if (bestMove) {
                    // Decide if we should override bestMove
                    const chosenMove = decideMove(bestMove);

                    setEvaluation(prev => ({
                        ...prev,
                        bestMove: chosenMove,
                        depth,
                        pv: pv || prev.pv
                    }));
                    return;
                }

                // Update evaluation for the bar continuously (only for MultiPV 1)
                if (multipv === 1 || (!multipv && !bestMove)) {
                    setEvaluation(prev => {
                        const next: EvalState = {
                            ...prev,
                            depth,
                        };

                        if (possibleMate !== undefined) {
                            next.mate = possibleMate;
                            delete next.cp;
                        } else if (positionEvaluation !== undefined) {
                            next.cp = parseInt(positionEvaluation);
                            delete next.mate;
                        }

                        if (pv) next.pv = pv;

                        return next;
                    });
                }
            });
        });

        return () => engine.terminate();
    }, []);

    const getProfile = () => {
        const val = blunderMeterRef.current;
        if (val < 25) return PROFILES.strong;
        if (val < 50) return PROFILES.club;
        if (val < 75) return PROFILES.casual;
        return PROFILES.beginner;
    };

    const decideMove = (originalBest: string) => {
        const candidates = Object.values(candidatesRef.current).sort((a, b) => b.eval - a.eval);
        if (candidates.length <= 1) return originalBest;

        const profile = getProfile();
        const r = Math.random();
        let errorType: 'best' | 'inaccuracy' | 'mistake' | 'blunder' = 'best';

        if (r < profile.blunderRate) errorType = 'blunder';
        else if (r < profile.blunderRate + profile.mistakeRate) errorType = 'mistake';
        else if (r < profile.blunderRate + profile.mistakeRate + profile.inaccuracyRate) errorType = 'inaccuracy';

        const bestScore = candidates[0].eval;
        const ranges = {
            best: [0, 30],
            inaccuracy: [30, 80],
            mistake: [80, 200],
            blunder: [200, 10000]
        };

        const [min, max] = ranges[errorType];
        const pool = candidates.filter(c => {
            const loss = bestScore - c.eval;
            return loss >= min && loss < max;
        });

        if (pool.length === 0) return candidates[0].move;
        return pool[Math.floor(Math.random() * pool.length)].move;
    };

    const evaluate = useCallback((fen: string, depth = 11) => {
        if (engineRef.current && isReady) {
            const turn = fen.split(' ')[1] as 'w' | 'b';
            setEvaluation({ turn }); // Reset state with current turn
            candidatesRef.current = {}; // Clear candidates for new search
            engineRef.current.evaluatePosition(fen, { depth });
        }
    }, [isReady]);

    const setBlunderMeter = useCallback((val: number) => {
        setBlunderMeterState(val);
    }, []);

    return { evaluation, evaluate, isReady, blunderMeter, setBlunderMeter };
}
