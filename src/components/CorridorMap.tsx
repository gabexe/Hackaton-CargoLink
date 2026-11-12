import { useEffect, useMemo, useRef } from 'react';
import {
  LockSimple,
  MapPin,
  NavigationArrow,
  Pause,
  Play,
  Warning,
} from '@phosphor-icons/react';
import { useSimulation } from '../context/SimulationContext';
import type { ThemeMode } from '../types/logistics';

interface ProjectedPoint {
  x: number;
  y: number;
  city: string;
  kmFromOrigin: number;
  status: 'passed' | 'current' | 'upcoming';
}

function getTargetProgress(
  tripStatus: string,
  checkpoints: Array<{ status: 'passed' | 'current' | 'upcoming' }>
): number {
  if (tripStatus === 'docked') return 0;
  if (tripStatus === 'arrived' || tripStatus === 'delivered') return 1;
  if (checkpoints.length <= 1) return 0;

  const currentIdx = checkpoints.findIndex((cp) => cp.status === 'current');
  const idx = currentIdx >= 0 ? currentIdx : 0;
  const baseRatio = idx / (checkpoints.length - 1);

  if (tripStatus === 'near_dock') {
    return Math.max(baseRatio, 0.9);
  }
  return baseRatio;
}

export function CorridorMap({ theme }: { theme: ThemeMode }) {
  const {
    activeRoute,
    activeRole,
    isAutoSimulating,
    toggleAutoSimulation,
  } = useSimulation();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animProgressRef = useRef<number>(
    getTargetProgress(activeRoute.tripStatus, activeRoute.checkpoints)
  );
  const routeIdRef = useRef<string>(activeRoute.id);

  const isDark = theme === 'dark';
  const isCarrier = activeRole === 'carrier';
  const isInMotion =
    activeRoute.tripStatus === 'in_transit' || activeRoute.tripStatus === 'near_dock';

  const targetProgress = useMemo(
    () => getTargetProgress(activeRoute.tripStatus, activeRoute.checkpoints),
    [activeRoute.tripStatus, activeRoute.checkpoints]
  );

  // Snap progress immediately when switching to another corridor
  useEffect(() => {
    if (routeIdRef.current !== activeRoute.id) {
      routeIdRef.current = activeRoute.id;
      animProgressRef.current = targetProgress;
    }
  }, [activeRoute.id, targetProgress]);

  const checkpoints = activeRoute.checkpoints;
  const currentIdx = checkpoints.findIndex((cp) => cp.status === 'current');
  const safeCurrentIdx = currentIdx >= 0 ? currentIdx : 0;
  const currentCp = checkpoints[safeCurrentIdx] ?? checkpoints[0];
  const nextCp =
    checkpoints[Math.min(checkpoints.length - 1, safeCurrentIdx + 1)] ??
    checkpoints[checkpoints.length - 1];
  const totalKm = checkpoints[checkpoints.length - 1]?.kmFromOrigin ?? 402;
  const remainingKm = Math.max(0, totalKm - (currentCp?.kmFromOrigin ?? 0));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    const projectCheckpoints = (): ProjectedPoint[] => {
      if (checkpoints.length === 0) return [];
      const lats = checkpoints.map((c) => c.lat);
      const lngs = checkpoints.map((c) => c.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Add visual padding in geo space so single-axis corridors still frame nicely
      const latSpan = Math.max(0.22, maxLat - minLat);
      const lngSpan = Math.max(0.32, maxLng - minLng);

      const padX = Math.max(46, width * 0.14);
      const padTop = 74;
      const padBottom = 46;
      const usableW = Math.max(60, width - padX * 2);
      const usableH = Math.max(60, height - padTop - padBottom);

      // Preserve regional aspect ratio centered in frame
      const avgLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
      const geoAspect = (lngSpan * Math.cos(avgLatRad)) / latSpan;
      const boxAspect = usableW / usableH;

      let drawW = usableW;
      let drawH = usableH;
      if (geoAspect > boxAspect) {
        drawH = usableW / geoAspect;
      } else {
        drawW = usableH * geoAspect;
      }

      const offsetX = (width - drawW) / 2;
      const offsetY = padTop + (usableH - drawH) / 2;

      return checkpoints.map((cp) => {
        const nx = lngSpan > 0 ? (cp.lng - minLng) / lngSpan : 0.5;
        const ny = latSpan > 0 ? (maxLat - cp.lat) / latSpan : 0.5;
        return {
          x: offsetX + nx * drawW,
          y: offsetY + ny * drawH,
          city: cp.city.split(',')[0],
          kmFromOrigin: cp.kmFromOrigin,
          status: cp.status,
        };
      });
    };

    const samplePointOnPath = (pts: ProjectedPoint[], t: number): { x: number; y: number; angle: number } => {
      if (pts.length === 0) return { x: width / 2, y: height / 2, angle: 0 };
      if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };

      const clamped = Math.max(0, Math.min(1, t));
      const scaled = clamped * (pts.length - 1);
      const segIdx = Math.min(pts.length - 2, Math.floor(scaled));
      const localT = scaled - segIdx;
      const a = pts[segIdx];
      const b = pts[segIdx + 1];
      return {
        x: a.x + (b.x - a.x) * localT,
        y: a.y + (b.y - a.y) * localT,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    };

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Smoothly interpolate animated truck progress towards checkpoint target
      const diff = targetProgress - animProgressRef.current;
      animProgressRef.current += diff * Math.min(1, dt * 4.5);
      const progress = animProgressRef.current;

      const palette = isDark
        ? {
            bg: '#131418',
            block: '#1A1C22',
            roadMinor: '#23262F',
            roadMajor: '#2C303C',
            text: '#F5F5F7',
            subtext: '#A1A1AA',
            surface: '#19191B',
            track: '#323542',
            accent: '#276EF1',
            warn: '#EAB308',
          }
        : {
            bg: '#F2F3F6',
            block: '#E9EAEE',
            roadMinor: '#E0E2E8',
            roadMajor: '#D4D6DF',
            text: '#141414',
            subtext: '#545454',
            surface: '#FEFEFE',
            track: '#C8CBD4',
            accent: '#276EF1',
            warn: '#D97706',
          };

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, width, height);

      // Subtle Uber-style map urban blocks and regional arterial grid
      ctx.strokeStyle = palette.roadMinor;
      ctx.lineWidth = 1;
      const step = 48;
      for (let gx = (width % step) / 2; gx < width; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx - 22, height);
        ctx.stroke();
      }
      for (let gy = (height % step) / 2; gy < height; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy + 18);
        ctx.stroke();
      }

      // Secondary intersecting highway lines for cartographic depth
      ctx.strokeStyle = palette.roadMajor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.38);
      ctx.lineTo(width, height * 0.56);
      ctx.moveTo(width * 0.25, 0);
      ctx.lineTo(width * 0.42, height);
      ctx.stroke();

      const pts = projectCheckpoints();
      if (pts.length >= 2) {
        const dest = pts[pts.length - 1];

        // 10 km destination geofence radar ring
        const pulse = (Math.sin(now * 0.0045) + 1) / 2;
        const geofenceRadius =
          activeRoute.tripStatus === 'near_dock' ? 28 + pulse * 10 : 24;
        ctx.beginPath();
        ctx.arc(dest.x, dest.y, geofenceRadius, 0, Math.PI * 2);
        ctx.fillStyle =
          activeRoute.tripStatus === 'near_dock'
            ? 'rgba(39, 110, 241, 0.16)'
            : 'rgba(39, 110, 241, 0.07)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle =
          activeRoute.tripStatus === 'near_dock'
            ? 'rgba(39, 110, 241, 0.65)'
            : 'rgba(39, 110, 241, 0.28)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Full upcoming route track
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = palette.track;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Active completed route track in Uber Blue
        const activePos = samplePointOnPath(pts, progress);
        const scaled = progress * (pts.length - 1);
        const completedSeg = Math.floor(scaled);

        if (progress > 0.005) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i <= completedSeg && i < pts.length; i += 1) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.lineTo(activePos.x, activePos.y);
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        // Checkpoint nodes and city labels
        pts.forEach((pt, idx) => {
          const isCurrent = pt.status === 'current';
          const isPassed = pt.status === 'passed';
          const isDest = idx === pts.length - 1;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isCurrent || isDest ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = isPassed || isCurrent ? palette.accent : palette.surface;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = isPassed || isCurrent ? palette.surface : palette.subtext;
          ctx.stroke();

          // City label pill
          const label = pt.city;
          ctx.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
          const textW = ctx.measureText(label).width;
          const placeAbove = idx % 2 === 0;
          const labelX = Math.max(
            textW / 2 + 10,
            Math.min(width - textW / 2 - 10, pt.x)
          );
          const labelY = placeAbove ? pt.y - 18 : pt.y + 24;

          ctx.fillStyle = palette.surface;
          ctx.strokeStyle = isDark ? '#2A2A2E' : '#E2E2E2';
          ctx.lineWidth = 1;
          const pillX = labelX - textW / 2 - 7;
          const pillY = labelY - 10;
          const pillW = textW + 14;
          const pillH = 20;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 999);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isCurrent ? palette.accent : palette.text;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, labelX, labelY);
        });

        // Road incident pin when active
        if (activeRoute.tripStatus === 'incident') {
          const incPos = samplePointOnPath(pts, Math.max(0.32, progress));
          ctx.beginPath();
          ctx.arc(incPos.x, incPos.y - 16, 11, 0, Math.PI * 2);
          ctx.fillStyle = palette.warn;
          ctx.fill();
          ctx.fillStyle = '#141414';
          ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', incPos.x, incPos.y - 15.5);
        }

        // Moving directional Waze/Uber puck (visible only to Carrier, or at dock/arrived)
        if (isCarrier || activeRoute.tripStatus === 'docked' || activeRoute.tripStatus === 'arrived' || activeRoute.tripStatus === 'delivered') {
          ctx.save();
          ctx.translate(activePos.x, activePos.y);

          if (isInMotion && isCarrier) {
            ctx.beginPath();
            ctx.arc(0, 0, 15 + pulse * 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(39, 110, 241, 0.22)';
            ctx.fill();
          }

          ctx.rotate(activePos.angle);
          // Navigation arrow puck
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fillStyle = palette.surface;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = palette.accent;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-4, -5);
          ctx.lineTo(-2, 0);
          ctx.lineTo(-4, 5);
          ctx.closePath();
          ctx.fillStyle = palette.accent;
          ctx.fill();
          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    activeRoute.id,
    activeRoute.tripStatus,
    checkpoints,
    isCarrier,
    isDark,
    isInMotion,
    targetProgress,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative h-[280px] sm:h-[340px] lg:h-[420px] w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
    >
      <canvas
        ref={canvasRef}
        aria-label="Mapa de seguimiento del corredor RN 9"
        className="block h-full w-full"
      />

      {/* Top Waze/Uber HUD Banner (Carrier) vs Privacy Checkpoint Banner (Shipper/Receiver) */}
      <div className="absolute left-2.5 right-2.5 top-12 sm:top-13 flex items-center justify-between gap-2">
        {isCarrier ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#141414]/92 px-3 py-2 text-[#F6F6F6] shadow-sm backdrop-blur-md dark:bg-[#19191B]/95 dark:border dark:border-[var(--border-hairline)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#276EF1] text-[#FEFEFE]">
              <NavigationArrow size={15} weight="bold" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {activeRoute.tripStatus === 'docked'
                  ? `En dársena · ${activeRoute.origin.split(',')[0]}`
                  : activeRoute.tripStatus === 'arrived' || activeRoute.tripStatus === 'delivered'
                    ? `Arribo · ${activeRoute.receiverPlantName}`
                    : `Hacia ${nextCp?.city.split(',')[0]}`}
              </p>
              <p className="truncate font-mono text-[11px] opacity-80">
                {remainingKm} km · {activeRoute.privateTelemetry.speedKmh} km/h
              </p>
            </div>
            {isInMotion && (
              <button
                type="button"
                onClick={toggleAutoSimulation}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#276EF1] px-2.5 text-[11px] font-semibold text-[#FEFEFE] transition-colors hover:bg-[#1E5BD6]"
              >
                {isAutoSimulating ? (
                  <>
                    <Pause size={11} weight="bold" aria-hidden="true" />
                    <span>Pausa</span>
                  </>
                ) : (
                  <>
                    <Play size={11} weight="bold" aria-hidden="true" />
                    <span>Auto</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/92 px-3 py-2 text-xs backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2">
              <LockSimple size={14} weight="regular" className="shrink-0 text-[#276EF1]" aria-hidden="true" />
              <p className="truncate font-medium text-[var(--text-primary)]">
                Hito: {currentCp?.city.split(',')[0]} (GPS protegido)
              </p>
            </div>
            {activeRoute.tripStatus === 'near_dock' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#276EF1] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#FEFEFE]">
                <MapPin size={11} weight="bold" aria-hidden="true" />
                <span>&lt;10 km</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom telemetry / road incident overlay */}
      <div className="pointer-events-none absolute bottom-5 sm:bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        {activeRoute.tripStatus === 'incident' && activeRoute.incident ? (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur-sm">
            <Warning size={13} weight="bold" className="text-[#D97706] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[var(--text-primary)]">
              {activeRoute.incident.kmLocation} (+{activeRoute.incident.delayMinutes} min)
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 px-2.5 py-1 font-mono text-[10px] text-[var(--text-secondary)] backdrop-blur-sm">
            {isCarrier ? (
              <span>
                GPS {activeRoute.privateTelemetry.lat}, {activeRoute.privateTelemetry.lng}
              </span>
            ) : (
              <span>
                {activeRoute.code} · {totalKm} km
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
