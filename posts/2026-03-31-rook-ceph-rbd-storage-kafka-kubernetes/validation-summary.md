# Validation Summary: How to Set Up Ceph RBD Storage for Apache Kafka on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- Apache Kafka
- Strimzi Kafka operator
- Kubernetes StorageClass and PersistentVolumeClaims
- Kafka KRaft mode (ZooKeeper-less)
- Ceph OSD pool management

## Sources Consulted
- Strimzi documentation: Deploying and Managing (0.51.0) — https://strimzi.io/docs/operators/latest/deploying
- Strimzi documentation: Configuring (0.51.0) — https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi KRaft adoption guide — https://strimzi.io/kraft/
- Strimzi blog: Kafka Node Pools Supporting KRaft — https://strimzi.io/blog/2023/09/11/kafka-node-pools-supporting-kraft/
- Apache Kafka 4.1 Broker Configuration — https://kafka.apache.org/41/configuration/broker-configs/
- Rook-Ceph documentation: Block Storage (RBD) — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found

### 1. Incorrect Strimzi KRaft mode configuration
**What was wrong:** The KRaft section placed a `roles` field directly under `spec.kafka` in the Strimzi `Kafka` CRD. The `roles` field does not exist in the `Kafka` CRD; it belongs in the `KafkaNodePool` CRD. Additionally, KRaft mode in Strimzi requires `strimzi.io/node-pools: enabled` and `strimzi.io/kraft: enabled` annotations on the `Kafka` resource, and the `zookeeper` section must be omitted.

**What was changed:** Replaced the invalid snippet with a complete, correct KRaft configuration showing both the `KafkaNodePool` resource (with `roles`, `replicas`, and `storage`) and the `Kafka` resource (with the required annotations, listeners, and config).

**Why:** The original snippet would be rejected by the Strimzi operator. `KafkaNodePool` resources are required for KRaft mode in Strimzi 0.38+.

### 2. Misleading comment on `log.flush.scheduler.interval.ms`
**What was wrong:** The comment said "Allow dirty ratio before flush." This parameter is a scheduler polling interval (how often the log flusher checks if any log needs flushing), not related to any "dirty ratio" concept. The Linux kernel has `vm.dirty_ratio` but that is an OS-level setting unrelated to this Kafka parameter.

**What was changed:** Updated comment to "Disable periodic flush check (let OS handle flushing)."

**Why:** The original comment was technically inaccurate and could confuse readers about what the setting actually controls.

### 3. Misleading comment on `num.io.threads` and `num.network.threads`
**What was wrong:** The comment said "Use page cache efficiently." These parameters control the size of Kafka's request handler thread pool (`num.io.threads`, default 8) and network I/O thread pool (`num.network.threads`, default 3). They have no direct relationship to page cache efficiency.

**What was changed:** Updated comment to "Thread pool sizes for request handling and network I/O."

**Why:** The original comment attributed a function to these parameters that they do not have.

### 4. Incorrect field name in Summary section
**What was wrong:** The summary text referenced `` `storageClass` `` as the Strimzi configuration field name, but the actual field in Strimzi's persistent-claim storage configuration is `` `class` ``.

**What was changed:** Updated `` `storageClass` `` to `` `class` `` in the summary paragraph.

**Why:** Using the wrong field name could lead readers to use an invalid configuration key.

## Review Notes
- The Ceph pool creation commands, StorageClass definition, and ZooKeeper-based Strimzi deployment are all technically correct.
- The flush tuning values (Long.MAX_VALUE) are the Kafka defaults; setting them explicitly is not strictly necessary but serves as documentation of intent, which is a valid approach.
- `num.io.threads: 8` is the Kafka default; `num.network.threads: 4` is slightly above the default of 3, which is a reasonable production tuning choice.
- Kafka 3.6.1 is a valid version. Note that Kafka 4.0 removed ZooKeeper support entirely, so the ZooKeeper-based example is only valid for Kafka 3.x.
- The monitoring command using `kafka-log-dirs.sh` is correct for Strimzi pod naming conventions.
