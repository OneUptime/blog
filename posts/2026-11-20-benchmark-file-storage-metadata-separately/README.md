# Benchmark File-Storage Metadata Separately from Bulk I/O

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Storage, Performance, Python

Description: Separate directory enumeration, file attributes, and creation costs from bulk throughput with a small tested probe and a realistic benchmark plan.

A share copies a large video quickly, but opening a directory takes several seconds. Both observations can be correct. Moving a long stream of bytes and discovering thousands of small files exercise different parts of a storage system.

Metadata is information about files: names, sizes, ownership, timestamps, and directory relationships. A workload that spends most of its time finding files may transfer very few bytes. A throughput result in megabytes per second cannot explain that workload by itself.

## Define the slow operation before measuring it

“List the directory” can mean several things. A program might need only names, or it might inspect each file, resolve owners, sort entries, and display thumbnails. Measure the part your application actually needs.

GNU `ls` sorts names by default. Its long format adds file details, and numeric owner output changes how ownership is displayed. These options are useful, but a timed terminal listing combines filesystem work with formatting and output. It is not a clean measurement of server metadata capacity. [GNU ls documentation](https://man7.org/linux/man-pages/man1/ls.1.html).

Separate the questions in your test plan:

| Phase | What it measures | Useful result |
| --- | --- | --- |
| Name enumeration | Discover directory entries | Complete directory scan duration |
| Attribute lookup | Read file status for known paths | Attribute phase duration and file count |
| Create and close | Add new files to a directory | Completed creations per second |
| Rename and delete | Change namespace entries | Duration, errors, and concurrency |
| Bulk read/write | Transfer file contents | Bytes per second and I/O latency |

A file operation at the application layer is not necessarily one network request. Clients cache information, protocols combine work, and applications can request more information than expected. Label the layer you measured.

## Start with a bounded local probe

The following Python 3.11 example separates names from explicit attribute lookups. It creates empty files in its own temporary subdirectory, measures creation, then runs three enumeration and attribute passes. It prints one JSON record per phase, suitable for saving outside the tested share.

Use an approved, writable staging directory with enough metadata capacity. The count is limited to 10,000 to discourage accidentally launching a huge test. Start with 1,000. Do not run this on an unhealthy production share: even a small metadata test adds work, and cleanup can also wait on storage.

Save this as `metadata_probe.py`:

```python
import json
import os
import sys
import tempfile
from pathlib import Path
from time import perf_counter

root = Path(sys.argv[1])
count = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
if not root.is_dir() or not 1 <= count <= 10000:
    raise SystemExit('Use an existing staging directory and 1..10000 files')
with tempfile.TemporaryDirectory(prefix='metadata-probe-', dir=root) as name:
    directory = Path(name)
    start = perf_counter()
    for number in range(count):
        with (directory / f'file-{number:06d}').open('xb'):
            pass
    print(json.dumps({'phase': 'create_and_close', 'files': count,
                      'seconds': perf_counter() - start}))
    for repetition in range(1, 4):
        start = perf_counter()
        with os.scandir(directory) as entries:
            paths = [entry.path for entry in entries]
        elapsed = perf_counter() - start
        assert len(paths) == count
        print(json.dumps({'phase': 'enumerate_names', 'run': repetition,
                          'files': len(paths), 'seconds': elapsed}))
        start = perf_counter()
        sizes = [os.stat(path, follow_symlinks=False).st_size for path in paths]
        elapsed = perf_counter() - start
        assert sizes == [0] * count
        print(json.dumps({'phase': 'stat_paths', 'run': repetition,
                          'files': len(sizes), 'seconds': elapsed}))
```

On a machine with Python 3.11 installed, replace `/mnt/share/staging` with your actual test directory:

```bash
python3.11 metadata_probe.py /mnt/share/staging 1000
```

Expect seven records: one creation measurement, then three pairs of enumeration and attribute measurements. Every record should report the requested file count. An exception is a failed run to investigate, not a timing to average into successful results.

`TemporaryDirectory` creates a unique directory and cleans it when the context exits. Cleanup is outside the recorded phases, so this example does not measure deletion performance. It creates no payload data and does not synchronize files to stable storage; the creation time is not a durability benchmark. [Python temporary-directory behavior](https://docs.python.org/3.11/library/tempfile.html).

The timer measures elapsed time, including waits. That is what a caller experiences. CPU time would answer a different question and could hide time waiting for storage. [Python performance counter](https://docs.python.org/3.11/library/time.html#time.perf_counter).

## Know exactly what the probe avoids and retains

The enumeration phase collects paths without explicitly asking for their status. The attribute phase uses `os.stat()` on those paths instead of reusing cached `DirEntry.stat()` results. Python documents that directory-entry objects can cache information, which would otherwise blur the two phases. Operating-system and server caches still apply; this does not force a network request for every path. [Python directory entries and stat](https://docs.python.org/3.11/library/os.html#os.scandir).

The script ran successfully with Python 3.11.13 on a local macOS filesystem for one and 1,000 files. Checks confirmed seven records, correct counts, nonnegative durations, rejection of out-of-range counts, and cleanup. No NFS or SMB benchmark was run for this article. Local timings validate the example's operation, not the performance of a storage product.

In particular, the first enumeration follows file creation on the same client. Calling that a cold-cache measurement would be misleading. All three passes are observed runs with unspecified cache state, and later passes may benefit from earlier work.

## Build a comparison that survives scrutiny

Record the server release, client operating system, mount options, protocol, authentication, network path, directory shape, file count, and concurrent workload. Keep the test script and raw output with that record.

For each candidate, run the same workload more than once and alternate test order where practical. A before/after improvement is weak evidence if the second test always gets the warmed cache or a quiet maintenance window.

A useful progression is:

1. Run the small probe on one client to check basic behavior and permissions.
2. Repeat with representative directory sizes, staying within approved limits.
3. Compare one large directory with a realistic directory tree containing the same total file count.
4. Add the application's normal concurrency gradually, recording errors and latency as well as completed work.
5. Run the real application operation and compare its total duration with the isolated phases.

Do not extrapolate a single-client scan linearly to hundreds of clients. More workers may overlap network waits, but they can also create contention. A faster aggregate completion rate can coexist with worse latency for individual users.

For larger parallel studies, the IOR project includes `mdtest`, designed for metadata rates under different directory structures. It uses MPI, a system for coordinating parallel processes, and requires a separately planned environment. Pin its release and record its exact options when adopting it; the small Python probe is not a replacement for that benchmark. [IOR project documentation](https://ior.readthedocs.io/en/latest/).

## Treat cache policy as part of correctness

On NFS, attribute and directory caches affect the balance between freshness and extra requests. Changing cache options may change both the measurement and the application's view of concurrent updates. Review that tradeoff before treating a cache change as a performance fix. [Linux NFS cache behavior](https://man7.org/linux/man-pages/man5/nfs.5.html).

Avoid flushing host-wide caches on shared production clients to manufacture a cold result. Use disposable clients or a controlled staging protocol, and document which cache layers were actually controlled. A fresh client still does not imply an empty server cache.

Keep correctness checks alongside timing: expected file count, expected attributes, and whether a second client sees updates when the application requires them. A quick scan that misses new files is not an acceptable optimization for an inventory process.

## Turn measurements into a targeted change

If name enumeration is slow, investigate directory size, server load, and the work needed to return entries. If attribute lookup dominates, inspect how often the application asks for per-file information and whether it requests the same facts repeatedly. If the isolated phases are quick but the application remains slow, examine sorting, identity lookup, rendering, and additional application requests.

Change one factor at a time. For example, test an application change that avoids unnecessary per-file status requests before changing global storage settings. Re-run the same fixture and the real workflow, including the correctness checks.

Report scan duration, file count, concurrency, errors, and cache conditions next to any operations-per-second figure. Define success in user terms, such as completing a particular project-directory listing within its agreed budget under normal load. Keep the bulk-throughput result too; it answers a separate capacity question and should not obscure the metadata work users are waiting for.
