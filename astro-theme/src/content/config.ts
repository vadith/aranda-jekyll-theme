import { defineCollection, z } from 'astro:content';

// Campos heredados del front matter de aranda-jekyll-theme (ver rfc/0001-migracion-astro.md, seccion 3.1).
// `layout` se conserva como dato (no como el "layout" magico de Jekyll) y aqui solo se usa para
// decidir variantes visuales (p.ej. mostrar el aviso "beta"), no para elegir un layout distinto de Astro.
const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    info: z.string().optional(), // subtitulo bajo el titulo en el masthead (antes "info" en _layouts/doc.html)
    // Nota: se llama "docLayout" y no "layout" porque Astro 5 reserva ese nombre de campo para su
    // propio mecanismo legacy de layouts en content collections (ver hallazgo del POC).
    docLayout: z
      .enum(['doc', 'post', 'apis', 'beta', 'beta-asec', 'instaladores', 'only-content'])
      .default('doc'),
    sidebar: z.string().default('docs'), // que arbol de _data/sidebar.yml (ahora src/data/nav) usar
    permalink: z.string().optional(),
    redirect_from: z.array(z.string()).default([]),
    chapter: z.string().optional(),
    nav: z.boolean().default(true), // mostrar tabla de contenido lateral
    beta: z.boolean().default(false),
    excerpt: z.string().optional(),
  }),
});

export const collections = { docs };
