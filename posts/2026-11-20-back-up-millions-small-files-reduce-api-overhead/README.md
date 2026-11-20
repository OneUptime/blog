# Back Up Millions of Small Files Without Per-File API Bottlenecks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup, File Storage, Restic

Description: Separate source metadata costs from destination API overhead, use packed backups, and verify a small-file backup with a pinned restic restore lab.

A backup containing millions of tiny files can move very few megabytes per second while keeping the storage system busy. The limiting resource may be directory lookups, permission checks, file opens, or remote requests rather than bandwidth.

For scale intuition, two million serialized operations taking 20 milliseconds each would consume roughly 11.1 hours before accounting for other work. That is arithmetic, not a benchmark. Real systems overlap requests, cache metadata, and impose their own limits. The lesson is to measure operations as well as bytes.

## Separate the two sides of the problem

A file-oriented backup has to discover what exists on its source. Sending its destination data in larger objects does not eliminate that work.

| Layer | Evidence to collect | Useful intervention |
| --- | --- | --- |
| Source directory traversal | Entry counts, scan time, metadata latency | Run nearer the source; avoid redundant enumeration |
| Source reads | Open/read latency, disk queue, client CPU | Bound reader concurrency and investigate hot directories |
| Backup processing | CPU, memory, compression and index costs | Measure defaults before changing compression or workers |
| Destination service | Request counts by operation, throttles, uploaded bytes | Aggregate data and avoid unnecessary per-file existence requests |
| Recovery | Time to locate and recreate files and metadata | Test restores at realistic file counts |

If the source is an SMB or NFS mount, a local-looking file operation may involve network traffic. Moving the backup worker nearer the file server can help, but it needs equivalent access, snapshot support, and isolation. Do not assume that transferring the worker solves a busy storage controller.

## Use a backup format that groups data

Uploading one independently managed object per source file makes remote request overhead part of every file's cost. A backup repository can instead group content into packs and maintain metadata that locates each file's data.

Restic is one example. Its [repository design](https://restic.readthedocs.io/en/v0.18.1/100_references.html) separates snapshots, tree metadata, indexes, and packs containing data blobs. That structure allows many source files to share destination pack objects. It does not mean the repository needs no index, listing, lock, or snapshot operations.

Packing also changes recovery dependencies. A pack is not an ordinary directory of individually browsable files. Retain compatible restore tooling and repository credentials, and test recovery when the original backup machine is unavailable.

Avoid replacing a backup design with one enormous archive merely to minimize uploads. Consider how a single-file restore locates data, how damaged archives are detected, whether changes force large rewrites, and how retention removes obsolete content. The right unit is a recoverable backup with useful indexing, not the fewest possible objects at any cost.

## Run a small packing and restore experiment

The following lab uses [restic 0.18.1](https://github.com/restic/restic/releases/tag/v0.18.1), Python 3.11, and Bash on macOS or Linux. Install the matching official binary using the project's [installation and verification guidance](https://restic.readthedocs.io/en/v0.18.1/020_installation.html), and confirm `restic version` reports that release.

The lab creates a private temporary directory, 1,000 deterministic 4 KiB files, an independent checksum manifest, and a disposable repository password. Everything backed up is synthetic. The password is generated into a file and is never printed. This local fixture is not a production backup or a cloud API benchmark.

Run this as one Bash script:

```bash
set -euo pipefail
umask 077
export BACKUP_LAB
BACKUP_LAB=$(mktemp -d "${TMPDIR:-/tmp}/small-file-backup.XXXXXX")
python3.11 - <<'PY'
import hashlib, json, os, random, secrets
from pathlib import Path
root = Path(os.environ['BACKUP_LAB'])
(root / 'password').write_text(secrets.token_urlsafe(32) + '\n')
rng = random.Random(20261120)
manifest = {}
for number in range(1000):
    name = f'{number // 100:02d}/{number:04d}.bin'
    path = root / 'source' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    content = rng.randbytes(4096)
    path.write_bytes(content)
    manifest[name] = hashlib.sha256(content).hexdigest()
(root / 'manifest.json').write_text(json.dumps(manifest))
PY
r() {
    restic --repo "$BACKUP_LAB/repo" --password-file "$BACKUP_LAB/password" "$@"
}
r init
r backup --no-scan --json "$BACKUP_LAB/source" > "$BACKUP_LAB/first.jsonl"
r backup --no-scan --json "$BACKUP_LAB/source" > "$BACKUP_LAB/second.jsonl"
r check --read-data
SNAPSHOT=$(python3.11 - <<'PY'
import json, os
from pathlib import Path
rows = [json.loads(line) for line in (Path(os.environ['BACKUP_LAB']) / 'first.jsonl').read_text().splitlines()]
print(next(row['snapshot_id'] for row in rows if row['message_type'] == 'summary'))
PY
)
r restore "$SNAPSHOT:$BACKUP_LAB/source" --target "$BACKUP_LAB/restored"
python3.11 - <<'PY'
import hashlib, json, os
from pathlib import Path
root = Path(os.environ['BACKUP_LAB'])
expected = json.loads((root / 'manifest.json').read_text())
actual = {p.relative_to(root / 'restored').as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in (root / 'restored').rglob('*') if p.is_file()}
assert actual == expected, 'Restored file set or content differs'
packs = sum(p.is_file() for p in (root / 'repo' / 'data').rglob('*'))
print(f'Verified {len(actual)} restored files; repository contains {packs} data-directory pack files')
print(f'Fixture and evidence retained at {root}')
PY
```

The first backup saves the fixture; the second measures unchanged-file handling. The explicit snapshot ID comes from the first backup's JSON summary, so the restore does not depend on whichever snapshot happens to be latest. Restic documents [JSON summaries and exit codes](https://restic.readthedocs.io/en/v0.18.1/075_scripting.html), including the incomplete-backup code when source data cannot be read. The script stops on command failure.

The `snapshot:subfolder` restore syntax selects the fixture subtree and places its contents in a fresh directory, as described in [restoring from a snapshot](https://restic.readthedocs.io/en/v0.18.1/050_restore.html). The final comparison checks both the restored file set and every file's content hash.

In our local macOS ARM64 run, repository checking reported no errors and all 1,000 files restored with matching hashes. After both backups, the repository's data directory contained three pack files. The second backup reported 1,000 unmodified files but still added metadata. Those observations demonstrate packing and recovery for this fixture; three pack files is not a count of cloud API calls and is not a promised result for another dataset.

## Reduce redundant scans without skipping correctness

The lab uses `--no-scan`. In restic 0.18.1 this disables the extra scan used for progress estimation. It does not remove the traversal needed to back up the source. The [tuning guide](https://restic.readthedocs.io/en/v0.18.1/047_tuning_backup_parameters.html) explains that distinction and warns that excessive backend connections can reduce performance.

On a network file system, compare a normal run and a `--no-scan` run against equivalent, stable data. Expect less progress information with the latter. Keep source consistency, inclusion rules, and verification unchanged so the comparison measures the intended difference.

Likewise, unchanged files can avoid some content work, but they still need discovery and change detection. Restic describes parent-snapshot reuse and change handling in its [backup documentation](https://restic.readthedocs.io/en/v0.18.1/040_backup.html). Do not add options that ignore change indicators just because a scan is slow; first establish why those indicators differ and whether ignoring them could miss a real change.

## Tune one constraint at a time

Start with the tool's defaults and a representative subtree. Measure files per second, source latency, process memory, CPU, destination request counts, and throttling. Increase concurrency in small steps only while throughput improves without unacceptable impact on the file service.

Reader concurrency and destination connections address different queues. More upload connections will not fix slow source directory enumeration. More readers can overwhelm a network share even when the destination is idle.

For an object-storage destination, collect the service's actual request metrics rather than treating file counts or pack counts as a billing proxy. Include retries, listing, metadata, and maintenance operations. Compare a first backup, an unchanged backup, and a controlled-change backup. Keep file count, directory layout, size distribution, and change rate in the test record.

## Make restore and consistency part of acceptance

An application writing related files during enumeration can produce an inconsistent logical state. Use the application's supported quiesce or snapshot procedure where needed. The synthetic lab had no concurrent writers; it proves nothing about a live database or document-management application's consistency.

Restic's [repository checking guidance](https://restic.readthedocs.io/en/v0.18.1/045_working_with_repos.html) distinguishes checking repository structure from reading stored data. The lab uses `check --read-data`; budget the corresponding storage reads in a real repository. Keep an isolated restore test as a separate acceptance gate.

Before scaling to millions of files, test metadata fidelity, a single-file recovery, a full subtree recovery, interruption recovery, and a deliberately unreadable source file. Record exclusions and partial-backup failures. A faster job that silently omits required files is not an optimization.

Retain the lab's printed directory if you want to inspect its evidence; its generated password is for that disposable repository only. For production, protect recovery credentials independently and keep a recovery path that survives loss of the backup worker. The successful outcome is a complete, verifiable backup within its window, with measured request overhead and a restore time the business can accept.
