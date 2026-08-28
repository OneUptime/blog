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

For Kubernetes:

```bash
kubectl logs -n vector-db qdrant-0 --since=30m | grep -i 'too many open files'
kubectl describe pod -n vector-db qdrant-0
```

Inspect the limit and current descriptor count inside the same container that runs Qdrant:

```bash
docker exec qdrant sh -c '
  grep "Max open files" /proc/1/limits
  printf "Open descriptors: "
  ls -1 /proc/1/fd 2>/dev/null | wc -l
'
```

```bash
kubectl exec -n vector-db qdrant-0 -- sh -c '
  grep "Max open files" /proc/1/limits
  printf "Open descriptors: "
  ls -1 /proc/1/fd 2>/dev/null | wc -l
'
```

The official Qdrant image normally runs Qdrant as PID 1. If an organization-specific image uses a supervisor or wrapper as PID 1, find the Qdrant PID and inspect that process's `/proc/<pid>/limits` and `/proc/<pid>/fd` instead.

On Qdrant 1.16 or later, the metrics endpoint exposes the same capacity trend directly:

```bash
curl -s http://127.0.0.1:6333/metrics \
  | grep -E '^process_(open|max)_fds '
```

Compare `process_open_fds` with `process_max_fds`. Alert on shrinking headroom rather than waiting for equality. Also confirm the problem is per-process exhaustion and not a broader node-wide failure before changing limits.

## Record the Deployment Before Replacing Anything

Before remediation, record:

- the exact Qdrant image digest or version tag;
- every volume and its mount path;
- environment variables, mounted configuration, ports, networks, API keys, and cluster peer settings;
- collection and cluster health;
- a current snapshot or another tested recovery path;
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

Recreate only the Qdrant service, then inspect `/proc/1/limits` in the new container. Editing Compose without recreating the container does not change the already-running process.

The value 10,000 is Qdrant's documented example, not a universal capacity formula. Choose a controlled limit that exceeds observed demand with operational headroom and remains acceptable for the host. An unnecessarily unbounded limit can hide abnormal growth and consume node resources.

## Fix a Kubernetes Pod

The stable Kubernetes Pod API historically has not offered a portable per-container `ulimit` field. Kubernetes enhancement KEP-5758 proposes such a field and targets an alpha feature for Kubernetes 1.37. Alpha availability depends on the exact Kubernetes release, feature gate, CRI, and container runtime; do not paste an alpha `securityContext.ulimits` example into a cluster that does not explicitly support it.

For clusters without the supported feature, use the platform-approved mechanism that sets the limit inherited by the container process. Depending on the managed service and runtime, that can mean:

- changing the container runtime's default limits on the Qdrant node pool;
- using an approved entrypoint wrapper that raises the soft limit, within an already adequate hard limit, immediately before `exec` starts Qdrant;
- moving Qdrant to a dedicated node pool or platform that exposes supported runtime limits;
- asking the managed Kubernetes provider to change the runtime limit.

Do not claim success because an init container prints a larger `ulimit -n`: resource limits are inherited by child processes, and the Qdrant container is not a child of the init-container shell. Likewise, Pod `resources.limits`, `securityContext`, and sysctls serve different purposes unless the exact Kubernetes version implements the ulimits feature.

After changing the node/runtime or approved wrapper configuration, roll the StatefulSet in a maintenance window. A replicated cluster should replace and verify one Qdrant Pod at a time. A single-replica deployment has downtime and no redundant copy during the restart, so take a snapshot first.

```bash
kubectl rollout restart -n vector-db statefulset/qdrant
kubectl rollout status -n vector-db statefulset/qdrant
kubectl exec -n vector-db qdrant-0 -- \
  sh -c 'grep "Max open files" /proc/1/limits'
```

If the official Helm chart is used, keep the change in the platform's declarative node/runtime configuration or a reviewed chart override so that upgrades and rescheduling do not silently restore the old limit. The community Helm chart itself does not make a runtime-specific workaround portable.

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

The Qdrant FD metrics named here are available in Qdrant 1.16 and later. Container ulimit support in Kubernetes is version- and runtime-sensitive; KEP-5758 is an alpha-track enhancement rather than a generally portable assumption. Confirm the exact Kubernetes and CRI documentation for the deployed version. Qdrant Cloud customers do not manage container limits directly and should use Qdrant Cloud monitoring and support.

## Official Documentation

- [Qdrant troubleshooting: Too many files open](https://qdrant.tech/documentation/operations/common-errors/)
- [Qdrant monitoring metrics](https://qdrant.tech/documentation/operations/monitoring/)
- [Qdrant installation and persistent-storage requirements](https://qdrant.tech/documentation/installation/)
- [Qdrant optimizer and segment merging](https://qdrant.tech/documentation/operations/optimizer/)
- [Qdrant upgrade and rolling-restart guidance](https://qdrant.tech/documentation/upgrades/)
- [Kubernetes KEP-5758: Per-container ulimits configuration](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/5758-per-container-ulimits-configuration)
- [Docker Compose service `ulimits`](https://docs.docker.com/reference/compose-file/services/#ulimits)

## Conclusion

Fix OS error 24 at the Qdrant process boundary: measure the inherited limit, recreate the Docker container with `--ulimit` or use the Kubernetes platform's supported runtime mechanism, and verify the value inside the replacement process. Then monitor descriptor headroom and segment behavior so a higher limit is a durable capacity choice rather than a mask for uncontrolled growth.
