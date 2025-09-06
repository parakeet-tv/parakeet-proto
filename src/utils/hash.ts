/**
 * Simple FNV-1a 32-bit for stable fileId hashing from a path.
 * Use only if/when you enable multi-file; otherwise leave fileId=0.
 * @param path 
 * @returns 
 */
export function fileIdFromPath(path: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}
