export type NavIconName = "input" | "list" | "safety" | "location";

export function NavIcon({ name, className }: { name: NavIconName; className: string }) {
  return (
    <svg className={className} viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g transform="translate(1 1)">
        {name === "input" && <>
          <path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="m16 3 5 5M10 14l-1 5 5-1 8-8a2 2 0 0 0 0-3l-2-2a2 2 0 0 0-3 0z" />
          <path d="M7 7h3M7 11h2" />
        </>}
        {name === "list" && <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M10 7h7M10 12h7M10 17h7M7 7h.01M7 12h.01M7 17h.01" />
        </>}
        {name === "safety" && <>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
          <path d="m7.5 12 3 3 6-6" />
        </>}
        {name === "location" && <>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>}
      </g>
    </svg>
  );
}
