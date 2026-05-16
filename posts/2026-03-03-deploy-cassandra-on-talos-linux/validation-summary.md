# Validation Summary: How to Deploy Cassandra on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Cassandra (4.1)
- Talos Linux (machine config: sysctls, disks)
- Kubernetes (StatefulSet, Service, ConfigMap, Namespace, CronJob, podAntiAffinity, volumeClaimTemplates)
- `talosctl` and `kubectl` CLIs
- JVM tuning (G1GC, heap settings)
- CQL (keyspace and table DDL, `uuid()`, `toTimestamp(now())`)
- K8ssandra Operator (`k8ssandra.io/v1alpha1` K8ssandraCluster, Stargate, Reaper, Medusa)
- Helm

## Sources Consulted
- Cassandra production recommendations: https://cassandra.apache.org/doc/latest/cassandra/getting_started/production.html (sysctl values: vm.max_map_count=1048575, net.core.somaxconn=65535, tcp_keepalive_* values match the post)
- Cassandra `conf/jvm-server.options` upstream comments — explicitly state that `-Xmn` should NOT be set when using G1GC
- Official `cassandra` Docker image documentation: https://hub.docker.com/_/cassandra (env vars CASSANDRA_SEEDS, CASSANDRA_CLUSTER_NAME, CASSANDRA_DC, CASSANDRA_RACK, CASSANDRA_ENDPOINT_SNITCH, MAX_HEAP_SIZE, HEAP_NEWSIZE)
- Cassandra port reference: 7000 (intra-node), 7001 (TLS intra-node), 7199 (JMX), 9042 (CQL native)
- Talos Linux machine config docs: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/ (`machine.sysctls`, `machine.disks` schema)
- K8ssandra Helm chart repo: https://helm.k8ssandra.io/stable
- K8ssandra Operator CRDs: https://docs.k8ssandra.io/ (K8ssandraCluster `k8ssandra.io/v1alpha1`, supports Cassandra 4.0.x/4.1.x; `serverVersion: "4.1.0"` is a valid supported version)
- Kubernetes StatefulSet / podAntiAffinity / CronJob `batch/v1` API references (all syntax in the post matches current stable APIs)
- CQL reference: https://cassandra.apache.org/doc/latest/cassandra/cql/ (`CREATE KEYSPACE ... NetworkTopologyStrategy`, `uuid()`, `toTimestamp(now())` are valid)

## Issues Found

1. **Misleading sysctl comment.** The comment said the listed sysctls were "file descriptor limits", but none of `vm.max_map_count`, `net.core.somaxconn`, or the `tcp_keepalive_*` settings are file-descriptor limits. Updated the comment to accurately describe what those sysctls control (mmap counts, socket queue depth, TCP keepalive tuning).
2. **`-Xmn400M` set together with `+UseG1GC` in `jvm.options`.** Cassandra's upstream `jvm-server.options` and JDK guidance both warn against setting `-Xmn` (fixed young generation) when using G1GC — G1 sizes the young region dynamically and a fixed `-Xmn` interferes with its pause-time heuristics. Removed `-Xmn400M` from the `jvm.options` ConfigMap entry and added a short note explaining why.
3. **`HEAP_NEWSIZE` env var on the StatefulSet container.** The official `cassandra` Docker image translates `HEAP_NEWSIZE` into `-Xmn` in `cassandra-env.sh`, reintroducing the same conflict with G1GC that was removed from `jvm.options`. Removed the `HEAP_NEWSIZE` entry from both the ConfigMap's `cassandra-env.sh` and the StatefulSet container env list so the configuration is consistent.

## Review Notes

- The `nodetool -h cassandra-N.cassandra snapshot ...` calls in the backup CronJob will only work if JMX has been configured to listen on the pod's network interface (the upstream `cassandra` image binds JMX to `127.0.0.1` by default via `LOCAL_JMX=yes`). In practice many users either run `nodetool` via `kubectl exec` against each pod or set `LOCAL_JMX=no` with JMX auth. Left the script as-is since it is presented as a starting point, but readers may need to either exec into each pod or enable remote JMX for it to work.
- The K8ssandra Operator section omits that the operator requires `cert-manager` to be pre-installed in the cluster (used for the webhook certificate). This is documented upstream and not strictly an error in the post, but readers following along will hit a webhook failure without it.
- Installing the K8ssandra Operator into the `cassandra` namespace works, but the upstream docs suggest a dedicated `k8ssandra-operator` namespace for clarity. Not changed.
- The `mgmtAPIHeap: 64Mi` value under `spec.cassandra` is on the low end; K8ssandra defaults are typically 64–128Mi and this works for small clusters.
- "Set heap size to no more than 8GB" is a reasonable rule of thumb that comes from older CMS-era guidance. With G1GC (the default in Cassandra 4.x) larger heaps can work, but 8GB remains a sensible cap for most workloads.
- `cassandra:4.1` is a valid Docker Hub tag and resolves to the current 4.1.x release line.
