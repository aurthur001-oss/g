// Logo.tsx

export const Logo = ({
    size = 24,
    className = '',
    animate = false
}: {
    size?: number;
    className?: string;
    animate?: boolean;
}) => (
    <svg
        width={size}
        height={size}
        viewBox="-10 -10 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block transition-all duration-300 overflow-visible ${className} ${animate ? 'animate-ghost-flow' : ''}`}
    >
        <g transform="translate(0, 0)">
            <path
                d="M60 15L100 38.5V81.5L60 105L20 81.5V38.5L60 15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.1"
            />
            <path
                d="M85 45V38.5L60 24L35 38.5V81.5L60 96L85 81.5V60H65"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-90"
            />
            <circle
                cx="60"
                cy="60"
                r="6"
                fill="currentColor"
                className={animate ? 'animate-pulse' : 'opacity-40'}
            />
        </g>
        <style>{`
      @keyframes ghost-flow {
        0%, 100% { filter: drop-shadow(0 0 2px var(--accent)); transform: translateY(0); }
        50% { filter: drop-shadow(0 0 12px var(--accent)); transform: translateY(-2px); }
      }
      .animate-ghost-flow { 
        animation: ghost-flow 3s infinite ease-in-out; 
        color: var(--accent);
      }
    `}</style>
    </svg>
);
