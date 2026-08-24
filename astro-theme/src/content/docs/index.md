---
title: Bienvenido
info: Prueba del Tema de Aranda para Astro (POC de rfc/0001-migracion-astro.md)
permalink: /docs/
sidebar: docs
redirect_from:
  - /docs/instalacion/
  - /docs/uso
---

Ejemplo de un manual de los productos, migrado desde `docs/index.md` (Jekyll) para probar
Content Collections + front matter existente.

## Bloque de código (Shiki + copy button)

```ts
export function saludar(nombre: string): string {
  return `Hola, ${nombre}`;
}
```

El admonition de `@aranda/aranda.ui` (`Alerts` vía el componente `Callout`) se prueba en las
páginas con `docLayout: beta` / `beta-asec` (ver `uso/inicio.md`) — insertarlo directo dentro de
un `.mdx` como JSX hizo fallar el SSR de desarrollo de Astro con el bundle actual de
`@aranda/aranda.ui` (`$.div is not a function`, el mismo hallazgo de compatibilidad SSR que
`client:only="react"` evita en el resto del sitio). Queda anotado como riesgo a investigar en la
Fase 1 real, no resuelto en este POC.
