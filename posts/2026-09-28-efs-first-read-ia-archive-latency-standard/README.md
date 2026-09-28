# EFS Files Are Slow on First Read: Measuring IA and Archive Latency and Returning Hot Data to Standard

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Performance, Storage

Description: Investigate slow first reads on EFS, distinguish client caching from storage-class latency, and return reused data to Standard.

A file that was fast last month now pauses on its first read and becomes fast on subsequent reads. EFS lifecycle management may be part of the explanation, but that pattern also occurs when the Linux page cache warms. A useful investigation separates those effects before changing every file's storage policy.

AWS describes IA and Archive first-byte latency in tens of milliseconds. Standard is designed for lower latency. Those figures describe a storage operation, not the total time to open a file, deserialize its contents, and serve an application request. [EFS storage classes](https://docs.aws.amazon.com/efs/latest/ug/features.html).

## Inspect policy and storage distribution

```bash
aws efs describe-lifecycle-configuration \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0

aws efs describe-file-systems \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'FileSystems[0].SizeInBytes'
```

Record IA and Archive bytes, the transition ages, and whether `TransitionToPrimaryStorageClass` is present. Aggregate storage distribution supports a hypothesis; it does not label an individual file. POSIX `atime` is also insufficient because EFS lifecycle decisions use an internal last-access timer. [Lifecycle behavior](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html).

Check recent application changes at the same time. A new startup scan, expired local cache, or metadata-intensive file discovery can increase latency even when lifecycle settings did not change.

## Measure open time and first data separately

Run a small probe from a Linux test client against a known file. The example reads only one byte and prints two durations:

```python
import os
import time

path = "/mnt/efs/reference/example.dat"
t0 = time.perf_counter()
fd = os.open(path, os.O_RDONLY)
t1 = time.perf_counter()
try:
    data = os.read(fd, 1)
    t2 = time.perf_counter()
finally:
    os.close(fd)

print({
    "open_ms": (t1 - t0) * 1000,
    "first_read_ms": (t2 - t1) * 1000,
    "bytes_returned": len(data),
})
```

This is an application-visible timing sample, not a direct measurement of EFS's internal first-byte latency. Client caching, NFS read-ahead, scheduling, and network latency all contribute. Run it on several representative files and report a distribution instead of one number. An empty file returning zero bytes is not a useful data-read sample.

Repeat on the same client, then compare with a fresh test client that has not accessed those paths. A much faster second read on the same host can be explained by cache alone. Do not clear the global page cache on a production host merely to make the benchmark look cold. Linux documents cache dropping as a testing/debugging mechanism with substantial performance cost. [Linux VM documentation](https://docs.kernel.org/admin-guide/sysctl/vm.html#drop-caches).

Also compare a recently created Standard test file of similar size. A test that contrasts a tiny cached file with a large remote file cannot isolate storage-class latency.

## Return reused files to Standard

If files tend to become hot after their first reuse, add the transition-back policy while preserving the existing IA and Archive choices. Save the current configuration first. `put-lifecycle-configuration` supplies the lifecycle policy set, so do not accidentally replace other rules with only the new transition.

For a file system intentionally configured for IA after 30 days and Archive after 90 days, the complete example is:

```bash
aws efs put-lifecycle-configuration \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --lifecycle-policies '[
    {"TransitionToIA":"AFTER_30_DAYS"},
    {"TransitionToArchive":"AFTER_90_DAYS"},
    {"TransitionToPrimaryStorageClass":"AFTER_1_ACCESS"}
  ]'
```

Each object represents one transition. Data access can trigger the return; listing a directory or inspecting metadata does not. [LifecyclePolicy API](https://docs.aws.amazon.com/efs/latest/APIReference/API_LifecyclePolicy.html).

This setting applies to the entire file system, not a path prefix. It does not make the first cold access free or promise that every following request immediately receives Standard latency. Transitions run asynchronously with lower priority than workload operations.

## Validate latency and economics together

Check the stored policy after applying it. Then observe the application over a realistic reuse interval, preferably with a fresh client to avoid mistaking local cache for successful tier movement. Use Standard/IA/Archive storage trends as supporting evidence while remembering that other activity can change those totals.

A broad prewarming scan reads cold data and can trigger retrieval charges and move far more data than intended. Limit prewarming to a justified working set and review Archive's minimum storage duration and current [EFS pricing](https://aws.amazon.com/efs/pricing/) before a bulk change.

For permanently latency-sensitive data, consider a separate file system with a lifecycle policy that fits its access pattern. The right result is predictable first-request latency for the hot working set, with cold data still earning the storage savings that justified tiering it.
