# How to Fix “Too Many Open Files” in a Qdrant Docker or Kubernetes Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Docker, Kubernetes, Linux, File Descriptor, Troubleshooting, Observability

Description: Diagnose Qdrant file-descriptor exhaustion, raise the actual process limit safely in Docker or Kubernetes, and verify lasting headroom.

---

Qdrant stores a collection in segments, and each segment needs files to remain open. When the Qdrant process reaches its Linux `RLIMIT_NOFILE` soft limit, logs can contain:

```text
Too many open files (OS error 24)
```

The durable fix is to raise the limit inherited by the Qdrant process and then confirm why descriptor use grew. Increasing a Kubernetes CPU or memory limit, adding a Linux sysctl to a Pod, or running `ulimit` in an init container does not change the per-process file limit of the Qdrant container.

This guide applies to Linux containers. Preserve current storage, configuration, image version, networking, and cluster identity whenever a container or Pod is replaced.

## Confirm the Failure and Its Scope

First capture logs without restarting the workload:

```bash
docker logs --since 30m qdrant 2>&1 | grep -i 'too many open files'
```

For Kubernetes, the examples assume that the Qdrant container is named `qdrant`; substitute its actual name if it differs:

```bash
kubectl logs -n vector-db qdrant-0 -c qdrant --since=30m | grep -i 'too many open files'
kubectl describe pod -n vector-db qdrant-0
```

Inspect the limit and current descriptor count inside the same container that runs Qdrant:

```bash
docker exec qdrant sh -c '
  qdrant_pid=
  for proc in /proc/[0-9]*; do
    [ "$(cat "$proc/comm" 2>/dev/null)" = qdrant ] || continue
    qdrant_pid=${proc##*/}
    break
  done
  [ -n "$qdrant_pid" ] || {
    echo "Qdrant process not found" >&2
    exit 1
  }
  grep "Max open files" "/proc/$qdrant_pid/limits"
  printf "Open descriptors: "
  ls -1 "/proc/$qdrant_pid/fd" 2>/dev/null | wc -l
'
```

```bash
kubectl exec -n vector-db qdrant-0 -c qdrant -- sh -c '
  qdrant_pid=
  for proc in /proc/[0-9]*; do
    [ "$(cat "$proc/comm" 2>/dev/null)" = qdrant ] || continue
    qdrant_pid=${proc##*/}
    break
  done
  [ -n "$qdrant_pid" ] || {
    echo "Qdrant process not found" >&2
    exit 1
  }
  grep "Max open files" "/proc/$qdrant_pid/limits"
  printf "Open descriptors: "
  ls -1 "/proc/$qdrant_pid/fd" 2>/dev/null | wc -l
'
```

The official Qdrant image runs an entrypoint script as PID 1 and starts the Qdrant server as a child, which is why these commands locate the server process first. Locating the PID also handles a custom supervisor or a Kubernetes Pod with a shared process namespace. If a custom image changes the binary's process name, identify the exact Qdrant PID and inspect that process's `/proc/<pid>/limits` and `/proc/<pid>/fd`.

On Qdrant 1.16 or later, the metrics endpoint exposes the same capacity trend directly. Run this where `127.0.0.1:6333` reaches that Qdrant node, such as the Docker host with the port published or after a Kubernetes port-forward:

```bash
curl -fsS http://127.0.0.1:6333/metrics \
  | grep -E '^process_(open|max)_fds '
```

If Qdrant authentication is enabled, include an `api-key` or Bearer authorization header. The metric names above assume the default empty `service.metrics_prefix`; match the configured prefix if one is set. Compare `process_open_fds` with `process_max_fds`. Alert on shrinking headroom rather than waiting for equality. Also confirm the problem is per-process exhaustion and not a broader node-wide failure before changing limits.

## Record the Deployment Before Replacing Anything

Before remediation, record:

- the exact Qdrant image digest or version tag;
- every volume and its mount path;
- environment variables, mounted configuration, ports, networks, API keys, and cluster peer settings;
- collection and cluster health;
- a current snapshot stored outside the workload's ephemeral filesystem, or another tested recovery path;
- replication factor and the effect of restarting one node.

Never “fix” this error by deleting segment files or the storage volume. Qdrant manages segment lifecycle and the optimizer merges segments safely in the background.

## Fix a Docker Container

Qdrant's troubleshooting guide uses this Docker option:

```bash
docker run --ulimit nofile=10000:10000 qdrant/qdrant:latest
```

It sets both the soft and hard `nofile` limits to 10,000. For a real deployment, keep the existing pinned image and every existing runtime option. The following is intentionally schematic; substitute the recorded configuration rather than copying it literally:

```bash
docker stop qdrant
docker rename qdrant qdrant-before-nofile-change

docker run --name qdrant -d \
  --ulimit nofile=10000:10000 \
  -p 6333:6333 -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:<same-pinned-version>
```

Do not create a new empty volume accidentally. If the original container had a custom network, configuration mount, API-key environment variables, TLS files, snapshots mount, or distributed-cluster arguments, reproduce them exactly.

For Docker Compose, add a service-level `ulimits` entry while retaining the rest of the service definition:

```yaml
services:
  qdrant:
    image: qdrant/qdrant:<same-pinned-version>
    ulimits:
      nofile:
        soft: 10000
        hard: 10000
```

Recreate only the Qdrant service, then rerun the earlier PID-aware limit check in the new container. Editing Compose without recreating the container does not change the already-running process.

The value 10,000 is Qdrant's documented example, not a universal capacity formula. Choose a controlled limit that exceeds observed demand with operational headroom and remains acceptable for the host. An unnecessarily unbounded limit can hide abnormal growth and consume node resources.

## Fix a Kubernetes Pod

Kubernetes 1.37 and earlier do not offer a per-container `ulimit` field in the Pod API. Kubernetes enhancement KEP-5758 proposes `spec.containers[*].securityContext.ulimits`, but it did not ship in Kubernetes 1.37 and remains unreleased. The proposal uses the `ContainerUlimits` feature gate on the API server and kubelet and requires CRI and container-runtime support; do not use the proposed field unless a later Kubernetes release and its runtime explicitly document support.

For clusters without the supported feature, use the platform-approved mechanism that sets the limit inherited by the container process. Depending on the managed service and runtime, that can mean:

- changing the container runtime's default limits on the Qdrant node pool;
- using an approved entrypoint wrapper that raises the soft limit, within an already adequate hard limit, immediately before `exec` starts Qdrant;
- moving Qdrant to a dedicated node pool or platform that exposes supported runtime limits;
- asking the managed Kubernetes provider to change the runtime limit.

Do not claim success because an init container prints a larger `ulimit -n`: resource limits are inherited by child processes, and the Qdrant container is not a child of the init-container shell. Likewise, Pod `resources.limits`, existing `securityContext` fields, and sysctls serve different purposes; none sets `RLIMIT_NOFILE` in Kubernetes 1.37 or earlier.

After changing the node/runtime or approved wrapper configuration, roll the StatefulSet in a maintenance window. If every collection has a replication factor of at least 2 and its replicas are healthy, replace and verify one Qdrant Pod at a time. A single-node deployment or a collection with replication factor 1 can have downtime when a node hosting one of its shards restarts, so create and export all required node-local snapshots or another usable backup before restarting.

The automatic commands below assume `updateStrategy: RollingUpdate`, partition `0`, `maxUnavailable: 1`, and an effective readiness probe. Confirm those settings first. `OnDelete` requires manual Pod deletion, while `maxUnavailable` greater than 1 or the alpha `Recreate` strategy can replace more than one Pod at once.

```bash
kubectl rollout restart -n vector-db statefulset/qdrant
kubectl rollout status -n vector-db statefulset/qdrant
kubectl exec -n vector-db qdrant-0 -c qdrant -- sh -c '
  qdrant_pid=
  for proc in /proc/[0-9]*; do
    [ "$(cat "$proc/comm" 2>/dev/null)" = qdrant ] || continue
    qdrant_pid=${proc##*/}
    break
  done
  [ -n "$qdrant_pid" ] || {
    echo "Qdrant process not found" >&2
    exit 1
  }
  grep "Max open files" "/proc/$qdrant_pid/limits"
'
```

The Qdrant Helm chart since chart version `qdrant-1.15.0` already runs `ulimit -n "$(ulimit -Hn)"` in its `initialize.sh`, raising the soft limit to the hard limit inherited by the container. Verify that this wrapper has not been bypassed and inspect the actual Qdrant process. If the inherited hard limit is still too low, the chart cannot raise the soft limit beyond it; use the node, runtime, or provider mechanism described above and keep that change declarative.

## Investigate Why Descriptor Use Is High

Raising the ceiling stops immediate exhaustion; it does not explain the demand. Qdrant documents that each collection segment needs open files. Review:

- collection, shard, replica, and segment counts;
- a high rate of small writes that leaves the optimizer working through many segments;
- stalled or repeatedly failing optimizations;
- a large number of small collections where payload partitioning could be more appropriate;
- descriptor growth over time that does not stabilize;
- storage errors, restarts, or unsupported filesystems.

List collections, then inspect affected collection details and optimizer state through the Qdrant API or Web UI. Qdrant's merge optimizer normally reduces excessive small segments. Do not tune `default_segment_number`, `max_segment_size_kb`, or optimizer concurrency solely to reduce file descriptors; those settings also affect indexing cost, throughput, latency, and memory. Change them only after measurement and load testing.

Qdrant persistent storage requires block-level access with a POSIX-compatible filesystem. NFS and object storage are not supported Qdrant data volumes, so moving the data to them is not a valid workaround.

## Verify Recovery

After the replacement process is healthy:

1. confirm the soft and hard `Max open files` values inside every Qdrant container;
2. confirm `process_max_fds` reflects the intended limit on Qdrant 1.16+;
3. watch `process_open_fds` under normal and peak ingestion/search traffic;
4. confirm all collections are healthy and optimizer work progresses;
5. run representative reads and writes and verify cluster peers and replicas;
6. check logs for renewed OS error 24 messages.

Measure over a complete workload cycle. A clean restart temporarily lowers descriptor use and can make an unchanged limit look fixed.

## Roll Back Safely

If the replacement container has configuration or compatibility problems, stop it without deleting its volume and restore the previous pinned container or manifest. Reattach the same verified storage and previous runtime configuration. For Kubernetes, roll back the StatefulSet or node-pool change according to the platform procedure, one replica at a time when redundancy permits.

Do not roll back to the exhausted limit while traffic is unchanged. Either keep the safe limit adjustment or reduce load until the underlying segment or descriptor-growth issue is corrected.

## Limitations and Version Scope

The Qdrant FD metrics named here are available in Qdrant 1.16 and later. KEP-5758 remains unreleased as of Kubernetes 1.37; confirm the Kubernetes, CRI, and runtime documentation before using any future implementation. Qdrant Cloud customers do not manage container limits directly and should use Qdrant Cloud monitoring and support.

## Official Documentation

- [Qdrant troubleshooting: Too many files open](https://qdrant.tech/documentation/common-errors/)
- [Qdrant monitoring metrics](https://qdrant.tech/documentation/ops-monitoring/monitoring/)
- [Qdrant installation and persistent-storage requirements](https://qdrant.tech/documentation/installation/)
- [Qdrant optimizer and segment merging](https://qdrant.tech/documentation/ops-optimization/optimizer/)
- [Qdrant snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant upgrade and rolling-restart guidance](https://qdrant.tech/documentation/upgrades/)
- [Qdrant Helm chart startup wrapper](https://github.com/qdrant/qdrant-helm/blob/main/charts/qdrant/templates/configmap.yaml)
- [Kubernetes KEP-5758: Per-container ulimits configuration](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/5758-per-container-ulimits-configuration)
- [Kubernetes v1.37 release notes](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/)
- [Docker Compose service `ulimits`](https://docs.docker.com/reference/compose-file/services/#ulimits)

## Conclusion

Fix OS error 24 at the Qdrant process boundary: measure the inherited limit, recreate the Docker container with `--ulimit` or use the Kubernetes platform's supported runtime mechanism, and verify the value inside the replacement process. Then monitor descriptor headroom and segment behavior so a higher limit is a durable capacity choice rather than a mask for uncontrolled growth.
