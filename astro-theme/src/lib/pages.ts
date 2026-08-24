import { getCollection, type CollectionEntry } from 'astro:content';

// Se usa entry.slug (extensionless, "multilevel/level2") y no entry.id (que en el loader legacy
// de content collections conserva la extension, "multilevel/level2.md") -- getEntry() tambien
// resuelve por slug, no por id. Hallazgo del POC: facil de confundir, ver rfc/0001-migracion-astro.md.
export function urlForId(slug: string): string {
  return slug === 'index' ? '/docs/' : `/docs/${slug}/`;
}

export async function buildPageMap(): Promise<Record<string, { title: string; url: string }>> {
  const entries = await getCollection('docs');
  const map: Record<string, { title: string; url: string }> = {};
  for (const entry of entries) {
    map[entry.slug] = { title: entry.data.title, url: urlForId(entry.slug) };
  }
  return map;
}

export async function getDocsEntries(): Promise<CollectionEntry<'docs'>[]> {
  return getCollection('docs');
}
