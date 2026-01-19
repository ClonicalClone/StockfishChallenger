import { PieceSymbol } from "chess.js";
import { defaultPieces, PieceRenderObject } from "react-chessboard";

type Props = {
  onSelect(piece: PieceSymbol): void;
  onCancel(): void;
};

export function PromotionDialog({ onSelect, onCancel }: Props) {
  return (
    <div className= "promotion-overlay" onClick = { onCancel } >
      <div className="promotion-box" onClick = {(e) => e.stopPropagation()
}>
  {(["q", "r", "n", "b"] as PieceSymbol[]).map((p) => (
    <button key= { p } onClick = {() => onSelect(p)}>
    { defaultPieces[`w${p.toUpperCase()}` as keyof PieceRenderObject]() }
  </button>
  ))}
</div>
  </div>
  );
}
