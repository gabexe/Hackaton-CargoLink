import { ArrowCounterClockwise, Moon, Sun } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { ThemeMode, UserRole } from '../types/logistics';

export interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const DESKTOP_ROLES: Array<{ id: UserRole; label: string }> = [
  { id: 'shipper', label: 'Dador PyME' },
  { id: 'carrier', label: 'Transportista' },
  { id: 'receiver', label: 'Planta Receptora' },
];

const MOBILE_ROLES: Array<{ id: UserRole; label: string; ariaLabel: string }> = [
  { id: 'shipper', label: 'Dador', ariaLabel: 'Dador PyME' },
  { id: 'carrier', label: 'Transportista', ariaLabel: 'Transportista' },
  { id: 'receiver', label: 'Receptora', ariaLabel: 'Planta Receptora' },
];

export function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const { activeRole, setActiveRole, resetSimulation, routes } = useSimulation();
  const hasNearDockRoute = routes.some((route) => route.tripStatus === 'near_dock');

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a
          href="#circuito"
          className="inline-flex shrink-0 items-center gap-2.5 rounded-lg text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
          aria-label="Tramo - Inicio"
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-lg bg-[#141414] p-1.5 dark:bg-[#F5F5F7]"
          >
            <span className="rounded-[2px] bg-[#F6F6F6] dark:bg-[#111112]" />
            <span className="rounded-[2px] bg-[#276EF1]" />
            <span className="col-span-2 rounded-[2px] bg-[#F6F6F6]/85 dark:bg-[#111112]/85" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Tramo
          </span>
        </a>

        <div
          role="tablist"
          aria-label="Selector de rol operativo"
          className="hidden items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1 md:inline-flex"
        >
          {DESKTOP_ROLES.map((role) => {
            const isActive = activeRole === role.id;
            const showNearDockDot = role.id === 'receiver' && hasNearDockRoute;

            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveRole(role.id)}
                className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs ring-1 ring-[var(--border-hairline)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{role.label}</span>
                {showNearDockDot && (
                  <span
                    aria-label="Unidad próxima a dársena"
                    className="h-2 w-2 shrink-0 rounded-full bg-[#276EF1]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={resetSimulation}
            className="inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
          >
            <ArrowCounterClockwise size={15} weight="regular" aria-hidden="true" />
            <span className="hidden sm:inline">Reiniciar demo</span>
            <span className="sm:hidden">Reiniciar</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
          >
            {theme === 'dark' ? (
              <Sun size={17} weight="regular" aria-hidden="true" />
            ) : (
              <Moon size={17} weight="regular" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 md:hidden">
        <div
          role="tablist"
          aria-label="Selector rápido de rol"
          className="grid grid-cols-3 gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1"
        >
          {MOBILE_ROLES.map((role) => {
            const isActive = activeRole === role.id;
            const showNearDockDot = role.id === 'receiver' && hasNearDockRoute;

            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={role.ariaLabel}
                onClick={() => setActiveRole(role.id)}
                className={`inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] ${
                  isActive
                    ? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-xs ring-1 ring-[var(--border-hairline)]'
                    : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="truncate">{role.label}</span>
                {showNearDockDot && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#276EF1]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
