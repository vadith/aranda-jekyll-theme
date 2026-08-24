import { SideBar } from '@aranda/aranda.ui';
import type { SidebarItem } from '@aranda/aranda.ui';

// No se importa urlForId de ../lib/pages aqui: ese modulo usa astro:content (getCollection),
// que es server-only y no se puede empaquetar en un componente client:only. Se hardcodean las
// URLs de este spike aislado en vez de reutilizar esa utilidad.
const urlForId = (slug: string) => (slug === 'index' ? '/docs/' : `/docs/${slug}/`);

// Hallazgo extra del spike: @aranda/aranda.ui NO exporta `MenuItem` ni `OptionT` en su API
// publica (src/index.ts solo exporta `SidebarItem` y `TSidebarContainer` del modulo SideBar) --
// para tener tipado real hay que derivarlos por indexacion en vez de importarlos directo.
type Section = SidebarItem['sections'][number];
type MenuItem = NonNullable<Section['menuItems']>[number];
type OptionT = NonNullable<MenuItem['options']>[number];

// Spike para responder concretamente "¿se puede usar el SideBar de aranda.ui para el nav de
// docs?" en vez de solo describirlo. Mapea un subconjunto real de src/data/nav.ts (Chapter1 >
// Chapter1.1 > Chapter1.1.1) a la forma que espera SideBar.
//
// Resultado verificado leyendo el codigo fuente de aranda.ui (no una suposicion):
// - MenuItem (nivel 0) -> Option.tsx (nivel 1, MenuItem.options: OptionT[]) -> OptionInOption.tsx
//   (nivel 2, OptionT.otherOptions: OptionT[]).
// - OptionInOption.tsx es una HOJA TERMINAL: no existe un componente que renderice un 4to nivel,
//   aunque el TIPO OptionT.otherOptions?: OptionT[] permita anidar mas en TypeScript. El limite es
//   de renderizado, no de tipos.
// - Nuestro nav real (src/data/nav.ts) tiene Chapter1 > Chapter1.1 > Chapter1.1.1 > Chapter1.1.1.1
//   > multilevel/level5 -- 4 capitulos de profundidad + la pagina hoja. SideBar solo puede mostrar
//   hasta Chapter1.1.1 (nivel 2); Chapter1.1.1.1 y multilevel/level5 no tienen donde ir sin
//   aplanarlos o sin fusionarlos con su padre, perdiendo la jerarquia real del contenido.
// - Ademas, SideBar navega por `onClick`/`onSelectOption`/`onSelectOtherOption` (callbacks), no
//   por <a href>: no hay href real en el DOM hasta que React hidrata, se pierde "abrir en pestana
//   nueva"/"copiar enlace" del boton derecho, y como es client:only="react" (ver
//   ThemeBootstrap.tsx) el nav completo estaria ausente del HTML inicial -- mal para SEO/no-JS en
//   el nav principal del sitio, que es justo lo que Nav.astro (server-rendered) evita.

const menuItems: MenuItem[] = [
  {
    id: 'bienvenido',
    icon: 'ic_books',
    title: 'Bienvenido',
    url: urlForId('index'),
  },
  {
    id: 'chapter1',
    icon: 'ic_books',
    title: 'Capítulo 1',
    // Nivel 1: renderizado por Option.tsx
    options: [
      { id: 'level2', title: 'Página nivel 2', active: true, url: urlForId('multilevel/level2') },
      {
        id: 'chapter1-1',
        title: 'Capítulo 1.1',
        active: true,
        // Nivel 2: renderizado por OptionInOption.tsx -- ULTIMO nivel que SideBar sabe dibujar.
        otherOptions: [
          {
            id: 'level3',
            title: 'Página nivel 3',
            active: true,
            url: urlForId('multilevel/level3'),
          } satisfies OptionT,
          // Chapter1.1.1 (nuestro 3er chapter anidado) ya NO CABE aqui: OptionInOption no
          // renderiza un `otherOptions` propio. La unica forma de "meterlo" seria aplanarlo como
          // una OptionInOption mas al mismo nivel que level3, perdiendo que es un sub-capitulo:
          {
            id: 'chapter1-1-1-APLANADO',
            title: '[APLANADO] Capítulo 1.1.1 (ya no se distingue como grupo)',
            active: true,
            url: urlForId('multilevel/level4'),
          } satisfies OptionT,
          // Chapter1.1.1.1 y multilevel/level5 (4to y 5to nivel reales) no tienen representacion
          // posible sin aplanarlos tambien al mismo nivel, perdiendo el arbol completo.
        ],
      } satisfies OptionT,
    ],
  },
];

const sidebars: SidebarItem[] = [
  {
    id: 'docs',
    title: 'Aranda Docs',
    sections: [{ id: 'main', menuItems }],
  },
];

export default function SideBarSpike() {
  return (
    <SideBar
      initialSidebarId="docs"
      sidebars={sidebars}
      onClick={(url) => {
        window.location.href = url;
      }}
      ariaLabel="sidebar-spike"
    />
  );
}
