# Run a Production JetStream EventBus for Argo Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, NATS JetStream, EventBus, Kubernetes, High Availability, Disaster Recovery, TLS

Description: Configure an Argo-managed JetStream EventBus with supported versions, replicas, persistent volumes, placement, TLS, capacity, and tested recovery.

---

The smallest JetStream EventBus manifest creates a useful development broker, but production reliability needs an explicit storage, placement, capacity, disruption, upgrade, and restore contract.

Argo Events can manage the NATS JetStream StatefulSet. Current official documentation says the default is three replicas, TLS is enabled for client-server and inter-node traffic, and client password authentication is enabled. Those defaults do not choose your storage class, failure domains, backup destination, or recovery procedure, and the default retention limits may not match your requirements.

## Pin a Controller-Supported NATS Version

The EventBus `version` is a lookup key in `argo-events-controller-config`, not an arbitrary container tag. Inspect the installed controller's configuration:

```bash
kubectl -n argo-events get configmap argo-events-controller-config \
  -o jsonpath='{.data.controller-config\.yaml}'
```

The current upstream manifest maps `2.10.29` to a NATS 2.10.29 image, but another Argo Events release may differ. Never assume a version copied from this article is supported by your controller.

## Configure Replicas, Persistence, and Placement

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventBus
metadata:
  name: default
  namespace: argo-events
spec:
  jetstream:
    version: 2.10.29
    replicas: 3
    persistence:
      storageClassName: fast-retained
      accessMode: ReadWriteOnce
      volumeSize: 100Gi
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                controller: eventbus-controller
                eventbus-name: default
            topologyKey: topology.kubernetes.io/zone
    priorityClassName: platform-critical
    containerTemplate:
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          memory: 2Gi
```

Verify generated pod labels against your installed release before enforcing required anti-affinity. Required zone spreading needs at least three schedulable zones; otherwise the EventBus may remain Pending. If the cluster has fewer zones, use hostname spreading or a preferred rule and document the reduced failure tolerance. The `fast-retained` StorageClass and `platform-critical` PriorityClass are environment-specific placeholders; create them first or substitute names that exist in the cluster.

`ReadWriteOnce` is appropriate for one PVC per StatefulSet replica on common block storage. Choose a StorageClass whose reclaim policy, volume binding mode, zone behavior, expansion, snapshots, encryption, and restore are understood. A retained volume can aid recovery but also retains sensitive event payloads after resource deletion.

## Align Stream Replicas with Server Replicas

Argo's controller config defines default stream settings, including a stream replica count. An optional `streamConfig` string merges overrides:

```yaml
spec:
  jetstream:
    version: 2.10.29
    replicas: 3
    persistence:
      storageClassName: fast-retained
      accessMode: ReadWriteOnce
      volumeSize: 100Gi
    streamConfig: |
      maxAge: 72h
      maxMsgs: 2000000
      maxBytes: 85899345920
      replicas: 3
      duplicates: 10m
      retention: 0
      discard: 0
```

These fields and numeric enum values come from the current Argo Events JetStream API: retention `0` is Limits and discard `0` is DiscardOld. Argo reads `maxBytes` as an integer, so `85899345920` means 80 GiB; a value such as `80GB` would be read as zero rather than a byte limit. Confirm all fields in the installed CRD/API. The limit must fit real storage with headroom for filesystem overhead, replicas, consumer state, and operational recovery. NATS stream limits apply to the stream, while disk capacity applies per server and replica placement.

Set `maxAge` longer than the maximum planned Sensor outage plus detection and repair time, and size `maxMsgs` and `maxBytes` so they do not evict that backlog sooner at expected traffic rates. Know whether DiscardOld under pressure satisfies the business loss policy. If it does not, alert well before the limit and control producers upstream.

## Add a PodDisruptionBudget

The Argo Events HA guidance recommends a PDB. For a three-replica bus:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: eventbus-default
  namespace: argo-events
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      controller: eventbus-controller
      eventbus-name: default
```

A PDB limits voluntary evictions performed through the Kubernetes Eviction API, such as a normal drain. It does not prevent node failure, OOM kill, force deletion, direct pod deletion, or StatefulSet-controlled rolling updates. It can also block maintenance when the cluster lacks capacity. Test drain behavior and keep enough schedulable capacity across failure domains.

## Understand TLS and Credentials

For managed JetStream, Argo Events enables TLS for client and cluster communication and creates client authentication Secrets. Do not replace this with plaintext for convenience.

Protect the generated Secrets through RBAC, namespace isolation, encryption at rest, and audit logging. Restrict NetworkPolicy so only intended EventSources, Sensors, controller components, and monitoring can reach JetStream ports.

Certificate and password rotation behavior depends on Argo Events and NATS versions. Inspect generated Secrets, ConfigMap, reloader sidecar, and StatefulSet; rehearse rotation without deleting the stream. Do not assume changing a Secret proves all clients and servers reloaded it.

## Size from Retained Bytes and Backlog

Estimate:

```text
retained logical bytes = ingress bytes/second * retention seconds
replicated stored bytes = retained logical bytes * stream replica count
```

Then add headroom for bursts, indexes, consumer state, filesystem behavior, compaction, and recovery. Measure actual `nats-server` storage and memory, not payload bytes alone.

Also limit maximum event payload through `maxPayload` when supported:

```yaml
spec:
  jetstream:
    maxPayload: 2MB
```

The API notes that zero means unlimited and the default is 1 MB. Ensure EventSource payload limits, JetStream maximum payload, and downstream Workflow parameter/object limits agree. Put large data in object storage and send a reference.

## Monitor Quorum, Storage, and the Argo Path

Monitor NATS through the metrics sidecar and official NATS exporter metrics. Alert on:

- unavailable or frequently restarting EventBus pods;
- stream or consumer replica health;
- bytes and messages approaching limits;
- disk saturation and PVC capacity;
- publish and acknowledgment errors;
- consumer backlog and redelivery;
- leader changes and loss of quorum;
- EventSource send failures and Sensor action failures.

The Argo Events `Deployed` condition means the controller created resources; it does not prove all NATS replicas are ready or the stream is healthy. Check the StatefulSet rollout and NATS stream/consumer state.

## Back Up the Stream, Not Just the PVC

Replicas are not backups. A bad configuration, accidental deletion, credential error, or namespace disaster can affect every replica. NATS documents `nats stream backup` and `nats stream restore`, and snapshots of file-backed streams include configuration, message data, and durable consumer state.

Build a runbook that:

1. obtains NATS credentials and CA material without exposing them;
2. identifies Argo's stream, currently named `default` for the managed EventBus;
3. writes an encrypted snapshot to storage outside the cluster/failure domain;
4. verifies snapshot integrity and retention;
5. restores into an isolated JetStream cluster;
6. proves EventSource and Sensor consumers behave as expected after recovery.

CSI volume snapshots can complement this but are not automatically an application-consistent multi-replica JetStream backup. Use the NATS-supported stream snapshot as the portable recovery artifact.

## Plan Upgrades and Disaster Recovery

Before changing Argo Events or NATS versions:

- read both projects' release notes;
- verify the target NATS key exists in controller config;
- back up the stream;
- test in a representative environment;
- confirm the StatefulSet rollout behavior and available capacity preserve quorum;
- observe quorum, stream replicas, redelivery, and Sensor actions;
- define rollback limits, especially after storage-format changes.

Test loss of one pod, one node, and one zone. A temporarily unavailable replica can catch up when it returns. Automatic replacement of a permanently lost replica requires surviving quorum, an available JetStream server for placement, and removal of the lost server from the JetStream meta group. Test total-cluster restore separately; quorum cannot recover a totally destroyed cluster without an external recovery copy.

Record RPO and RTO based on measured drills, not on the words "three replicas."

## Official Documentation

- [Argo Events JetStream EventBus](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events HA and DR recommendations](https://argoproj.github.io/argo-events/dr_ha_recommendations/)
- [Argo Events EventBus anti-affinity](https://argoproj.github.io/argo-events/eventbus/antiaffinity/)
- [NATS JetStream clustering](https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering)
- [NATS JetStream disaster recovery](https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/disaster_recovery)
- [Kubernetes PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)

## Conclusion

Run managed JetStream as a real stateful system: pin a supported version, use three failure-separated replicas and durable volumes, bound retention and payloads, protect TLS credentials, and monitor NATS plus Argo metrics. Replication handles some failures; for this managed-bus design, an off-cluster stream backup and tested restore provide recovery from complete cluster loss.
