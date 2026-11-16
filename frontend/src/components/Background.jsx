// Animated background: drifting blurred color blobs over a dot grid.
export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-600/20" />
      <div className="animate-blob absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-300/40 blur-3xl [animation-delay:-6s] dark:bg-sky-600/20" />
      <div className="animate-blob absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl [animation-delay:-12s] dark:bg-violet-600/20" />
    </div>
  );
}
