import { Square, PieceSymbol } from "chess.js";
import { Chess } from "chess.js";

export type PromotionMove = {
    from: Square;
    to: Square;
    color: "w" | "b";
};

export function isPromotionMove(
    chess: Chess,
    from: Square,
    to: Square,
    pieceType: string
): PromotionMove | null {
    const isPawn = pieceType[1] === "p";
    if (!isPawn) return null;

    const color = pieceType[0] as "w" | "b";
    const promotionRank = color === "w" ? "8" : "1";

    if (!to.endsWith(promotionRank)) return null;

    return { from, to, color };
}

export function applyPromotion(
    chess: Chess,
    move: PromotionMove,
    piece: PieceSymbol
) {
    chess.move({
        from: move.from,
        to: move.to,
        promotion: piece,
    });
}
