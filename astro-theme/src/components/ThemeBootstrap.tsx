import { Button, StylesProvider, useThemeMode } from '@aranda/aranda.ui';

// Usa el Button real de @aranda/aranda.ui en vez de un <button> a mano -- a diferencia de
// SideBar/Breadcrumb/Tree/Layout (ver rfc/0001-migracion-astro.md, seccion 3.4), Button es
// presentacional y sin acoplamiento a un modelo de app, asi que si sirve tal cual. No hay icono de
// sol/luna en @aranda/aranda.icons (si hay ic_light_on pero no una pareja luz/oscuridad), se deja
// el emoji para ese caso puntual.
function ThemeToggleButton() {
  const { themeMode, toggleTheme } = useThemeMode();
  return (
    <Button
      ariaLabel="Cambiar tema claro/oscuro"
      text={themeMode === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
      type="outline"
      size="small"
      onClick={toggleTheme}
      style={{ position: 'fixed', top: '0.75rem', right: '0.75rem', zIndex: 10 }}
    />
  );
}

// Monta el StylesProvider de @aranda/aranda.ui para inyectar las CSS variables de marca
// (--sidebar-*, --table-*, --text-color, etc.) y el toggle claro/oscuro con persistencia en
// localStorage. El resto de la pagina (renderizada estaticamente por Astro) consume esas mismas
// variables via CSS plano, sin necesitar React. Ver rfc/0001-migracion-astro.md, seccion 3.3.
//
// Hallazgo del POC: hay que usar `client:only="react"` (no `client:load`) en el consumidor Astro.
// El bundle publicado de @aranda/aranda.ui rompe en SSR de Node durante `astro build`
// ("$.div is not a function" dentro de dist/index.es.js, aparentemente una resolucion de
// styled-components incompatible con SSR) -- se evita renderizando el componente solo en cliente.
// Re-confirmado en @aranda/aranda.ui@3.0.4 (2026-08-14): el equipo de aranda.ui ya publico esa
// version corrigiendo el peer dependency de aranda.icons (ver package.json / .npmrc), pero el bug
// de SSR sigue igual -- son dos problemas distintos del mismo paquete. `client:only="react"` sigue
// siendo obligatorio. A reportar por separado al equipo de aranda.ui.
export default function ThemeBootstrap() {
  return (
    <StylesProvider product="Default" defaultTheme="light">
      <ThemeToggleButton />
    </StylesProvider>
  );
}
