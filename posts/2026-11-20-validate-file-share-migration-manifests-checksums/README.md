# Validate a File-Share Migration with Manifests and Checksums

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Storage, Data Migration, Data Integrity

Description: Build stable source and destination manifests, compare contents, and reconcile exceptions before approving a large file-share migration.

A transfer tool reports success after moving several terabytes. That is useful evidence, but it does not answer whether every required path arrived, whether a rename was intentional, or whether the application can use the restored permissions.

Migration acceptance needs a defined source state, a destination inventory, content evidence, and a reviewed explanation for every difference. Keep those records independently of the transfer log so the team can reproduce its decision.

## Freeze the question before collecting evidence

Decide which files, directories, links, metadata, and exceptions belong in scope. Use a consistent source snapshot or an agreed writer freeze for the final comparison. If files keep changing while you inventory them, a mismatch can mean either transfer failure or a legitimate later edit.

Record the source-view identifier, destination, tool versions, filters, and approved rename mapping. Keep source and destination manifests outside the trees being scanned. Otherwise the manifest itself may become another changing file in the inventory.

A checksum is a compact digest of bytes. Comparing the same algorithm over the complete source and destination file is strong content evidence, but it does not verify ownership, access controls, link identity, or application consistency. Python's `hashlib` supports incremental SHA-256 calculation without loading a whole file into memory. [Python hashlib](https://docs.python.org/3.11/library/hashlib.html).

## Build a content manifest for a bounded pilot

This Python 3.11 example records relative paths, directories, symbolic-link targets, file sizes, and SHA-256 values. It does not follow symbolic-link directories. Save it as `manifest.py`:

```python
import hashlib
import json
import os
import stat
import sys
from pathlib import Path

root = Path(sys.argv[1])
if not root.is_dir() or root.is_symlink():
    raise SystemExit('Use a real directory from a stable source view')

def fail(error):
    raise error

for parent, directories, files in os.walk(root, followlinks=False, onerror=fail):
    directories.sort()
    for name in sorted(directories + files):
        path = Path(parent) / name
        info = path.lstat()
        record = {'path': path.relative_to(root).as_posix()}
        if stat.S_ISLNK(info.st_mode):
            record.update(kind='symlink', target=os.readlink(path))
        elif stat.S_ISDIR(info.st_mode):
            record.update(kind='directory')
        elif stat.S_ISREG(info.st_mode):
            digest = hashlib.sha256()
            with path.open('rb') as reader:
                before = os.fstat(reader.fileno())
                for block in iter(lambda: reader.read(8 * 1024 * 1024), b''):
                    digest.update(block)
                after = os.fstat(reader.fileno())
            fields = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
            if any(getattr(before, f) != getattr(after, f) for f in fields):
                raise RuntimeError(f'File changed during read: {path}')
            record.update(kind='file', size=after.st_size, sha256=digest.hexdigest())
        else:
            raise RuntimeError(f'Unsupported file type: {path}')
        print(json.dumps(record, ensure_ascii=True, sort_keys=True))
```

Prerequisites are a trusted, stable directory tree, permission to read every item, and enough time to read every regular file. The example rejects unsupported types rather than silently omitting them. File status before and after hashing catches some concurrent changes, but it cannot replace a snapshot or writer freeze. A path can change outside that check's interval. [Python traversal and file status APIs](https://docs.python.org/3.11/library/os.html).

Run it against the source and the isolated destination using Python 3.11. Replace all paths, keep the evidence directory outside both trees, and retain command exit status:

```bash
set -euo pipefail
umask 077
python3.11 manifest.py /stable-source > /local/evidence/source.jsonl
python3.11 manifest.py /isolated-destination > /local/evidence/destination.jsonl
```

Use fresh evidence filenames. Redirection creates or truncates the output file, and a failed scan can leave a partial manifest. Do not compare or approve a manifest unless its generating command exited successfully. JSON escaping preserves unusual filenames, including embedded newlines, without turning them into ambiguous report lines.

The manifest excludes the root directory's own metadata and does not describe ACLs, extended attributes, hard-link groups, or sparse allocation. Keep a separate acceptance track for those properties. A content manifest should not claim more coverage than it contains.

## Compare by exact relative path

Save this small comparison program as `compare.py`:

```python
import json
import sys

def load(path):
    records = {}
    with open(path, encoding='utf-8') as reader:
        for line in reader:
            item = json.loads(line)
            key = item['path']
            if key in records:
                raise ValueError(f'Duplicate manifest path: {key}')
            records[key] = item
    return records

source, destination = map(load, sys.argv[1:3])
issues = 0
for path in sorted(source.keys() | destination.keys()):
    issue = ('extra' if path not in source else
             'missing' if path not in destination else
             'different' if source[path] != destination[path] else None)
    if issue:
        print(json.dumps({'path': path, 'issue': issue}, ensure_ascii=True))
        issues += 1
raise SystemExit(1 if issues else 0)
```

Run it with the two completed manifests:

```bash
python3.11 compare.py /local/evidence/source.jsonl   /local/evidence/destination.jsonl > /local/evidence/differences.jsonl
```

Exit zero means these manifest fields match. Exit one with difference records means reconciliation is required; a parsing or duplicate-path error is also a failed comparison. Inspect diagnostics rather than interpreting every nonzero exit as a normal difference list.

The comparator loads both inventories into memory, so it is for bounded pilots or partitions, not an unlimited enterprise inventory. For millions of entries, use a database with a unique path key or an external-sort comparison, preserving the same duplicate rejection and difference categories. Partition large runs by stable directory boundaries and reconcile the complete partition list so an omitted partition cannot disappear from the totals.

The scripts were tested with Python 3.11.13 on local synthetic trees. Matching files, an empty directory, and a symlink passed. Changed contents, missing and extra paths, duplicate manifest entries, and an unsupported named pipe were detected. No multi-terabyte migration or remote filesystem was tested.

## Keep checksum semantics consistent

Do not compare two values merely because both are called checksums. Record the algorithm, encoding, file or object version, and whether the value covers the full content or a composite of parts.

For example, Amazon S3 documents full-object and composite checksum types. A multipart-upload ETag is not generally the MD5 digest of the complete object. Treating it as such can produce incorrect conclusions about a migration. Use a supported full-content verification method with understood semantics. [S3 checksum types and ETags](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity-upload.html).

If the transfer tool offers an independent check operation, review its fallback behavior too. Rclone can compare sizes and available hashes; `--download` reads content from both sides when direct hash comparison is unsuitable. Those checks still need a stable source and do not automatically certify filesystem metadata. [rclone check behavior](https://rclone.org/commands/rclone_check/).

Full hashing reads the data again. Budget source I/O, destination I/O, network transfer, and possible retrieval charges before scheduling it. Keep verification from starving production workloads. Sampling can support a staged assessment, but label its coverage accurately; a sampled pass is not a full content comparison.

## Reconcile differences without hiding them

Use an exception ledger that links each difference to its evidence and owner:

| Finding | Investigation | Acceptable closure evidence |
| --- | --- | --- |
| Missing path | Filter, unreadable source, failed transfer, or rename | Successful recopy or approved mapped destination |
| Extra path | Old destination content or unintended copy | Owner-approved disposition and renewed comparison |
| Different content | Source change, partial copy, or corruption | Stable-view hash agreement after correction |
| Different object type | Link conversion or directory/file conflict | Required behavior demonstrated or approved redesign |
| Metadata difference | Permissions, ownership, attributes, or allocation | Separate property-specific acceptance result |

An approved rename must be applied to the comparison mapping explicitly. Keep the original manifest unchanged and preserve the mapping's version. Do not lowercase paths or strip punctuation just to make the reports agree; that can hide collisions.

Likewise, do not automatically delete every extra destination file. It may belong to another workload or represent data written after the initial copy. Classify the difference, obtain the required owner decision, then rerun the affected comparison.

## Validate access before normal writers resume

After content reconciliation, verify permissions through actual user and service identities, including expected denial cases. Check required links and metadata, open representative files through the normal protocol, and run the application's acceptance operation.

Enable controlled test traffic before allowing normal writers. Once new production writes begin, the old source and destination are no longer interchangeable. Document that boundary and the recovery procedure for a failed cutover.

The final acceptance record should state scanned entry counts, bytes covered by hashing, successful manifest generation, comparison results, approved exceptions, metadata checks, and application checks. Keep unresolved items visible. A transfer is accepted because the required dataset and behavior were demonstrated, not because the progress bar reached 100 percent.
