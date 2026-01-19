type Props = {
    cp?: number;
    mate?: string;
};

export function EvaluationBar({ cp, mate }: Props) {
    let percentage = 50;

    if (mate) {
        // If mate is "1", white mates in 1. bar = 100% white.
        // If mate is "-1", black mates in 1. bar = 0% white (100% black).
        const mateVal = parseInt(mate);
        percentage = mateVal > 0 ? 100 : 0;
    } else if (cp !== undefined) {
        // Clamp cp to +/- 1000 (10 pawns)
        // Adjust for sensitivity. usually 100-200 cp advantage is visible.
        // let's say max range is 8 pawns (800).
        const maxCp = 800;
        const clampedCp = Math.max(-maxCp, Math.min(maxCp, cp));
        percentage = 50 + (clampedCp / maxCp) * 50;
    }

    // Ensure within bounds
    percentage = Math.max(0, Math.min(100, percentage));

    return (
        <div className="h-120 w-6 bg-black border border-gray-600 rounded overflow-hidden flex flex-col-reverse shadow-lg">
            <div
                style={{
                    height: `${percentage}%`,
                    backgroundColor: 'white',
                    transition: 'height 0.5s ease-in-out'
                }}
                className='flex items-center justify-center' />
            {percentage}
        </div>
    );
}
