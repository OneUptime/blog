# How to Mix Replicated and Erasure-Coded Directories Safely in One HDFS Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, Erasure Coding, Distributed Storage, Durability

Description: Design an HDFS namespace that keeps mutable, sync-sensitive data replicated while moving suitable immutable datasets to erasure coding.

---

HDFS supports replicated and erasure-coded files in the same namespace. The safe boundary is a directory policy: new files inherit the effective policy of their nearest ancestor by default (clients can explicitly request replication at creation), while existing files keep the layout they received at creation.

This lets one cluster serve two distinct workload classes:

- replicated directories for write-ahead logs, streaming checkpoints, frequently appended files, and recovery-critical small data;
- erasure-coded directories for immutable, sufficiently large warm or cold datasets.

The design works well only when operators verify policies at the **file** level and do not mistake a rename for a conversion.

## Build Explicit Namespace Boundaries

The following layout makes the intended behavior visible:

```text
/data/
  ingest/          REPLICATION
  checkpoints/     REPLICATION
  archive/         RS-6-3-1024k
  archive-stage/   REPLICATION
```

Create and assign it as an HDFS administrator:

```bash
hdfs dfs -mkdir -p \
  /data/ingest \
  /data/checkpoints \
  /data/archive \
  /data/archive-stage

hdfs ec -setPolicy -path /data/ingest -replicate
hdfs ec -setPolicy -path /data/checkpoints -replicate
hdfs ec -setPolicy -path /data/archive-stage -replicate

hdfs ec -verifyClusterSetup -policy RS-6-3-1024k
hdfs ec -enablePolicy -policy RS-6-3-1024k
hdfs ec -setPolicy -path /data/archive -policy RS-6-3-1024k
```

`REPLICATION` is a special, always-enabled policy. Assigning it to a child prevents that child from inheriting EC from an ancestor. By contrast, `hdfs ec -unsetPolicy` removes an explicit setting and resumes inheritance; it does not necessarily mean replication.

Audit the effective boundaries:

```bash
for path in \
  /data/ingest \
  /data/checkpoints \
  /data/archive \
  /data/archive-stage
do
  hdfs ec -getPolicy -path "$path"
done
```

## Route Workloads by Semantics

Choose replication when applications rely on operations that Hadoop restricts on striped files. In Hadoop 3.5, normal `append()` and `truncate()` of EC files fail, `hflush()` and `hsync()` on a striped output stream do not provide persistence, and `concat()` rejects a mixture of replicated and EC files or files using different EC policies. Appending with a new block to a closed striped file is a narrower special case, not a replacement for replicated streaming semantics.

A useful routing table is:

| Workload | Default layout | Reason |
| --- | --- | --- |
| WAL or transaction log | Replication | Requires sync/flush persistence and fast recovery |
| Active ingest files | Replication | Often appended or truncated |
| Checkpoints and manifests | Replication | Small, recovery-critical, latency-sensitive |
| Immutable columnar partitions | EC after qualification | Large sequential I/O and no mutation |
| Historical backups | EC plus an independent copy | Storage efficiency, but EC is not backup |

Storage overhead is only one dimension. For a full `RS-6-3-1024k` stripe, the nominal ratio is `(6 + 3) / 6 = 1.5x`, compared with `3x` for replication factor three. EC also consumes more CPU and cross-rack bandwidth, particularly during degraded reads and reconstruction.

## Create Files in the Right Directory

Create a canary in each boundary and query the file itself:

```bash
printf 'replicated-canary\n' >/tmp/replicated-canary
printf 'ec-canary\n' >/tmp/ec-canary

hdfs dfs -put /tmp/replicated-canary /data/ingest/
hdfs dfs -put /tmp/ec-canary /data/archive/

hdfs ec -getPolicy -path /data/ingest/replicated-canary
hdfs ec -getPolicy -path /data/archive/ec-canary
```

Do not infer the first file's layout from its current parent after a move. This sequence leaves the file replicated:

```bash
hdfs dfs -mv /data/ingest/replicated-canary /data/archive/
hdfs ec -getPolicy -path /data/archive/replicated-canary
```

HDFS deliberately preserves the file's creation policy.

## Convert by Copying, Then Verify

To migrate data, copy it into the target policy rather than renaming it. Use closed files and keep the source unchanged throughout copying and validation. The candidate path below must not already exist; otherwise, DistCp can add an extra source-directory level. Keep the source until validation completes:

```bash
hadoop distcp \
  /data/ingest/2026-08-31 \
  /data/archive/2026-08-31.candidate

hdfs ec -getPolicy \
  -path /data/archive/2026-08-31.candidate/part-00000

hdfs dfs -count -q -h /data/ingest/2026-08-31
hdfs dfs -count -q -h /data/archive/2026-08-31.candidate
```

Validate application-level row counts or manifests. The following digests compare the concatenated bytes of the matching `part-*` files, so also compare a manifest of relative filenames and exact byte lengths in the same order; a combined digest alone does not verify file boundaries or files outside that pattern. Run this as a Bash script so a failed read aborts validation:

```bash
set -e -o pipefail

hdfs dfs -cat '/data/ingest/2026-08-31/part-*' | sha256sum
hdfs dfs -cat '/data/archive/2026-08-31.candidate/part-*' | sha256sum
```

Only after the digests and workload checks match should the application switch to the candidate. Retain the source for a defined rollback window. Remember that HDFS `concat()` cannot mix replicated and EC files or different EC policies; streaming their bytes with `-cat` is supported.

## Audit a Mixed Tree

A directory query is insufficient after months of moves and migrations. Produce a file-level inventory:

```bash
hdfs dfs -find /data -print |
while IFS= read -r path; do
  if hdfs dfs -test -f "$path"; then
    policy=$(hdfs ec -getPolicy -path "$path" | tail -n 1)
    printf '%s\t%s\n' "$policy" "$path"
  fi
done >hdfs-policy-inventory.tsv
```

Run this with an identity permitted to traverse the namespace. Review unexpected replicated files in the archive as well as unexpected EC files in mutable areas.

## Protect the Shared Failure Budget

EC reconstruction and normal replication recovery share DataNode, rack, and network resources. Before a bulk migration:

1. Verify every enabled policy against the current topology with `hdfs ec -verifyClusterSetup`.
2. Benchmark representative reads and writes at normal and peak concurrency.
3. Confirm native ISA-L availability with `hadoop checknative` if the deployment intends to use it.
4. Alert on missing or corrupt blocks and DataNode reconstruction activity.
5. Preserve enough free space for both the candidate copy and rollback source.

Do not use EC as the only copy of important data. It tolerates a bounded number of shard losses inside a block group; it does not protect against accidental deletion, namespace corruption, credential compromise, or a disaster affecting the cluster.

## Conclusion

A mixed HDFS namespace is safest when policy boundaries reflect workload semantics and are explicit enough to audit. Create immutable data directly under EC, keep append and sync workloads under `REPLICATION`, and convert existing files by validated copy rather than rename. Treat the per-file policy as the source of truth throughout migration and rollback.

## Official Documentation

- [Apache Hadoop 3.5.0: HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop: DistCp Guide](https://hadoop.apache.org/docs/current/hadoop-distcp/DistCp.html)
- [Apache Hadoop: FileSystem Shell](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html)
