type EntryItem = DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null };

function asFile(entry: FileSystemFileEntry, path: string): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => {
        const rel = path ? `${path}${file.name}` : file.name;
        resolve(
          rel === file.name ? file : new File([file], rel, { type: file.type, lastModified: file.lastModified }),
        );
      },
      () => resolve(null),
    );
  });
}

function readDir(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const reader = dir.createReader();
    const all: FileSystemEntry[] = [];
    const pull = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) resolve(all);
          else {
            all.push(...batch);
            pull();
          }
        },
        () => resolve(all),
      );
    };
    pull();
  });
}

async function walk(entry: FileSystemEntry, out: File[], path = "") {
  if (entry.isFile) {
    const file = await asFile(entry as FileSystemFileEntry, path);
    if (file) out.push(file);
    return;
  }
  if (!entry.isDirectory) return;
  const children = await readDir(entry as FileSystemDirectoryEntry);
  for (const child of children) await walk(child, out, `${path}${entry.name}/`);
}

/** Files from a drop, including folders the browser exposes as entries. */
export async function filesFromDataTransfer(data: DataTransfer | null): Promise<File[]> {
  if (!data) return [];
  const entries: FileSystemEntry[] = [];
  for (const item of data.items) {
    const entry = (item as EntryItem).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  if (!entries.length) return [...data.files];
  const out: File[] = [];
  for (const entry of entries) await walk(entry, out);
  return out.length ? out : [...data.files];
}
