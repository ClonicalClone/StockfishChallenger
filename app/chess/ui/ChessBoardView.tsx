import React from "react";
import {
    Chessboard,
    PieceDropHandlerArgs,
    SquareHandlerArgs,
    PieceHandlerArgs,
} from "react-chessboard";

type Props = {
    position: string | Record<string, any>;
    optionSquares: Record<string, React.CSSProperties>;
    premoves: PieceDropHandlerArgs[];
    showAnimations: boolean;

    onSquareClick(args: SquareHandlerArgs): void;
    onPieceDrop(args: PieceDropHandlerArgs): boolean;
    onSquareRightClick(): void;
    boardOrientation?: "white" | "black";
};


export function ChessBoardView({
    position,
    optionSquares,
    premoves,
    showAnimations,
    onSquareClick,
    onPieceDrop,
    onSquareRightClick,
    boardOrientation = "white",
}: Props) {
    const canDragPiece = ({ piece }: PieceHandlerArgs) =>
        piece.pieceType[0] === (boardOrientation === "white" ? "w" : "b");

    const options = {
        position: position as any, // Allow passing object for position
        squareStyles: optionSquares,
        allowDragging: true,
        showAnimations,
        onPieceDrop,
        onSquareClick,
        darkSquareStyle: {
            backgroundColor: 'gray'
        },
        lightSquareStyle: {
            backgroundColor: 'white'
        },
        lightSquareNotationStyle: {
            color: 'black',
            fontWeight: 'bold'
        },
        darkSquareNotationStyle: {
            color: 'black',
            fontWeight: 'bold'
        },
        onSquareRightClick,
        canDragPiece,
        boardOrientation, // Pass orientation to react-chessboard
        id: "chessboard",
        animationDuration: 200,
    };

    return <Chessboard options={options} />;
}
