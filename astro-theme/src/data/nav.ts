// Puerto de _data/sidebar.yml (theme actual) + una version del modelo de catalogo plano que usa
// aranda-docs en produccion (ver rfc/0001-migracion-astro.md, seccion 3.2). Un mismo tipo de dato
// (NavNode[]) cubre ambos casos: un "catalogo plano" es simplemente un NavNode[] sin `chapter`.

export type NavNode =
  | { chapter: string; title: string; pages: NavNode[] } // grupo colapsable, recursivo a cualquier profundidad
  | { page: string } // referencia a un slug de la content collection "docs"
  | { url: string; title: string }; // link externo

// Arbol anidado de ejemplo (mismo shape que sidebar.yml -> docs), a 5 niveles de profundidad,
// para probar que la recursion arbitraria del theme actual se puede portar tal cual.
export const docsNav: NavNode[] = [
  { page: 'index' },
  {
    chapter: 'Chapter1',
    title: 'Capítulo 1',
    pages: [
      { page: 'multilevel/level2' },
      {
        chapter: 'Chapter1.1',
        title: 'Capítulo 1.1',
        pages: [
          { page: 'multilevel/level3' },
          {
            chapter: 'Chapter1.1.1',
            title: 'Capítulo 1.1.1',
            pages: [
              { page: 'multilevel/level4' },
              {
                chapter: 'Chapter1.1.1.1',
                title: 'Capítulo 1.1.1.1',
                pages: [{ page: 'multilevel/level5' }],
              },
              { page: 'instalacion/instalacion' },
            ],
          },
          { page: 'instalacion/configuracion' },
        ],
      },
      { url: 'https://github.com/aranda-docs/aranda-jekyll-theme', title: 'Github' },
      { page: 'instalacion/inicio' },
    ],
  },
  { page: 'multilevel/level1' },
  { url: 'https://www.arandasoft.com', title: 'Página principal de Aranda' },
  {
    chapter: 'Uso',
    title: 'Uso',
    pages: [{ page: 'uso/uso' }, { page: 'uso/inicio' }],
  },
];

// Modelo real de aranda-docs: catalogo plano por producto (sin chapters anidados), a partir de
// catalog.yml. Se reutilizan las mismas paginas demo solo para probar que el mismo componente de
// nav renderiza ambos modelos sin cambios.
export const catalogNav: NavNode[] = [
  { page: 'instalacion/instalacion' },
  { page: 'instalacion/configuracion' },
  { page: 'uso/uso' },
  { url: 'https://docs.arandasoft.com', title: 'Portal de documentación' },
];

export const navBySidebar: Record<string, NavNode[]> = {
  docs: docsNav,
  catalog: catalogNav,
};
