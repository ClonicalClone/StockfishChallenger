import { useMemo } from "react";
import { Chess } from "chess.js";

export type GameResult = {
    isGameOver: boolean;
    result: string | null;
    reason: string | null;
};

export function useGameState(chess: Chess): GameResult {
    return useMemo(() => {
        if (!chess.isGameOver()) {
            return {
                isGameOver: false,
                result: null,
                reason: null,
            };
        }

        // Game is over, determine the reason
        if (chess.isCheckmate()) {
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            return {
                isGameOver: true,
                result: `${winner} wins!`,
                reason: 'Checkmate',
            };
        }

        if (chess.isStalemate()) {
            return {
                isGameOver: true,
                result: 'Draw',
                reason: 'Stalemate',
            };
        }

        if (chess.isThreefoldRepetition()) {
            return {
                isGameOver: true,
                result: 'Draw',
                reason: 'Threefold Repetition',
            };
        }

        if (chess.isInsufficientMaterial()) {
            return {
                isGameOver: true,
                result: 'Draw',
                reason: 'Insufficient Material',
            };
        }

        // Check for fifty-move rule (chess.js includes this in isDraw())
        if (chess.isDraw()) {
            return {
                isGameOver: true,
                result: 'Draw',
                reason: 'Fifty-move Rule',
            };
        }

        // Fallback (shouldn't reach here if chess.js is working correctly)
        return {
            isGameOver: true,
            result: 'Game Over',
            reason: 'Unknown',
        };
    }, [chess.fen()]); // Recompute when position changes
}
