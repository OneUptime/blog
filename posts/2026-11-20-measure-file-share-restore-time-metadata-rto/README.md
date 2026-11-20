# Measure File-Share Restore Time Beyond Terabytes and Transfer Speed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Storage, Disaster Recovery, Backup Testing

Description: Measure file-share recovery by file count, metadata work, permissions, and validation, with a tested timing wrapper and a practical rehearsal plan.

A restore estimate divides stored terabytes by network throughput and promises recovery before lunch. The transfer finishes, but users still cannot work: millions of files need creating, permissions need checking, and the restored share has not passed application validation.

Recovery time objective (RTO) is the target time to restore the required service. It is a business requirement, not a transfer-speed result. Recovery point objective (RPO) concerns acceptable data loss measured in time. Choose both deliberately, then test a recovery strategy that can meet them. [AWS disaster recovery planning](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_objective_defined_recovery.html).

## Start the clock at the agreed recovery boundary

For the business RTO, start at service interruption and define what counts as service restored. Record detection and recovery-decision time too. Include the time required to obtain approval, access credentials, provision a destination, locate the correct backup, and validate the result. If the timer starts only after those tasks finish, label it as a restore-command measurement.

For a departmental share, service readiness might mean that authorized users can open, edit, and save representative documents through the normal share name. For an application, it might require a successful business transaction. A directory existing on disk is not the same outcome.

```mermaid
flowchart LR
    A[Service interrupted] --> B[Prepare destination and access]
    B --> C[Restore files and metadata]
    C --> D[Validate contents and permissions]
    D --> E[Enable controlled client access]
    E --> F[Confirm useful service]
```

Record separate phase durations and the total elapsed interval. Some work overlaps; do not add overlapping intervals and call the sum elapsed time. Identify which dependent activities actually determine when the service becomes usable.

## Count files as well as bytes

Metadata is information such as names, directory structure, ownership, permissions, and timestamps. Restoring many small files can involve substantial work even when the payload is modest. File count, directory depth, and permission complexity belong in the estimate alongside total bytes.

Consider an explicitly hypothetical workload: 200 GiB spread across two million files. At 250 MiB per second, the byte-transfer estimate is about 13.7 minutes. At an observed effective completion rate of 200 files per second, two million files take about 2.8 hours. These are illustrative arithmetic, not benchmark results or independent quantities to add together. Real restores can overlap metadata and payload work.

Inventory representative groups rather than relying on one average file size:

| Group | Detail to retain | Why it affects the rehearsal |
| --- | --- | --- |
| Large files | Size distribution and sparse-file behavior | Payload and allocation work |
| Small files | Count and files per directory | Namespace and per-file overhead |
| Deep trees | Depth and path-length extremes | Traversal and compatibility |
| Complex permissions | Owners, inherited rules, audit requirements | Privileges and security validation |
| Application datasets | Dependencies and consistency requirements | Order and acceptance tests |

Restore a realistic combination. A thousand tiny files can validate your procedure, but it cannot establish the completion rate for a million-file production share.

## Capture phase timing without hiding failures

This Python 3.11 wrapper runs a command, saves its output, and records elapsed time and exit status. It refuses to reuse an existing evidence directory. Save it as `time_phase.py`:

```python
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

parser = argparse.ArgumentParser()
parser.add_argument('phase')
parser.add_argument('evidence', type=Path)
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command
if command[:1] == ['--']:
    command = command[1:]
if not command:
    parser.error('Supply a command after --')
args.evidence.mkdir(parents=False, exist_ok=False)
started = datetime.now(timezone.utc).isoformat()
start = perf_counter()
try:
    with (args.evidence / 'output.log').open('w') as output:
        result = subprocess.run(command, stdout=output, stderr=subprocess.STDOUT)
    status = result.returncode
    error = None
except OSError as exception:
    status = 127
    error = str(exception)
record = {'phase': args.phase, 'started_utc': started,
          'elapsed_seconds': perf_counter() - start,
          'exit_code': status, 'launch_error': error}
(args.evidence / 'timing.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
sys.exit(status if status >= 0 else 128 - status)
```

The UTC timestamp lets operators correlate the run with other evidence. Duration comes from `perf_counter()`, which is designed for elapsed-time measurements. The child process runs without a shell; arguments remain separate, and its output is written to a file rather than buffered in memory. [Python performance counter](https://docs.python.org/3.11/library/time.html#time.perf_counter), [Python subprocess.run](https://docs.python.org/3.11/library/subprocess.html#subprocess.run).

Choose an existing, private local parent directory for evidence. Logs may contain sensitive paths or tool output; retain them with the drill's normal access controls. This is a measurement wrapper, not a timeout or cancellation system. A hung command can keep it waiting, and an interrupted wrapper may not write its final record. Mark such runs incomplete rather than treating missing timing as zero.

## Apply it to a fresh restore destination

Here is a restic 0.18.1 example. Prerequisites are an accessible compatible repository, a protected password file, a reviewed snapshot ID and directory inside that snapshot, Python 3.11, and sufficient destination space. Replace all example paths and identifiers. Use a new evidence directory under an existing local parent:

```bash
umask 077
python3.11 time_phase.py restore /private/drill-evidence/run-001 --   restic --repo /replace/repository   --password-file /replace/protected-password-file   restore 'REVIEWED_SNAPSHOT_ID:/directory/in/snapshot'   --target /replace/new-isolated-restore-directory
```

The target must be a new, isolated destination, not the live share. The wrapper protects its evidence directory, not the restore target. Restic normally overwrites existing files at a target, so verifying this prerequisite matters. Its explicit `snapshot:directory` syntax restores the selected directory's contents under the target. [restic 0.18.1 restoration behavior](https://restic.readthedocs.io/en/v0.18.1/050_restore.html).

Expect `timing.json` and `output.log` in the evidence directory. A zero exit code means the command completed successfully according to the tool; it does not approve the recovered application. A failed command still gets a timing record. A missing executable gets a launch error and status 127.

The wrapper was tested with Python 3.11.13 for success, a deliberate nonzero exit, a missing executable, and an existing evidence directory. It also timed a local restic 0.18.1 restore of 1,000 synthetic files, followed by a separate path-and-hash comparison against the fixture manifest. All files matched. That verifies the timing and restore mechanics; it is not a measured production RTO or a network storage benchmark.

## Measure validation as real recovery work

Start a separate phase for verification. Compare expected paths and content against a trusted baseline, inspect important metadata, and test authorization through the identities that will use the share. Include both permitted and denied operations.

Privileges can change restoration fidelity. Restic documents additional Windows privileges for restoring full security descriptors and symbolic links. Do not substitute a successful administrator test for proof that ordinary users receive the intended access. Confirm the tool's platform-specific behavior for your backup and destination. [restic Windows restoration requirements](https://restic.readthedocs.io/en/v0.18.1/050_restore.html).

Time application validation and controlled client access too. Include any required name change, session reconnection, or coordination with application owners. Keep normal writers disabled until those checks succeed; otherwise new writes can complicate rollback or conceal defects in the restored dataset.

## Improve the bottleneck you actually observe

If provisioning dominates, pre-stage approved infrastructure and test whether it stays usable. If backup discovery dominates, improve the catalog and recovery-point selection procedure. If file creation dominates, compare supported restore concurrency and directory layouts on a representative destination. If validation dominates, prepare trusted manifests and automate meaningful checks.

Increase concurrency in measured steps. Track errors, destination saturation, and completion time. More workers can add contention, and a faster payload phase is not useful if the permission or validation phase becomes slower.

For very large estates, define a minimum useful recovery set with application owners. Recovering a critical department first can reduce its outage, but dependencies must accompany it. Report the time to that limited service separately from the time to restore the full share.

## Keep the result tied to a workload

Publish the tested file count, payload size, directory shape, permission requirements, software versions, destination, concurrency, and cache conditions alongside the timing. Preserve failed rehearsals and the reasons they failed. Repeat after changes that affect the recovery path.

An RTO estimate becomes credible when it is connected to an observed recovery sequence and an explicit acceptance result. Bytes per second still matter, but the final measure is how long it takes to return the required files, metadata, and application behavior to usable service.
