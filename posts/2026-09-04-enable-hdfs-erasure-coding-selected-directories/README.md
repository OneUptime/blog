# Enable HDFS Erasure Coding for Selected Directories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, Erasure Coding, Storage, Data Integrity

Description: Enable an HDFS erasure-coding policy on selected directories, prove which policy new files receive, and avoid accidentally converting existing data.

---

HDFS erasure coding is a directory policy, not a cluster-wide conversion switch. By default, a file takes the policy of its nearest policy-bearing ancestor when the file is created; a client can explicitly override that policy at creation time. Changing a directory therefore affects only future files; it does not recode existing files, and moving an existing file into the directory does not change that file's layout.

That behavior makes a small, explicitly selected directory the safest place to begin.

## Preflight the Policy and Topology

Run the administrative commands as an HDFS administrator:

```bash
hdfs ec -listPolicies
hdfs ec -listCodecs
hdfs ec -verifyClusterSetup -policy RS-6-3-1024k
```

Only an **enabled** policy can be assigned. Apache Hadoop 3.5 documents five built-in EC policies. `RS-6-3-1024k` is the default enabled EC policy unless the cluster configuration changes that default. It needs nine internal blocks per full stripe, so the cluster needs at least nine DataNodes. Hadoop recommends at least three racks for rack fault tolerance with this policy because `ceil((6 + 3) / 3) = 3`.

Do not treat a successful topology check as a capacity or performance test. EC adds client and DataNode CPU work and makes striped I/O heavily dependent on cross-rack network bandwidth.

If the chosen policy is registered but disabled, enable it deliberately:

```bash
hdfs ec -enablePolicy -policy RS-6-3-1024k
hdfs ec -listPolicies
```

Enabling a policy only makes it assignable. It does not change any directory or file.

## Assign One Directory

Create a narrow target rather than setting EC at a broad namespace root:

```bash
hdfs dfs -mkdir -p /warehouse/cold-events
hdfs ec -setPolicy \
  -path /warehouse/cold-events \
  -policy RS-6-3-1024k
hdfs ec -getPolicy -path /warehouse/cold-events
```

The final command should name `RS-6-3-1024k`. If the directory is below another EC directory, `-getPolicy` reports the effective policy even when it is inherited, so record whether the setting is explicit as part of the change ticket.

Now create a canary **after** assigning the policy:

```bash
printf 'hdfs-ec-canary\n' >/tmp/hdfs-ec-canary.txt
hdfs dfs -put /tmp/hdfs-ec-canary.txt /warehouse/cold-events/

hdfs ec -getPolicy \
  -path /warehouse/cold-events/hdfs-ec-canary.txt
hdfs dfs -cat /warehouse/cold-events/hdfs-ec-canary.txt
hdfs dfs -checksum /warehouse/cold-events/hdfs-ec-canary.txt
```

The file-level query is the important proof. A directory may now advertise EC while older children remain replicated.

For a larger sample, enumerate files and query each one rather than assuming the parent describes them all:

```bash
hdfs dfs -find /warehouse/cold-events -print |
while IFS= read -r path; do
  if hdfs dfs -test -f "$path"; then
    printf '%s: ' "$path"
    hdfs ec -getPolicy -path "$path" | tail -n 1
  fi
done
```

## Understand the Storage Math

`RS-6-3-1024k` has six data units (`k = 6`), three parity units (`m = 3`), and a 1 MiB cell. A full stripe contains:

```text
data per stripe     = 6 * 1 MiB = 6 MiB
stored per stripe   = (6 + 3) * 1 MiB = 9 MiB
full-stripe ratio   = 9 / 6 = 1.5x
recoverable losses  = any 3 missing or checksum-rejected internal blocks
                      whose positions are known in the block group
```

Small and final partial stripes have padding and block-tail effects, so namespace-wide physical usage will not be exactly 1.5 times logical bytes. Measure actual space rather than applying the full-stripe ratio blindly.

Also note that `hdfs dfs -setrep` is meaningless for an EC file: Hadoop reports the replication factor as one and does not convert the file.

## Keep Persistence-Sensitive Files Replicated

Apache Hadoop documents important limitations for striped files: ordinary `append`, `truncate`, mixed-policy `concat`, and meaningful `hflush()`/`hsync()` semantics are not generally available. `hflush()` and `hsync()` on `DFSStripedOutputStream` are no-ops.

Logs, write-ahead logs, and applications that require acknowledged `hsync()` durability should remain in a replicated directory. A client using the builder API can also explicitly request a replicated file with `DistributedFileSystem.HdfsDataOutputStreamBuilder.replicate()`.

## Roll Back Without Mislabeling Existing Files

To make new files inherit the parent policy again:

```bash
hdfs ec -unsetPolicy -path /warehouse/cold-events
```

If the parent is EC and this child must force replicated storage, use the special replication policy instead. The replica count comes from the client's creation settings (normally three by default); this policy does not enforce a count of three:

```bash
hdfs ec -setPolicy -path /warehouse/cold-events -replicate
hdfs ec -getPolicy -path /warehouse/cold-events
```

Neither command rewrites files already present. Converting existing data requires copying it into a destination whose effective policy is the desired one, validating the copy, and then performing a controlled namespace cutover. A rename alone preserves the source file's original policy.

## Production Checklist

- Confirm all required DataNodes and racks are healthy before enabling the policy.
- Test representative object sizes; EC is usually aimed at warm or cold data, not tiny mutable records.
- Query both the directory and newly created file.
- Read and checksum a canary before starting a bulk migration.
- Keep a replicated landing or recovery directory available.
- Monitor missing internal blocks and reconstruction load throughout the rollout.

## Conclusion

Enable EC at the smallest practical directory boundary, verify topology first, and prove the policy on files created after the change. Directory settings are prospective, so rollback and migration both require careful file-level verification. Keep mutable and sync-sensitive data replicated, and preserve an independent recovery copy while the EC rollout is being qualified.

## Official Documentation

- [Apache Hadoop 3.5.0: HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop 3.5.0 API: HdfsAdmin](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/hdfs/client/HdfsAdmin.html)
- [Apache Hadoop: HDFS Commands Reference](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
