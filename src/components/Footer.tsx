export function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2.5 w-fit text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] rounded-lg"
            >
              <span
                aria-hidden="true"
                className="grid h-6 w-6 grid-cols-2 gap-0.5 rounded-lg bg-[#141414] p-1 dark:bg-[#F5F5F7]"
              >
                <span className="rounded-[2px] bg-[#F6F6F6] dark:bg-[#111112]" />
                <span className="rounded-[2px] bg-[#276EF1]" />
                <span className="col-span-2 rounded-[2px] bg-[#F6F6F6]/85 dark:bg-[#111112]/85" />
              </span>
              <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Tramo
              </span>
            </a>
            <p className="text-sm text-[var(--text-secondary)]">
              Tramo - Simulador B2B Corredor Polo 52 / RN 9
            </p>
          </div>

          <nav aria-label="Navegación de pie de página" className="flex items-center gap-6">
            <a
              href="#circuito"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Circuito
            </a>
            <a
              href="#visibilidad"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Visibilidad
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
