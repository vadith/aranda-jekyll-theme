# RFC 0001: Migración de aranda-jekyll-theme a Astro

> **Artefacto generado por agente** · 2026-08-13 · Propósito: RFC de migración Jekyll → Astro.

**Estado**: borrador para discusión de equipo — ningún código de este RFC ha sido implementado todavía.

## 1. Contexto y objetivo

`aranda-jekyll-theme` es la plantilla base de toda la documentación de Aranda: en teoría, repos de
contenido como `aranda-docs` la consumen como theme compartido (via `remote_theme` o gema de Jekyll) y
solo aportan el contenido Markdown y su configuración de navegación.

El stack actual —Jekyll + Sass compilado por Jekyll + jQuery vendorizado, sin bundler, sin tooling de
frontend moderno, sin CI/CD en este repo— limita tanto el diseño visual como la velocidad de desarrollo.
Se propone migrar a **Astro**, preservando:

- **Markdown como fuente de contenido** — el front matter existente (`title`, `layout`, `sidebar`,
  `permalink`, `redirect_from`, `info`, `chapter`, `nav`, `excerpt`) se conserva conceptualmente.
- **La estructura de salida y navegación** — URLs, jerarquía de páginas y el modelo "un theme
  compartido + repos de contenido consumidores" no cambian para quien escribe documentación.

Y se aprovecha la migración para **mejorar los estilos** usando el design system corporativo real
(`@aranda/aranda.ui` + `@aranda/aranda.icons`) en vez de rediseñar desde cero.

## 2. Decisión de stack: Astro

Se evaluaron tres opciones (Astro, Docusaurus, Next.js). Se descarta Next.js por ser sobre-ingeniería
para un sitio que es, en esencia, contenido estático (no hay necesidad de SSR ni de una app interactiva
completa). Se descarta Docusaurus puro por imponer más límites de diseño de los que el equipo quiere para
el rediseño de estilos.

**Se elige Astro** porque:
- Genera HTML estático por defecto — encaja con el hosting actual (Azure Storage static website).
- Soporta **islands de React** solo donde hace falta interactividad (nav, TOC, buscador), sin cargar un
  framework completo en cada página.
- Tiene **Content Collections** con validación de front matter vía schema, y **Shiki** integrado para
  bloques de código con syntax highlighting.
- Permite consumir componentes de `@aranda/aranda.ui` (React) como islands donde aporten valor real.

## 3. Hallazgos de la exploración

Se investigó tanto el theme (`aranda-jekyll-theme`) como su consumidor real (`aranda-docs`) y el design
system corporativo (`aranda.ui` / `aranda.icons`) antes de plantear la arquitectura, porque la superficie
real resultó ser mayor de lo que el theme por sí solo sugiere.

### 3.1 El theme (estado de referencia/demo)

| Pieza actual | Qué hace | Propuesta en Astro |
|---|---|---|
| `_layouts/*.html` (9 archivos) | `default` (shell raíz) + variantes por front matter: `doc`, `post`, `apis`, `beta`, `beta-asec`, `instaladores`, `only-content` | Un layout base de Astro + variantes seleccionadas por front matter, mismo mecanismo conceptual |
| `_layouts/pattern.html` + `_includes/pattern_*.html` | Remanente del "Jekyll Style Guide" original (styleguide/pattern library), no usado por contenido real | **Se descarta**, no se migra |
| `_data/sidebar.yml` + `_includes/nav.html` | Árbol de navegación anidado a profundidad arbitraria (Liquid recursivo), con un modo legacy de "auto chapter" (orden alfabético por campo `chapter`) | Content Collections + componente recursivo de nav en TS/React |
| `_includes/footer.html` (`site.html_pages`) | Paginador prev/next — depende de una variable (`site.html_pages`) que **no está definida en ningún lado**, ni en el theme ni en `aranda-docs`: es código muerto | Calcular prev/next en build time desde el orden de la collection, sin depender de esa variable fantasma |
| `assets/js/modules/{SearchBar,ResultItem,Articles}.js` | Prototipo de búsqueda con datos hardcodeados (URLs placeholder apuntando a google.com) y **desconectado** del HTML (el markup y los listeners están comentados) | No hay nada funcional que portar. Usar **Pagefind** (indexación estática, sin backend — encaja con hosting estático) |
| `_sass/` (2,161 líneas de SCSS custom) | Tokens propios: colores de marca por producto, escala tipográfica con nombres de aves (`$typo_ostrich`, etc.) | **No portar el SCSS** — usar los tokens de `@aranda/aranda.ui` (ver §3.3) |
| `assets/js/modules/handleCopyClick.js` | Botón "copiar" en bloques de código vía `document.execCommand('copy')` (API obsoleta) | Reemplazar por Clipboard API moderna, integrado en el componente de bloque de código |
| Selector de idioma (ES/EN/PT) en `default.html`/`scripts.html` | Reescritura de URL por JS en cliente + banner "traducido por IA" con textos hardcodeados | Routing i18n nativo de Astro |
| `redirect_from` (front matter) | Se usa en contenido de ejemplo, pero el plugin que lo resuelve (`jekyll-redirect-from`) no está instalado explícitamente en el theme | Resolver en build time: generar mapa de redirects desde el front matter, sin depender de un plugin de Ruby |
| `generate-pdf.sh` + `_layouts/pdf.html` | Dependen de una carpeta `_pages/` que no existe en este repo; hacen scraping de front matter con `grep`/`sed` — frágil y específico de un consumidor | Construir el HTML "todo en una página" desde las content collections de Astro; seguir convirtiendo a PDF con una herramienta externa (ver §3.2) |
| Deuda técnica a **no replicar** | `scripts.html` incluye cada script duplicado dos veces; GA measurement ID hardcodeado en `GA_Script.html`; dominio `docs.arandasoft.com` hardcodeado en `home-item.html`; texto de producto hardcodeado en `beta-note-asec.html` | Todo pasa a ser configuración (props/variables de entorno) del nuevo theme |

### 3.2 El consumidor real (`aranda-docs`)

Hallazgo clave: `aranda-docs` **ya divergió sustancialmente** del theme — no lo consume de forma limpia.

- **No usa `remote_theme` ni `theme:`** en su `_config.yml` — trae copias locales completas de
  `_includes/` (24 archivos) y `_layouts/` (15 archivos) que ya difieren del theme, y **no tiene carpeta
  `_sass/`** (aunque `_config.yml` sigue declarando `sass_dir: _sass`) — el estilo viene de CSS ya
  compilado y comiteado (`style.css`, `bootstrap.min.css`, un `global.<hash>.css`).
- **No tiene `_data/sidebar.yml`** — la navegación real vive en `catalog.yml`, `catalog-apis.yml`,
  `catalog-notes.yml`, `manuales.yml`, `navbar.yml`: un modelo de **catálogo plano por producto**, no un
  árbol anidado. El contenido (`docs/*.md`) también es plano (sin subcarpetas), un archivo por
  producto/manual.
- Su `footer.html` reemplaza por completo el paginador prev/next del theme por un footer simple sin
  `html_pages` — confirma que esa función del theme nunca se usó en producción.
- Trae un **chat widget propio** (`_includes/chat-widget.html`, configurado con `api_base_url` /
  `loader_base_url` apuntando a un endpoint de IA interno) que el theme no documenta ni contempla.
- **Build/deploy real**: Azure Pipelines (no GitHub Actions) — `build.yml` valida PRs; `build-ci.yml`
  dispara una matriz de traducción por idioma (una tarea interna de traducción automática de Markdown),
  cada idioma pasa por `build-jekyll.yml` (Ruby/Bundler + `jekyll build`), se genera PDF con
  `wkhtmltopdf`, y se despliega con `az storage blob upload-batch` a un contenedor `$web` de Azure
  Storage static website.
- Es monolingüe en origen (español) — inglés y portugués se generan **fuera de este repo**, en el paso de
  traducción del pipeline, antes de cada build por idioma.

**Implicación para la migración**: el esquema de navegación del nuevo theme debe soportar tanto el árbol
anidado (modelo de referencia del theme, usado en `docs/`/`test/`) como el catálogo plano por producto
(modelo real de `aranda-docs`) — o `aranda-docs` necesita adaptar su data de navegación como parte de su
propia migración.

### 3.3 Design system corporativo (`@aranda/aranda.ui` / `@aranda/aranda.icons`)

Ambos son paquetes npm privados (feed de Azure DevOps), **activamente mantenidos** (commits del mismo día
de esta investigación), construidos con React 19 + styled-components + Vite, con Storybook.

- **`@aranda/aranda.ui`** expone (entre 100+ componentes) piezas directamente útiles para un sitio de
  documentación: `SideBar`, `Breadcrumb`, `Tabs`, `Tree`, `Alerts` (variantes `error/success/warning/
  information/notice/confirm` — cubren el rol de "admonitions"), `Table`. Los tokens de diseño son CSS
  variables (`ThemeProvider/tokens.ts`, con `darkTokens`/`lightTokens` ya resueltos — dark mode viene
  incluido), no Tailwind ni un theme object de JS.
- **No cubre** (construir nuevo, específico de documentación): bloque de código con syntax highlighting,
  buscador, tabla de contenidos.
- **`@aranda/aranda.icons`**: 822 iconos vía icon-font generado (`svgtofont`) + 49 ilustraciones SVG
  inline. Se consume como `<Icon icon="ic_x" />` / `<Illustration name="il_x" />`.
- **Riesgo a validar**: el `product` de `StylesProvider` es un enum cerrado de productos internos de
  Aranda (`ADM`, `AES`, `CMDB`, …, más `Default`/`None`). Un sitio de documentación usaría
  `product="Default"` — falta confirmar que ese modo tiene la misma cobertura de estilos que los
  productos reales (el propio repo documenta ~84 archivos con colores hardcodeados fuera del sistema de
  tokens, es decir, el sistema no está 100% consistente todavía).

### 3.4 Hallazgos verificados construyendo el POC (2026-08-13/14)

Se construyó un POC real de Astro dentro de este repo (`astro-theme/`, no incluido en el alcance
original de este RFC pero ejecutado a pedido, ver historial de la rama) integrando de verdad
`@aranda/aranda.ui`. Esto confirmó y corrigió varias suposiciones de la sección 3.3:

- **Ningún componente de navegación/layout de `aranda.ui` sirve tal cual para un sitio de
  documentación estático** — los cuatro que se evaluaron a fondo están diseñados para el shell de
  las apps ITSM de Aranda, no para páginas con URL propia y scroll normal:
  - `SideBar`: componente con estado pensado para el shell de una app (`sidebarId`s, callbacks
    `onSelect*`, modelo de solo 2 niveles: secciones → items → opciones).
  - `Breadcrumb`: acoplado a un componente `Tree` con estado (`dataTree`/`setSelectedId`), no a
    una ruta estática derivable de la URL.
  - `Tree`: es un árbol de **carga perezosa con backend** (`onClick(value, callback)` espera que
    le traigan los hijos del nodo de forma asíncrona) más CRUD (`onDelete`/`onEdit`/`isNewNode`) —
    pensado para un explorador tipo CMDB, no acepta `href` en ningún lado.
  - `Layout` (el shell completo, `organism/Layout`): fuerza `height: 100vh` + `overflow: hidden`
    y obliga a usar su propio `SideBar` + un `Header` con props de app de producto
    (`profile`, `actionGroup`, `helpPopover`). Usarlo implicaría perder scroll normal del
    navegador y SEO.

  El POC construyó un Nav y un Breadcrumb propios, server-rendered en Astro (sección 3.1/3.2), en
  vez de forzar estos componentes — es la decisión correcta, no un atajo.
- **`StylesProvider`, `Alerts` y `Button` sí sirven directo** — se integraron de verdad en el POC
  (tokens de marca + toggle claro/oscuro con `StylesProvider`, admonitions con `Alerts`, el propio
  toggle de tema usa el `Button` real en vez de un `<button>` a mano). Todos son presentacionales,
  sin el acoplamiento a un modelo de app que tienen `SideBar`/`Breadcrumb`/`Tree`/`Layout`.
- **`@aranda/aranda.icons` se puede usar sin React**: el paquete publica `lib/aranda-icon.css`
  (el `@font-face` embebido en base64 + las clases `.arandaIcon-*`) además del componente React
  `Icon` — `package.json` declara `"files": ["lib"]` sin `exports` que bloquee el subpath, así que
  se importa esa hoja de estilos una sola vez y se usan `<span class="arandaIcon-ic_x">` en HTML
  server-rendered de Astro (nav, botón de copiar código), sin hidratación. Se integraron `ic_link`
  (enlaces externos del nav) y `ic_copyline`/`ic_check` (botón de copiar). No hay un icono de
  sol/luna para el toggle de tema — se deja el emoji en ese caso puntual.
- **`Tabs` (`molecules/Tabs`) es un hallazgo positivo pendiente de integrar**: recibe `items:
  {label, id, component, icon?}[]`, maneja su propio estado, sin acoplarse a nada externo. Encaja
  bien para contenido de documentación con variantes (ej. instrucciones "Windows / Linux / macOS").
- **`Input` (`atoms/Input`) también sirve** (controlado, sin acoplamiento) pero **no se integró**:
  el buscador del POC usa el widget propio de Pagefind (`PagefindUI`), que inyecta su propio
  `<input>`/botón "Limpiar" en el DOM — reemplazarlo por `Input` implicaría dejar de usar
  `PagefindUI` y consumir la API de más bajo nivel de Pagefind a mano. Válido para una fase
  siguiente, no trivial.
- **Bug de peer dependency (corregido por el equipo de aranda.ui el 2026-08-14, mientras se
  escribía este RFC):** `@aranda/aranda.ui@3.0.3` publicado en el feed fijaba
  `@aranda/aranda.icons` como peer **exacto** `2.1.1` (sin `^`), desactualizado respecto al
  `2.2.2` ya publicado — cualquier instalación limpia fallaba con `ERESOLVE`. La versión `3.0.4`,
  publicada durante este mismo trabajo, ya corrige el peer a `^2.2.2`.
- **Bug de SSR (sigue abierto, no relacionado con el anterior):** el bundle publicado de
  `@aranda/aranda.ui` (`dist/index.es.js`) rompe con `"$.div is not a function"` al ser
  server-side-rendered en Node — pasa tanto en `astro build` como en `astro dev`, y se reprodujo
  igual en `3.0.3` y en `3.0.4` (el fix de peer dependency no lo tocó). Es un problema distinto,
  aparentemente de cómo se resuelve `styled-components` en el bundle publicado bajo SSR. **Mitigación
  usada en el POC**: montar todo componente de `@aranda/aranda.ui` con `client:only="react"` (nunca
  `client:load`), para que Astro no intente renderizarlo en el servidor. Pendiente de reportar al
  equipo de `aranda.ui` por separado.
- **Peers restantes sin corregir:** `react`, `react-dom` y `styled-components` siguen fijados como
  peers **exactos** (`19.2.4`, `19.2.4`, `6.3.11`, sin `^`) en `3.0.4` — cualquier patch más nuevo
  instalado (p.ej. `react@19.2.8`) rompe la resolución igual que pasaba con `aranda.icons`. El POC
  usa `legacy-peer-deps=true` en su `.npmrc` como workaround (mismo flag que ya usa el propio repo
  de `aranda.ui` para consumirse a sí mismo) — no es exclusivo de este proyecto.
- **`Alerts` no es responsive** (hallazgo visual, detectado al probar el POC en el navegador):
  `AlertContainer` fija `width: 490px`/`520px` en su propio CSS-in-JS, sin `max-width`. En una
  columna angosta desborda la página con scroll horizontal. Mitigación usada en el POC: `Alerts`
  acepta un prop `style` que se aplica inline (gana por especificidad sobre su CSS-in-JS), así que
  se sobreescribe con `style={{ width: '100%', maxWidth: '100%' }}` desde el componente consumidor
  en vez de pelear con la clase generada por styled-components. A reportar también al equipo de
  `aranda.ui` — un componente de librería de diseño no debería requerir este parche desde afuera.
- **Trampa de layout con `client:only`/`client:load` en un grid con columnas implícitas:** Astro
  genera un elemento `<astro-island>` por cada componente hidratado (`display: contents` por
  defecto, así que normalmente es inocuo). Pero si el layout de la página depende del **orden** de
  los hijos para asignar columnas de grid (`grid-template-columns` sin `grid-column` explícito por
  hijo), cualquier elemento adicional intercalado en el DOM —una isla, un script, lo que sea—
  puede correr la asignación implícita un puesto y descuadrar sidebar/contenido/TOC. Se corrigió
  asignando `grid-column` explícito a cada región del layout (`#sidebar`, `#documentationArea`,
  `.toc`) en vez de depender del orden de los hijos de `<body>`. Lección general para cualquier
  layout de Astro con islands: no confiar en el orden implícito del grid/flex cuando hay
  componentes hidratados de por medio.

## 4. Arquitectura propuesta

- **Content Collections de Astro** para el contenido Markdown, con un schema que valide el front matter
  heredado del theme (título, layout, permalink, redirect_from, info, nav, chapter/beta) y que sea
  **extensible** a un segundo modelo de navegación tipo catálogo plano (para cubrir el caso real de
  `aranda-docs`).
- **Capa de componentes**: wrappers finos de Astro/React sobre `@aranda/aranda.ui` donde ya exista el
  componente (Sidebar, Breadcrumb, Tabs, Alerts, Tree), y componentes nuevos —propios de este theme—
  donde no exista cobertura (bloque de código + copy button, TOC, integración de Pagefind).
- **Distribución a repos consumidores**: en vez de `remote_theme`/gema de Jekyll, distribuir el nuevo
  theme como **paquete npm privado** en el mismo feed de Azure DevOps que ya usan `aranda.ui`/
  `aranda.icons` — mismo modelo de consumo que el equipo ya conoce y mantiene.
- **i18n**: routing nativo de Astro (`/en/`, `/pt/`) alimentado por el mismo paso de traducción
  automática que hoy corre en Azure Pipelines — ese paso no cambia, solo cambia qué build consume su
  salida.
- **Build/deploy**: la salida estática de `astro build` (`dist/`) reemplaza directamente a `_site/`. El
  cambio en el pipeline de Azure es puntual: sustituir el step de Ruby/Bundler/`jekyll build` por
  Node/`npm run build`; el resto de la cadena (matriz de idiomas, generación de PDF con `wkhtmltopdf`,
  `az storage blob upload-batch` a `$web`) se mantiene igual.

## 5. Fases y siguientes pasos

Este RFC **no incluye implementación** — es la base para alinear al equipo antes de construir nada. Fases
propuestas (owners y fechas a definir por el equipo):

1. **POC de Astro** dentro de este repo, sobre el contenido demo (`docs/`/`test/`): nav recursivo, 1-2
   componentes de `@aranda/aranda.ui` integrados, bloque de código con copy button, Pagefind, TOC.
   **Hecho** (`astro-theme/`, ver sección 3.4 para los hallazgos que salieron al construirlo).
2. **Adaptar el esquema de nav** para cubrir el modelo de catálogo plano real de `aranda-docs`.
3. **Migrar el pipeline de Azure** (step de build) y validar el flujo de traducción/PDF/deploy contra el
   POC.
4. **Migración de contenido real de `aranda-docs`** y cutover.

## 6. Riesgos

| Riesgo | Impacto | Mitigación propuesta |
|---|---|---|
| El modelo de nav del theme (árbol anidado) no coincide con el modelo real de `aranda-docs` (catálogo plano) | El nuevo theme no sirve out-of-the-box al consumidor principal | Diseñar el schema de nav para soportar ambos modelos desde el inicio (Fase 2 explícita) |
| `StylesProvider` de `aranda.ui` no tiene el modo `Default` tan pulido como los productos reales | Estilos inconsistentes o con huecos en el sitio de documentación | Validar con el equipo de `aranda.ui` en la Fase 1 (POC), antes de comprometerse a usarlo como única fuente de estilos |
| Acceso al feed privado de npm (Azure DevOps Artifacts) desde el entorno de build de este repo/CI | Bloquea la instalación de `@aranda/aranda.ui`/`aranda.icons` en el POC o en CI | **Resuelto**: confirmado en el POC, el feed resuelve sin autenticación adicional desde este entorno |
| El bundle publicado de `@aranda/aranda.ui` rompe en SSR de Node (`"$.div is not a function"`) | Cualquier componente de `aranda.ui` montado con `client:load`/SSR normal tumba la página en build y en dev | Confirmado en el POC en `3.0.3` y `3.0.4` — montar siempre con `client:only="react"`; reportar al equipo de `aranda.ui` (§3.4) |
| `aranda.ui` fija `react`/`react-dom`/`styled-components` como peers exactos (sin `^`) | Cualquier patch más nuevo de React instalado rompe `npm install` con `ERESOLVE` | Confirmado en el POC (persiste en `3.0.4`, después de corregirse el peer de `aranda.icons`) — usar `legacy-peer-deps=true`, igual que el propio repo de `aranda.ui` |
| `redirect_from` y el paginador `html_pages` eran código muerto/no verificado en producción | Riesgo de "portar" funcionalidad que en realidad nunca funcionó, gastando esfuerzo en vano | Ya identificado en este RFC (§3.1) — no se replican, se rediseñan desde cero en build time |
| Pipeline de traducción automática y chat widget son sistemas externos no documentados en ningún repo de código | Dependencias ocultas que pueden romperse al cambiar el build | Tratarlos como cajas negras que consumen/producen los mismos artefactos (Markdown por idioma; script embebido), sin asumir su lógica interna |
| Generación de PDF depende de una herramienta externa (`wkhtmltopdf`) sobre el HTML ya construido | Cualquier cambio de estructura HTML puede romper el PDF sin que un test lo detecte | Incluir una verificación manual del PDF en la Fase 3, no asumir que el HTML nuevo es compatible sin probarlo |

## 7. Preguntas abiertas para el equipo

- ¿Quién es el owner del paso de traducción automática en Azure Pipelines? ¿Se toca en esta migración o
  se deja intacto como caja negra?
- ¿El chat widget propio de `aranda-docs` debe convertirse en un componente de primera clase del nuevo
  theme, o queda explícitamente fuera de alcance de esta migración?
- ¿Los otros repos de documentación (`docs-asms-admin`, `docs-bpd`) siguen el mismo patrón de divergencia
  que `aranda-docs`, o consumen el theme de forma más limpia? No se investigaron en este RFC.
