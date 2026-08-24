import { Alerts } from '@aranda/aranda.ui';

type CalloutType = 'error' | 'success' | 'warning' | 'information' | 'notice' | 'confirm';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  text: string;
}

// Admonition de contenido: usa el componente Alerts real de @aranda/aranda.ui en vez de
// reconstruir estilos propios (ver rfc/0001-migracion-astro.md, seccion 3.3).
// Nota de hallazgo del POC: `icon`/`onClick` estan tipados como requeridos en IAlerts aunque
// Alerts.tsx los trae con default y los recalcula por `type` -- se pasan explicitos solo para
// satisfacer el tipo, no porque cambien el resultado visual.
// Otro hallazgo: AlertContainer trae un ancho fijo en px (490px/520px, sin max-width) hardcodeado
// en Alerts.styles.ts -- en una columna angosta desborda la pagina (scroll horizontal). Se
// sobreescribe con `style` (Alerts lo aplica como inline style, que gana por especificidad sobre
// el css-in-js) en vez de pelear con la clase generada por styled-components desde afuera.
export default function Callout({ type = 'information', title, text }: CalloutProps) {
  return (
    <Alerts
      type={type}
      text={text}
      noticeTitle={title}
      ariaLabel={`callout-${type}`}
      icon=""
      onClick={() => {}}
      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
    />
  );
}
