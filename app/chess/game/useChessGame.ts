import { useRef, useState } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import { SquareHandlerArgs } from "react-chessboard";

export function useChessGame() {
    const chessRef = useRef(new Chess());
    const chess = chessRef.current;

    const [position, setPosition] = useState(chess.fen());
    const [moveFrom, setMoveFrom] = useState("");
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const [promotionMove, setPromotionMove] = useState<{
        from: Square;
        to: Square;
    } | null>(null);

    const updateBoard = () => setPosition(chess.fen());

    const getMoveOptions = (square: Square) => {
        const moves = chess.moves({ square, verbose: true });
        if (!moves.length) {
            setOptionSquares({});
            return false;
        }

        const styles: Record<string, React.CSSProperties> = {};
        moves.forEach((m) => {
            styles[m.to] = {
                background:
                    chess.get(m.to)?.color !== chess.get(square)?.color
                        ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
                        : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
                borderRadius: "50%",
            };
        });
        styles[square] = { background: "rgba(255,255,0,0.4)" };
        setOptionSquares(styles);
        return true;
    };

    const tryMove = (from: Square, to: Square, promotion: PieceSymbol = 'q') => {
        try {
            chess.move({ from, to, promotion });
            updateBoard();
            return true;
        } catch {
            return false;
        }
    };



    const onSquareClick = ({ square, piece }: SquareHandlerArgs) => {
        if (!moveFrom && piece) {
            if (getMoveOptions(square as Square)) setMoveFrom(square);
            return;
        }

        if (!moveFrom) {
            // Clicked empty square without a previous selection
            setOptionSquares({});
            return;
        }

        const moves = chess.moves({ square: moveFrom as Square, verbose: true });
        const valid = moves.find((m) => m.to === square);

        if (!valid) {
            const has = getMoveOptions(square as Square);
            setMoveFrom(has ? square : "");
            return;
        }

        if (valid.promotion) {
            setPromotionMove({ from: moveFrom as Square, to: square as Square });
            setMoveFrom("");
            setOptionSquares({});
            return;
        }

        const success = tryMove(moveFrom as Square, square as Square);
        setMoveFrom("");
        setOptionSquares({});

        if (success) {

        }
    };

    const reset = () => {
        chess.reset();
        updateBoard();
        setPromotionMove(null);
        setMoveFrom("");
        setOptionSquares({});
    };

    const undo = (playerColor: 'w' | 'b') => {
        chess.undo();
        // If it's now the opponent's turn, it means we only undid the AI move 
        // (or the AI hadn't moved yet). We want to undo the player's move too.
        if (chess.turn() !== playerColor && !chess.isGameOver()) {
            chess.undo();
        }
        updateBoard();
        setPromotionMove(null);
        setMoveFrom("");
        setOptionSquares({});
    };

    const loadFen = (fen: string) => {
        try {
            chess.load(fen);
            updateBoard();
            setPromotionMove(null);
            setMoveFrom("");
            setOptionSquares({});
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const removePiece = (square: Square) => {
        const piece = chess.get(square);
        if (piece && piece.type !== 'k') {
            chess.remove(square);
            updateBoard();
            return true;
        }
        return false;
    };

    return {
        chess,
        position,
        onSquareClick,
        optionSquares,
        promotionMove,
        setPromotionMove,
        tryMove,

        reset,
        setMoveFrom,
        setOptionSquares,
        undo,
        loadFen,
        removePiece
    };
}
