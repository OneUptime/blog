# How to Size MinIO Parity So a Full Node Failure Stays Within Write Quorum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Quorum, Fault Tolerance, Storage

Description: Calculate MinIO parity from the maximum drives one node contributes to each erasure set, including the special write-quorum rule at half parity.

---

Size MinIO parity against the number of drives a failed node removes from **one erasure set**, not against the cluster's total drive count. Each object belongs to one set, and every set must independently retain enough online members to accept writes.

Let:

```text
N = erasure-set width
M = parity shards per object
K = data shards = N - M
d = maximum drives in this set contributed by one node
```

After that node fails, the set has `N - d` online drives.

## Apply the Two Write-Quorum Rules

When parity is below half the set (`M < N/2`), MinIO write quorum is `K`:

```text
N - d >= K
N - d >= N - M
M >= d
```

At maximum parity (`M = N/2`), MinIO raises write quorum to `K + 1` to prevent split brain:

```text
N - d >= K + 1
d <= M - 1
M >= d + 1
```

The second rule is the common trap. Half the drives can still satisfy read quorum but cannot satisfy write quorum.

## Work Through Real Topologies

Assume MinIO selects a 16-drive set.

### Four nodes with four set members each

One node removes `d = 4` drives. With `EC:4`, `K = 12`, leaving 12 online:

```text
online after failure = 16 - 4 = 12
write quorum         = 12
result               = writable, with no remaining write tolerance
```

`EC:4` is the mathematical minimum for this placement. Higher parity leaves more tolerance for a second event, subject to capacity cost.

### Eight nodes with two set members each

Here `d = 2`. `EC:4` leaves 14 online against quorum 12, so one node can fail and two additional set drives can become unavailable before write quorum is lost.

### Two nodes with eight set members each

With `EC:8`, `K = 8`, one node leaves eight drives online. Reads can still have the required eight shards, but writes need `K + 1 = 9`:

```text
online after failure = 8
read quorum          = 8
write quorum         = 9
result               = readable but not writable
```

No allowed parity value makes this 16-wide, two-node placement survive a whole-node loss for writes. Change the failure-domain layout, not the algebra.

## Discover the Actual Set Layout

MinIO normally distributes set membership symmetrically across nodes, selecting drives across the pool and cycling when a set is wider than the node count. Do not assume symmetry after hardware changes or across different server pools. Record the generated layout and confirm live per-set state.

```bash
mc admin info --uncached production
mc admin prometheus metrics production cluster --api-version v3 |
  grep -E 'minio_cluster_erasure_set_(online_drives_count|read_quorum|write_quorum|read_tolerance|write_tolerance)'
```

Calculate `d` separately for every set as the largest number of members belonging to any one node. Design to the worst set, then add margin for a drive failure or maintenance overlap if the service objective requires it.

## Include Capacity in the Decision

For full stripes, logical storage efficiency is:

```text
efficiency = K / N = (N - M) / N
raw ratio  = N / K
```

For a 16-drive set:

| Parity | Data | Efficiency | Ordinary write quorum | Offline drives before write loss |
| ---: | ---: | ---: | ---: | ---: |
| `EC:4` | 12 | 75% | 12 | 4 |
| `EC:6` | 10 | 62.5% | 10 | 6 |
| `EC:8` | 8 | 50% | 9 | 7 |

The last column reflects the `K + 1` maximum-parity rule. Small objects, metadata, versioning, partial stripes, and reserved free space make observed capacity different from this full-stripe estimate.

Current MinIO AIStor guidance requires at least `EC:3` for production standard storage. That floor does not replace node-loss math: a node contributing four members to a set still requires at least `EC:4` merely to keep ordinary write quorum.

## Account for Degraded-Write Parity

Current AIStor releases default to upgrading parity for objects written while drives are offline but quorum remains. For example, two offline drives in an `EC:4` set can cause new objects to use `EC:6`. This preserves their remaining failure tolerance but consumes extra capacity, and current documentation says the upgraded parity remains with those objects. The current default upgrade budget is 1% of each set’s capacity per outage; as that budget is spent, a decreasing share of writes receives upgraded parity, while other writes use the configured parity.

Capacity-oriented settings can disable that behavior. Inspect `storage_class` configuration, the server’s `MINIO_ERASURE_PARITY_FAILURE` and `MINIO_ERASURE_PARITY_UPGRADE_BUDGET` settings, and the exact running release before relying on parity upgrade:

```bash
mc admin config get production storage_class
mc admin info production
```

Do not change parity during an outage as a substitute for replacing the failed member. A new standard-parity setting affects only newly written objects; existing objects retain the parity used at creation.

## Validate the Design

Before production deployment:

1. model each node, rack, controller, and power failure domain;
2. calculate the largest membership loss for every erasure set;
3. include one additional fault if that is part of the durability objective;
4. verify write quorum using a test deployment with the same topology;
5. benchmark foreground writes and healing under the simulated loss;
6. restore the node and prove full set tolerance returns.

Run failure injection only in an isolated qualification environment or an approved resilience exercise. A spreadsheet cannot reveal network partitions, load-balancer behavior, or reconstruction throughput.

## Conclusion

The minimum node-survival parity is `M >= d` below half parity and `M >= d + 1` at half parity. Derive `d` from the widest contribution a node makes to any real erasure set, then add the margin demanded by overlapping failures and maintenance. If no allowed parity satisfies the equation, redesign the topology rather than accepting a read-only outage.

## Official Documentation

- [MinIO AIStor: Erasure Coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/)
- [MinIO AIStor: Thresholds and Limits](https://docs.min.io/aistor/reference/aistor-server/thresholds/)
- [MinIO AIStor: Erasure Code Settings](https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/)
- [MinIO AIStor: Metrics v3 Reference](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/)
