/*!
 * Stockfish.js (http://github.com/nmrugg/stockfish.js)
 * License: GPL
 */

/*
 * Description of the universal chess interface (UCI)  https://gist.github.com/aliostad/f4470274f39d29b788c1b09519e67372/
 */

// const stockfish = new Worker('./stockfish.wasm.js');

type EngineMessage = {
    /** stockfish engine message in UCI format*/
    uciMessage: string;
    /** found best move for current position in format `e2e4`*/
    bestMove?: string;
    /** found best move for opponent in format `e7e5` */
    ponder?: string;
    /**  material balance's difference in centipawns(IMPORTANT! stockfish gives the cp score in terms of whose turn it is)*/
    positionEvaluation?: string;
    /** count of moves until mate */
    possibleMate?: string;
    /** the best line found */
    pv?: string;
    /** number of halfmoves the engine looks ahead */
    depth?: number;
    /** multiPV index if enabled */
    multipv?: number;
};

export default class Engine {
    stockfish: Worker;
    onMessage: (callback: (messageData: EngineMessage) => void) => void;
    isReady: boolean;

    constructor() {
        this.stockfish = new Worker("./stockfish.wasm.js");
        this.isReady = false;
        this.onMessage = (callback) => {
            this.stockfish.addEventListener('message', (e) => {
                callback(this.transformSFMessageData(e));
            });
        };
        this.init();
    }

    private transformSFMessageData(e: MessageEvent<string>) {
        const uciMessage = e?.data ?? e;

        return {
            uciMessage,
            bestMove: uciMessage.match(/bestmove\s+(\S+)/)?.[1],
            ponder: uciMessage.match(/ponder\s+(\S+)/)?.[1],
            positionEvaluation: uciMessage.match(/cp\s+(\S+)/)?.[1],
            possibleMate: uciMessage.match(/mate\s+(\S+)/)?.[1],
            pv: uciMessage.match(/ pv\s+(.*)/)?.[1],
            depth: Number(uciMessage.match(/ depth\s+(\S+)/)?.[1] ?? 0),
            multipv: Number(uciMessage.match(/ multipv\s+(\d+)/)?.[1] ?? 0),
        };
    }

    init() {
        this.stockfish.postMessage('uci');
        this.stockfish.postMessage('isready');
        this.onMessage(({ uciMessage }) => {
            if (uciMessage === 'readyok') {
                this.isReady = true;
            }
        });
    }

    onReady(callback: () => void) {
        this.onMessage(({ uciMessage }) => {
            if (uciMessage === 'readyok') {
                callback();
            }
        });
    }

    setOption(name: string, value: string | number) {
        this.stockfish.postMessage(`setoption name ${name} value ${value}`);
    }

    setMultiPv(n: number) {
        this.setOption('MultiPV', n);
    }

    evaluatePosition(fen: string, options: { depth?: number, movetime?: number } = { depth: 12 }) {
        this.stockfish.postMessage(`position fen ${fen}`);

        let goCmd = 'go';
        if (options.depth) {
            const d = Math.min(options.depth, 24);
            goCmd += ` depth ${d}`;
        }
        if (options.movetime) {
            goCmd += ` movetime ${options.movetime}`;
        }

        this.stockfish.postMessage(goCmd);
    }

    stop() {
        this.stockfish.postMessage('stop'); // Run when searching takes too long time and stockfish will return you the bestmove of the deep it has reached
    }

    terminate() {
        this.isReady = false;
        this.stockfish.postMessage('quit'); // Run this before chessboard unmounting.
    }
}