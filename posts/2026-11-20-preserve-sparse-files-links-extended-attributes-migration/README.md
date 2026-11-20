# Preserve Sparse Files, Links, and Extended Attributes During Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Storage, Data Migration, Linux

Description: Test sparse allocation, hard-link identity, symbolic-link targets, and extended attributes before approving a file-storage migration.

A migration can copy every visible filename and produce matching content hashes while still changing how the application behaves. Two names that once referred to one file may become independent copies. A symbolic link may become ordinary data. A sparse disk image may consume far more destination capacity.

Treat these properties as acceptance requirements. First determine which ones the workload uses, then verify that the source, transfer tool, and destination can preserve them together.

## Know which property you are preserving

| Property | What it means | What a content hash misses |
| --- | --- | --- |
| Sparse allocation | Some logical zero-filled regions need no allocated data blocks | A fully allocated copy can have identical bytes |
| Hard link | Multiple names refer to the same underlying file | Separate copies can have identical contents initially |
| Symbolic link | A name stores a path that is resolved when used | Copying the target can remove the link relationship |
| Extended attribute | A named value is attached to a file or directory | The data stream can match while the attribute is missing |

On Linux, hard-linked names share the same file, including permissions and ownership. A symbolic link instead stores a target string and may even refer to a nonexistent path. These are distinct relationships, not two spellings for the same feature. [Linux hard links](https://man7.org/linux/man-pages/man2/link.2.html), [Linux symbolic links](https://man7.org/linux/man-pages/man2/symlink.2.html).

Extended attributes, often called xattrs, use named namespaces. Linux examples include application values under `user.*` and security-related values under other namespaces. Access rules differ by namespace. A successful copy of one user attribute does not establish that security labels or capabilities transferred correctly. [Linux extended attributes](https://man7.org/linux/man-pages/man7/xattr.7.html).

## Build a small fixture before moving real data

Use an approved staging filesystem and a new directory name. The following Python 3.11 program creates a regular file, a hard-linked name, a relative symbolic link, and a sparse candidate with a logical size of 64 MiB. On Linux it also attempts to set one user extended attribute. An unsupported filesystem or denied attribute write should be investigated, not silently treated as success.

Save it as `create_fixture.py`:

```python
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
root.mkdir(parents=False, exist_ok=False)
(root / 'original.txt').write_text('shared payload\n', encoding='utf-8')
os.link(root / 'original.txt', root / 'hardlink.txt')
os.symlink('original.txt', root / 'relative-link')
with (root / 'sparse.bin').open('xb') as writer:
    writer.seek(64 * 1024 * 1024 - 1)
    writer.write(b'X')
if hasattr(os, 'setxattr'):
    os.setxattr(root / 'original.txt', 'user.migration_probe', b'fixture-v1')
    print('Extended attribute created')
else:
    print('Extended attribute API unavailable; xattr test not performed')
print(f'Created fixture: {root}')
```

Run `python3.11 create_fixture.py /staging/migration-source`, replacing the path with a new directory under an existing writable staging parent. The program refuses to reuse an existing directory. Keep the generated files until verification is complete.

Seeking beyond the current end and then writing creates a gap that reads as zeros. Whether the storage allocates that gap efficiently is a separate observation. Do not infer physical allocation solely from the logical size. [Linux seek and hole semantics](https://man7.org/linux/man-pages/man2/lseek.2.html).

## Choose transfer options explicitly

For a Linux reference using rsync **3.4.1** with ACL and xattr support, archive mode alone is insufficient. Add `-H` for hard links, `-A` for access control lists, `-X` for extended attributes, and `-S` for sparse handling. Archive mode already includes symbolic-link preservation. [Tagged rsync 3.4.1 manual](https://raw.githubusercontent.com/RsyncProject/rsync/v3.4.1/rsync.1.md).

Both endpoints need compatible implementations and filesystem support. Use identities authorized to read and preserve the required metadata; owner, group, and privileged attributes may need additional rights. This is a source-verified staging example, not a claim that Linux rsync ran for this article.

After creating a fresh empty destination directory, preview the operation:

```bash
rsync -aHAXS --dry-run --itemize-changes   /staging/migration-source/ /staging/migration-destination/
```

Review the planned source and destination. Then perform the same operation without the preview flag:

```bash
rsync -aHAXS --itemize-changes   /staging/migration-source/ /staging/migration-destination/
```

The trailing slash selects the source directory's contents. There is no deletion option here. Hard-link discovery covers only files in the transfer set, so splitting related names across separate jobs can lose the intended relationship. Avoid adding `--inplace` as a shortcut; sparse and hard-link behavior require careful review. [rsync transfer and sparse options](https://raw.githubusercontent.com/RsyncProject/rsync/v3.4.1/rsync.1.md).

The commands target a fresh fixture destination. A successful fixture does not authorize copying unknown device nodes, privileged attributes, or application files into a live system. Define the real migration's scope and privileges separately.

## Inspect identity, target text, and allocation

Save this as `inspect_fixture.py` and run it against both the source and destination paths:

```python
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
a = os.stat(root / 'original.txt')
b = os.stat(root / 'hardlink.txt')
assert (a.st_dev, a.st_ino) == (b.st_dev, b.st_ino), 'Hard link split'
assert (root / 'relative-link').is_symlink(), 'Symlink was replaced'
assert os.readlink(root / 'relative-link') == 'original.txt', 'Target changed'
assert (root / 'relative-link').read_text() == 'shared payload\n'
size = os.stat(root / 'sparse.bin')
assert size.st_size == 64 * 1024 * 1024
with (root / 'sparse.bin').open('rb') as reader:
    assert reader.read(1) == b'\0'
    reader.seek(-1, os.SEEK_END)
    assert reader.read(1) == b'X'
print('Logical bytes:', size.st_size)
print('Allocated bytes reported by stat:', size.st_blocks * 512)
if hasattr(os, 'getxattr'):
    assert os.getxattr(root / 'original.txt', 'user.migration_probe') == b'fixture-v1'
    print('Extended attribute matches')
else:
    print('Extended attribute API unavailable; xattr test not performed')
print('Hard-link identity, symlink target, size and boundary bytes match')
```

The hard-link check compares device and inode together. An inode identifies a filesystem object, and its number alone is not globally unique. The symlink checks verify both the stored target text and the expected result of opening it.

The sparse check deliberately prints allocation rather than demanding identical block counts. Python exposes `st_blocks` in 512-byte units where supported. Filesystems may use different allocation granularities or compression, so equal content does not require identical physical accounting. Define an acceptable destination capacity budget and use filesystem-specific allocation inspection when necessary. [Python filesystem status and attribute APIs](https://docs.python.org/3.11/library/os.html).

The fixture and inspector ran with Python 3.11.13 on a local macOS filesystem. The 64 MiB file reported 16 KiB allocated, and the link checks passed. Two negative fixtures were rejected: one split the hard link into separate files, and another changed the symlink text while preserving readable content. Python's xattr API was unavailable in that environment, so the extended-attribute branch was not tested. No rsync 3.4.1 migration or Linux ACL preservation was executed.

The inspector checks boundary bytes in the sparse file, not every byte. For migration acceptance, add full content verification against the source or a trusted manifest. Extend the fixture with the application's actual ACLs, attribute names, symbolic-link shapes, and ownership requirements.

## Account for destination limitations

A filesystem exposed through another protocol may present fewer features than its underlying disk format. Verify the view used by the actual clients. An attribute that exists on the server is not necessarily available through every client mount.

Relative links depend on directory layout. Absolute links depend on names outside the copied tree. Inventory links that leave the migration scope and decide whether their targets move, remain reachable, or require an application-approved change. Preserve intentional dangling links only when that is a documented requirement.

Hard links also constrain migration boundaries. Copying one name today and another tomorrow can produce independent files. Group related paths into a consistent transfer set or use a migration method that explicitly tracks their shared identity.

For sparse-heavy datasets, reserve enough capacity for the worst credible expansion until a representative restore proves the destination behavior. Do not discover during cutover that virtual disk images were copied correctly but expanded beyond available space.

## Make exceptions visible before cutover

Keep an acceptance record with source and destination versions, tool options, metadata privileges, content results, link checks, attribute checks, and allocation observations. Record unsupported properties as explicit exceptions with an owner and an application impact assessment.

Use a consistent source view or a coordinated writer freeze for final comparison. Otherwise a changed source can make differences ambiguous. Validate the application through its normal identity, then enable controlled traffic before normal writers resume.

A migration is complete when the required behavior survives on the destination. Matching bytes is essential evidence, but it is only one part of that decision.
