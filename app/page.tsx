"use client";

import React, { useEffect, useState } from "react";
import { PieceDropHandlerArgs } from "react-chessboard";
import { fenStringToPositionObject } from "react-chessboard";
import { PieceSymbol, Square } from "chess.js";

import { useChessGame } from "./chess/game/useChessGame";
import { usePremoves } from "./chess/game/usePremoves";
import { useEngine } from "./chess/engine/useEngine";
import { useGameState } from "./chess/game/useGameState";
import { ChessBoardView } from "./chess/ui/ChessBoardView";
import { PromotionDialog } from "./chess/ui/usePromotionDialog";
import { EvaluationBar } from "./chess/ui/EvaluationBar";

export default function Home() {
  const game = useChessGame();
  const premoves = usePremoves();
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  // We can pass current FEN to engine if we want continuous evaluation, 
  // but for now we keep the original behavior of just initial eval or manual trigger if added.
  const { evaluation, evaluate, isReady, blunderMeter, setBlunderMeter } = useEngine();
  const gameState = useGameState(game.chess);

  const [isRemovalMode, setIsRemovalMode] = useState(false);
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Engine: Trigger search when it's NOT player's turn
  useEffect(() => {
    if (game.chess.turn() !== playerColor && !game.chess.isGameOver()) {
      // Stockfish opponent plays at depth 10
      evaluate(game.position, 10);
    }
    // If it's white's turn, we might want to stop the engine or let it ponder?
    // For now, simple turn-based.
  }, [game.position, evaluate]); // turn is derived from position

  // Engine: Make move when bestMove is found
  useEffect(() => {
    if (game.chess.turn() !== playerColor && evaluation.bestMove && !game.chess.isGameOver()) {
      const best = evaluation.bestMove;
      const from = best.substring(0, 2) as Square;
      const to = best.substring(2, 4) as Square;
      const promotion = best.length > 4 ? best[4] as PieceSymbol : undefined;

      game.tryMove(from, to, promotion);
      setShowHint(false); // Clear hint on opponent move
      setHintMove(null);
    } else if (game.chess.turn() === playerColor && evaluation.bestMove && showHint) {
      setHintMove(evaluation.bestMove);
    }
  }, [evaluation.bestMove, game.chess.turn(), playerColor, showHint]);

  // State for click-to-premove
  const [premoveMoveFrom, setPremoveMoveFrom] = React.useState<string | null>(null);

  // Calculate visual board position by applying premoves on top of current game position
  const { visualPosition, premoveStyles } = React.useMemo(() => {
    // Start with current game position
    const posObject = typeof game.position === 'string'
      ? fenStringToPositionObject(game.position, 8, 8)
      : game.position;

    const styles: Record<string, React.CSSProperties> = {};
    const premoveQueue = [...premoves.premoves];

    // Copy position to avoid mutation issues if any
    const visual = { ...posObject };

    // Apply premoves
    premoveQueue.forEach((p) => {
      // Remove from source
      delete visual[p.sourceSquare];

      // Add to target with correct format (e.g. "wP", "bR" etc)
      // piece.pieceType is "p", "r" etc. We need color.
      // PieceDropHandlerArgs piece has { pieceType: "p", color: "w" } ?? 
      // No, typically it just has piece string like "wP" in some contexts but here likely object? 
      // Wait, react-chessboard piece arg is string "wP" or object?
      // Actually PieceDropHandlerArgs.piece is string like "wP" in some versions, but in our code it seems used as object with pieceType?
      // Let's check usage in onPieceDrop: `piece.pieceType` is accessed. 
      // So `piece` is likely `{ pieceType: "p", color: "w" }` or similar string?
      // In react-chessboard v4 it's string.
      // But our code uses `piece.pieceType`. 
      // Let's check `PieceDropHandlerArgs` definition if possible or infer from usage.
      // In `page.tsx` line 36: `piece.pieceType[1] === "p"`. So `piece` is string? "wP".
      // No, `piece.pieceType` seems to imply `piece` is an object?
      // Actually standard react-chessboard: `onPieceDrop(sourceSquare, targetSquare, piece)`.
      // `piece` is string "wP", "bK".
      // If our code accesses `piece.pieceType`, then `piece` might be an object from a custom wrapper or I misread.
      // Looking at `page.tsx` line 24: `const onPieceDrop = ({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs)`.
      // And line 27: `const color = piece.pieceType[0];`
      // Wait, `wP` string doesn't have `pieceType` property.
      // Maybe our `PieceDropHandlerArgs` types are custom?
      // Let's assume the previous code was working and `piece.pieceType` is correct? 
      // Wait, `piece` in `react-chessboard` is string. `piece[1]` is type.
      // If previous code used `piece.pieceType[0]`, maybe `piece` was passed as object?
      // Let's re-read `onPieceDrop` signature in `page.tsx` carefully.
      // It says `piece` is string in standard lib. 
      // If I look at `useChessGame.ts`/`onSquareClick`, it passes internal logic.
      // But `onPieceDrop` comes from `react-chessboard`.
      // Okay, assume `piece` is the string "wP".
      // Then `piece[1]` is "P".
      // If code says `piece.pieceType`, it might be wrong? 
      // OR `PieceDropHandlerArgs` is imported from `react-chessboard` but maybe it's not what I think.
      // Let's look at `ChessBoardView.tsx`: `piece.pieceType` is used.
      // `const canDragPiece = ({ piece }: PieceHandlerArgs) => piece.pieceType[0] === "w";`
      // This suggests `piece` has `pieceType`.
      // Ah, `react-chessboard` might pass object if custom? Or maybe it's `piece` string and some property?
      // Actually, if `piece` is "wP", `piece.pieceType` is undefined.
      // UNLESS, `PieceDropHandlerArgs` in this repo is `{ sourceSquare, targetSquare, piece: string }` and the user uses `piece[1]`?
      // NO, the code explicitly says `piece.pieceType`. 
      // Let me check `usePromotionDialog`... `p` is "q".
      // Let me check `ChessBoardView.tsx` again. `pos[p.targetSquare!] = { pieceType: p.piece.pieceType };`
      // This implies `p.piece` has `pieceType`.
      // Okay, I will stick to the existing pattern: `piece` has `pieceType`.

      const pieceCode = p.piece; // Assume this is the object or string. 
      // The visual board expects strings "wP" for keys? Or objects?
      // `fenStringToPositionObject` returns object like `{ e4: "wP" }` in recent versions?
      // OR `{ e4: { pieceType: "p", color: "w" } }`?
      // The previous `ChessBoardView` used: `pos[p.targetSquare!] = { pieceType: p.piece.pieceType };`
      // This suggests `pos` values are objects.

      visual[p.targetSquare!] = pieceCode; // Just direct assignment if it matches structure
      // Wait, `p.piece` in `premoves` is stored from `onPieceDrop`.

      styles[p.sourceSquare] = { backgroundColor: "rgba(20, 85, 30, 0.5)" }; // Greenish for premove src
      styles[p.targetSquare!] = { backgroundColor: "rgba(20, 85, 30, 0.5)" }; // Greenish for premove dest
    });

    if (premoveMoveFrom) {
      styles[premoveMoveFrom] = { backgroundColor: "rgba(255, 255, 0, 0.5)" }; // Yellow for selection
    }

    if (showHint && hintMove) {
      const from = hintMove.substring(0, 2);
      const to = hintMove.substring(2, 4);
      styles[from] = { backgroundColor: "rgba(0, 0, 255, 0.4)" }; // Blue for hint source
      styles[to] = { backgroundColor: "rgba(0, 0, 255, 0.4)" };   // Blue for hint target
    }

    return { visualPosition: visual, premoveStyles: styles };
  }, [game.position, premoves.premoves, premoveMoveFrom, showHint, hintMove]);


  // Custom onPieceDrop to handle premoves and promotion
  const onPieceDrop = ({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs) => {
    if (!targetSquare) return false;

    // Determine color. Re-using existing logic assuming 'piece.pieceType' logic holds or correcting it if needed.
    // If 'piece' is string "wP": color=piece[0].
    // If 'piece' is object: color=piece.pieceType[0]?
    // Let's protect against both.
    const pieceStr = typeof piece === 'string' ? piece : (piece as any).pieceType || (piece as any).type || "";
    const isWhite = pieceStr.startsWith('w') || (piece as any).color === 'w'; // Fallback
    const color = isWhite ? 'w' : 'b';

    // Check if it's player's turn
    // AND check if we are NOT in a premove state (no queued premoves that haven't executed)
    // Actually, if we have premoves, we should append to them?
    // User wants "chaining".
    // So if it is NOT white's turn, OR if we already have premoves queued (meaning we are planning ahead), it's a premove.

    if (game.chess.turn() !== color || premoves.premoves.length > 0) {
      // Validate logical move consistency?
      // For now, just add it. User said "if it's illegal then break flow" -> handled at execution time.
      // But visual feedback is nice: we should only allow dragging pieces that exist in visualPosition at sourceSquare.
      // The Chessboard component handles dragging based on visualPosition.

      premoves.add({ sourceSquare, targetSquare, piece });
      setPremoveMoveFrom(null); // Clear click selection if any
      return true;
    }

    // detect promotion BEFORE moving
    const isPawn = (pieceStr[1] === "p") || (pieceStr.includes("Pawn")); // robust check
    const promotionRank = color === "w" ? "8" : "1";

    if (isPawn && targetSquare.endsWith(promotionRank)) {
      game.setPromotionMove({ from: sourceSquare as Square, to: targetSquare as Square });
      return true; // stop normal move
    }

    // normal move
    const ok = game.tryMove(sourceSquare as Square, targetSquare as Square);

    if (ok) {
      game.setMoveFrom("");
      game.setOptionSquares({});
      setShowHint(false); // Clear hint on player move
      setHintMove(null);
    }

    return ok;
  };

  const handleSquareClick = (args: any) => {
    const { square, piece } = args;

    if (isRemovalMode) {
      if (piece) {
        game.removePiece(square as Square);
      }
      return;
    }

    // If player's turn and no premoves, use normal game click logic
    if (game.chess.turn() === playerColor && premoves.premoves.length === 0) {
      game.onSquareClick(args);
      return;
    }

    // Premove Click Logic
    // If we have a selected piece for premove
    if (premoveMoveFrom) {
      // If clicked same square, cancel
      if (premoveMoveFrom === square) {
        setPremoveMoveFrom(null);
        return;
      }

      // Add premove
      // We need 'piece' info. We can find it from visualPosition
      const pieceAtSource = visualPosition[premoveMoveFrom];
      if (pieceAtSource) {
        premoves.add({
          sourceSquare: premoveMoveFrom,
          targetSquare: square,
          piece: pieceAtSource as any // Pass the visual piece object/string
        });
        setPremoveMoveFrom(null);
      } else {
        // Should not happen if logic is correct
        setPremoveMoveFrom(null);
      }
    } else {
      // Select piece if it belongs to us (Player)
      // We check visualPosition
      const p: any = visualPosition[square];
      // Check if piece matches player color. 
      // If 'p' is string "wP" -> p[0] == 'w'
      // If 'p' is object { color: 'w', ... }
      let isPlayerPiece = false;
      const targetPrefix = playerColor;

      if (typeof p === 'string') isPlayerPiece = p.startsWith(targetPrefix);
      else if (p && p.color === playerColor) isPlayerPiece = true;
      else if (p && p.pieceType && p.pieceType.startsWith(targetPrefix)) isPlayerPiece = true;

      if (isPlayerPiece) {
        setPremoveMoveFrom(square);
      }
    }
  };

  // Execute premove if it exists
  const executeNextPremove = () => {
    const premove = premoves.pop();
    if (!premove) return;

    const success = game.tryMove(premove.sourceSquare as Square, premove.targetSquare as Square);

    if (!success) {
      premoves.clear();
    } else {
      // If successful, wait a tiny bit or check next?
      // User wants "fast as instant".
      // But we need to wait for opponent if it was opponent's turn?
      // Wait, executeNextPremove is called when it IS our turn (after opponent moved).
      // If we have multiple premoves:
      // Move 1 (P1) -> Success -> Opponent Move -> Move 2 (P2)? 
      // NO, Premove is pre-entered moves for MY turn.
      // User said "move a piece multiple times".
      // This implies: I move A->B (my turn), then I move B->C (myNEXT turn)?
      // OR: I move A->B, B->C (all in my turn)? Impossible in chess unless multi-move variant.
      // PREMOVES allow A->B (my response to opponent).
      // If I queue A->B, then B->C.
      // Sequence:
      // 1. Opponent moves.
      // 2. My P1 (A->B) executes immediately.
      // 3. Opponent moves.
      // 4. My P2 (B->C) executes immediately.
      // So we don't execute ALL premoves at once. We execute ONE.
      // The queue remains.
    }
  };

  useEffect(() => {
    if (game.chess.turn() === playerColor && premoves.premoves.length > 0) {
      // Instant execution
      executeNextPremove();
    }
  }, [game.position, game.chess.turn(), playerColor]);
  // Added game.chess.turn() explicitly although position change usually implies it

  const onPromotionSelect = (piece: PieceSymbol) => {
    if (!game.promotionMove) return;

    game.tryMove(game.promotionMove.from, game.promotionMove.to, piece);
    game.setPromotionMove(null);

  };

  interface FairChessPosition {
    fen: string;
    san: string;
  }

  const fairchessUrl = "https://assets.codepen.io/1143063/ply8_fairchess.json";

  const [fairPositions, setFairPositions] = useState<FairChessPosition[]>([]);

  useEffect(() => {
    fetch(fairchessUrl)
      .then((res) => res.json())
      .then((data: FairChessPosition[]) => {
        setFairPositions(data);
      })
      .catch((err) => console.error("Failed to load FENs:", err));
  }, []);

  const handleRandomOpening = () => {
    if (!fairPositions.length) return;
    const randomPos = fairPositions[Math.floor(Math.random() * fairPositions.length)];
    game.loadFen(randomPos.fen);
  };


  const [endgameFens, setEndgameFens] = useState<string[]>([]);

  useEffect(() => {
    fetch("/endgame.txt")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(line => line !== '');
        setEndgameFens(lines);
      })
      .catch((err) => console.error("Failed to load endgames:", err));
  }, []);

  const handleRandomEndgame = () => {
    if (!endgameFens.length) return;
    const randomFen = endgameFens[Math.floor(Math.random() * endgameFens.length)];

    // Determine whose turn it is
    const turn = randomFen.split(' ')[1] || 'w';
    setPlayerColor(turn === 'w' ? 'w' : 'b');

    game.loadFen(randomFen);
  };

  // Copy current FEN to clipboard
  const copyFEN = async () => {
    try {
      await navigator.clipboard.writeText(game.position);
    } catch (err) {
      console.error('Failed to copy FEN:', err);
    }
  };

  // Regenerate: Undo AI's last move and make it play again
  const regenerate = () => {
    // Only regenerate if it's currently the player's turn (meaning AI just moved)
    if (game.chess.turn() === playerColor && !game.chess.isGameOver()) {
      game.chess.undo(); // Undo the AI's last move
      const newFen = game.chess.fen();
      game.loadFen(newFen); // Force update to trigger re-evaluation
    }
  };

  // New Game: Reset the board to starting position
  const newGame = () => {
    game.reset();
    premoves.clear();
    setShowHint(false);
    setHintMove(null);
  };



















  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black flex flex-col items-center justify-center p-4 lg:p-8 gap-8">

      {/* --- Game Area: Eval | Board | History --- */}
      <div className="flex flex-col xl:flex-row items-start justify-center gap-6 w-full max-w-8xl">

        {/* 1. Left: Evaluation Bar */}
        <div className="hidden xl:flex flex-col items-center justify-center h-[600px]">
          {/* Stockfish gives CP/Mate relative to side to move. 
              We want white's perspective for the bar. 
              If it was black's turn to move, we negate the values. */}
          <EvaluationBar
            cp={evaluation.turn === 'b' && evaluation.cp !== undefined ? -evaluation.cp : evaluation.cp}
            mate={evaluation.turn === 'b' && evaluation.mate !== undefined
              ? (evaluation.mate.startsWith('-') ? evaluation.mate.substring(1) : '-' + evaluation.mate)
              : evaluation.mate
            }
          />
        </div>

        {/* 2. Center: Chess Board */}
        <div className="relative shrink-0 flex flex-col items-center h-150 w-150">
          <div style={{ position: 'relative' }} className="rounded-lg overflow-hidden shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] border border-neutral-800">
            {game.promotionMove && (
              <PromotionDialog
                onSelect={onPromotionSelect}
                onCancel={() => game.setPromotionMove(null)}
              />
            )}

            <ChessBoardView
              position={visualPosition}
              optionSquares={{ ...game.optionSquares, ...premoveStyles }}
              premoves={premoves.premoves}
              showAnimations={premoves.showAnimations}
              onSquareClick={handleSquareClick}
              onPieceDrop={onPieceDrop}
              onSquareRightClick={premoves.clear}
              boardOrientation={playerColor === 'w' ? 'white' : 'black'}
            />
          </div>
        </div>

        {/* 3. Right: Game History Panel */}
        <div className="w-100!  xl:w-80 bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex flex-col h-[600px] backdrop-blur-sm shadow-2xl ">
          <h3 className="font-semibold text-lg tracking-tight mb-4 border-b border-neutral-800 pb-2">Game History</h3>

          {/* Scrollable History List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-12 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent  [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {game.chess.history().reduce((result: any[], move, index) => {
              if (index % 2 === 0) {
                result.push([move]);
              } else {
                result[result.length - 1].push(move);
              }
              return result;
            }, []).map((pair, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-white/5 transition-colors group">
                <span className="text-neutral-500 font-mono text-xs w-6">{i + 1}.</span>
                <div className="flex gap-6 font-mono text-neutral-200">
                  <span className="w-15 text-right group-hover:text-white transition-colors">{pair[0]}</span>
                  <span className="w-15 text-right group-hover:text-white transition-colors">{pair[1] || ''}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Game Result Display */}
          {gameState.isGameOver && (
            <div className="mb-4 p-4 bg-gradient-to-r from-neutral-800 to-neutral-900 border-2 border-white/20 rounded-lg text-center">
              <div className="text-xl font-bold text-white mb-1">{gameState.result}</div>
              <div className="text-sm text-neutral-400">{gameState.reason}</div>
            </div>
          )}

          {/* History Footer Actions */}
          <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-col gap-2">
            {gameState.isGameOver ? (
              <button
                onClick={() => newGame()}
                className="w-full px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded text-sm font-bold transition-colors border border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                New Game
              </button>
            ) : (
              <button
                onClick={() => regenerate()}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm font-medium transition-colors border border-neutral-700"
              >
                Regenerate
              </button>
            )}
            <button
              onClick={() => copyFEN()}
              className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm font-medium transition-colors border border-neutral-700"
            >
              Copy FEN
            </button>
          </div>
        </div>
      </div>

      {/* --- Bottom: Control Buttons --- */}
      <div className="w-full max-w-4xl flex flex-col gap-4">
        {/* Blunder Meter Slider */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-neutral-900/30 border border-neutral-800 rounded-2xl backdrop-blur-md shadow-xl text-sm">
          <div className="flex flex-col gap-1 w-full md:w-1/2">
            <div className="flex justify-between items-center pr-2">
              <label htmlFor="blunder-slider" className="text-neutral-300 font-medium">Blunder Meter</label>
              <span className="text-white font-bold font-mono">{blunderMeter}%</span>
            </div>
            <input
              id="blunder-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={blunderMeter}
              onChange={(e) => setBlunderMeter(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-neutral-300 transition-all"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 px-1 pt-1 font-medium">
              <span>Grandmaster (0%)</span>
              <span>Casual (50%)</span>
              <span>Beginner (100%)</span>
            </div>
          </div>
          <div className="text-xs text-neutral-400 italic md:max-w-[200px]">
            {blunderMeter < 25 ? "Bot plays near-perfectly." : blunderMeter < 50 ? "Bot plays like a club player." : blunderMeter < 75 ? "Bot makes occasional mistakes." : "Bot blunders frequently."}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 p-4 bg-neutral-900/30 border border-neutral-800 rounded-2xl backdrop-blur-md shadow-xl">

          {/* Reset */}
          <button
            onClick={game.reset}
            className="px-5 py-2 text-sm font-medium rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5 transition-all"
          >
            Reset Position
          </button>

          {/* Undo */}
          <button
            onClick={() => game.undo(playerColor)}
            className="px-5 py-2 text-sm font-medium rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5 transition-all"
          >
            Undo Move
          </button>

          {/* Flip Side */}
          <button
            onClick={() => setPlayerColor(prev => prev === 'w' ? 'b' : 'w')}
            className="px-5 py-2 text-sm font-medium rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5 transition-all"
          >
            Flip Side
          </button>

          {/* Random Opening */}
          <button
            onClick={handleRandomOpening}
            className="px-5 py-2 text-sm font-medium rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5 transition-all"
          >
            Random Opening
          </button>

          {/* Random Endgame */}
          <button
            onClick={handleRandomEndgame}
            className="px-5 py-2 text-sm font-medium rounded border border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5 transition-all"
          >
            Random Endgame
          </button>

          {/* Removal Mode Toggle */}
          <button
            onClick={() => setIsRemovalMode(prev => !prev)}
            className={`px-5 py-2 text-sm font-medium rounded transition-all duration-200 border ${isRemovalMode
              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
              : 'border-neutral-700 text-neutral-300 hover:text-white hover:border-white hover:bg-white/5'
              }`}
          >
            {isRemovalMode ? 'Disable Removal' : 'Enable Removal'}
          </button>

          {/* Hint (Primary Action) */}
          <button
            onClick={() => {
              if (game.chess.turn() === playerColor) {
                setShowHint(true);
                // Hints use deeper search (depth 15) for better quality than opponent (depth 10)
                evaluate(game.position, 12);
              }
            }}
            className="px-6 py-2 text-sm font-bold text-black bg-white rounded hover:bg-neutral-200 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-transparent"
          >
            Hint
          </button>

        </div>
      </div>

    </div>
  );
}
