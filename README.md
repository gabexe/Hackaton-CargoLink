# Hackaton - CargoLink

Prototipo web mobile-first y desktop para **CargoLink / Tramo**, plataforma B2B de logística colaborativa fraccionada (por pallet) y monetización de retornos vacíos sobre el corredor piloto Parque Industrial Polo 52 (Córdoba) - Ruta Nacional 9 (Rosario, Buenos Aires y Jesús María).

## Flujo multi-usuario simulado

La aplicación comparte un estado operativo en vivo entre los tres actores del circuito:

1. **Dador PyME (`Plásticos Polo 52 SA`)**: selecciona ubicaciones disponibles sobre el plano del semirremolque (`P-01` a `P-12`), define mercadería, peso y protección opcional (`+2,5%`), y emite un remito digital (`TRM-*`) calculando ahorro frente a camión dedicado y CO2 evitado.
2. **Transportista (`Transporte Serrano SRL` / flota federada)**: visualiza el manifiesto consolidado completo, accede a telemetría GPS privada de flota y verificación de convenio (`CCT 40/89`), despacha el viaje, avanza hitos por localidad hasta activar el aviso de proximidad (`< 10 km`), reporta novedades viales con evidencia fotográfica obligatoria y publica unidades de retorno vacío (`RN9-RET-*`).
3. **Planta Receptora (`Metalúrgica Litoral SA`)**: recibe alertas de proximidad a menos de 10 km sin exposición de coordenadas satelitales exactas, asigna dársena de descarga, coteja la fotografía de precinto en origen y confirma la recepción final.

## Stack técnico

- React 19 + TypeScript
- Vite 8 + Tailwind CSS v4
- Motion (`motion/react`) + `@phosphor-icons/react`
- Tipografías autoalojadas (`@fontsource/plus-jakarta-sans` y `@fontsource/jetbrains-mono`)

## Desarrollo local

```bash
npm install
npm run dev
```

Compilación de producción y verificación de tipos:

```bash
npm run build
```
