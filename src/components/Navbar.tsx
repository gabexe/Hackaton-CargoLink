import { ArrowCounterClockwise, Moon, Sun } from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { ThemeMode, UserRole } from '../types/logistics';

export interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const ROLES: Array<{ id: UserRole; label: string; shortLabel: string }> = [
  { id: 'shipper', label: 'Dador', shortLabel: 'Dador' },
  { id: 'carrier', label: 'Transportista', shortLabel: 'Chofer' },
  { id: 'receiver', label: 'Receptora', shortLabel: 'Planta' },
];

export function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const { activeRole, setActiveRole, resetSimulation, routes } = useSimulation();
  const hasNearDockRoute = routes.some((route) => route.tripStatus === 'near_dock');

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 sm:h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <a
          href="#circuito"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1]"
          aria-label="Tramo - Inicio"
        >
          <span
            aria-hidden="true"
            className="grid h-6 w-6 grid-cols-2 gap-0.5 rounded-md bg-[#141414] p-1 dark:bg-[#F5F5F7]"
          >
            <span className="rounded-[1px] bg-[#F6F6F6] dark:bg-[#111112]" />
            <span className="rounded-[1px] bg-[#276EF1]" />
            <span className="col-span-2 rounded-[1px] bg-[#F6F6F6]/85 dark:bg-[#111112]/85" />
          </span>
          <span className="hidden text-base font-bold tracking-tight text-[var(--text-primary)] sm:inline">
            Tramo
          </span>
        </a>

        <div
          role="tablist"
          aria-label="Perfil de usuario"
          className="inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
        >
          {ROLES.map((role) => {
            const isActive = activeRole === role.id;
            const showDot = role.id === 'receiver' && hasNearDockRoute;

            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveRole(role.id)}
                className={`inline-flex min-h-[30px] cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276EF1] sm:min-h-[32px] sm:px-4 ${
                  isActive
                    ? 'bg-[#141414] text-[#F6F6F6] dark:bg-[#F5F5F7] dark:text-[#111112]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="sm:hidden">{role.shortLabel}</span>
                <span className="hidden sm:inline">{role.label}</span>
                {showDot && (
                  <span
                    aria-label="Unidad próxima"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#276EF1]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={resetSimulation}
            title="Reiniciar simulación"
            aria-label="Reiniciar simulación"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] sm:w-auto sm:gap-1.5 sm:px-3"
          >
            <ArrowCounterClockwise size={14} weight="regular" aria-hidden="true" />
            <span className="hidden text-xs font-medium sm:inline">Reiniciar</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            {theme === 'dark' ? (
              <Sun size={15} weight="regular" aria-hidden="true" />
            ) : (
              <Moon size={15} weight="regular" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
