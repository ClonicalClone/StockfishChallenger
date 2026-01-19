import { useRef, useState } from "react";
import { PieceDropHandlerArgs } from "react-chessboard";

export function usePremoves() {
    const ref = useRef<PieceDropHandlerArgs[]>([]);
    const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
    const [showAnimations, setShowAnimations] = useState(true);

    const sync = () => setPremoves([...ref.current]);

    const add = (p: PieceDropHandlerArgs) => {
        ref.current.push(p);
        sync();
    };

    const pop = () => ref.current.shift();

    const clear = () => {
        ref.current = [];
        sync();
        setShowAnimations(false);
        setTimeout(() => setShowAnimations(true), 50);
    };

    return {
        premoves,
        add,
        pop,
        clear,
        showAnimations,
        setShowAnimations,
    };
}
