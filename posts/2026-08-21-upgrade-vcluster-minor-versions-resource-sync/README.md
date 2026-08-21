# How to Upgrade vCluster Across Minor Versions Without Breaking Resource Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Upgrade, Synchronization, Kubernetes Operations

Description: Upgrade vCluster one minor at a time with a sync inventory, control-plane snapshot, compatibility checks, and rollback evidence.

---

A vCluster upgrade changes more than one control-plane image. The chart, generated RBAC, Kubernetes distribution image, sync controllers, translation rules, and configuration schema can all change. A tenant API can answer `/readyz` while a newly enabled or renamed sync path silently stops producing host objects.

This guide targets upgrades ending at vCluster **0.36**. vCluster officially recommends upgrading one minor version at a time; larger jumps are not actively tested or supported. Read every intervening migration note and use a matching CLI for each step.

## Establish the Exact Starting State

Record versions and configuration before touching the release:

```bash
vcluster --version
helm list -n team-a-vcluster
helm get values team-a -n team-a-vcluster --all > /tmp/team-a-rendered-values.yaml
kubectl get pod -n team-a-vcluster -o wide
```

Keep the intended `vcluster.yaml` in Git. Do not replace it with `/tmp/team-a-rendered-values.yaml`; rendered defaults from an old chart are useful for comparison but can reintroduce removed fields.

Inventory every non-default feature:

- `sync.toHost` and `sync.fromHost` resources and selectors,
- custom resource versions and patches,
- Ingress or Gateway API routing,
- StorageClass, RuntimeClass, node, and Secret imports,
- service replication,
- cert-manager, external-secrets, metrics, or Argo CD integration,
- backing store and Kubernetes distro,
- policies, quotas, admission, and network rules,
- HA replicas, persistence, and scheduling.

## Read Every Intermediate Migration

Build an explicit route such as `0.33.x -> 0.34.x -> 0.35.x -> 0.36.x`. For each hop, check release notes, lifecycle support, schema changes, and Kubernetes compatibility.

Two historical gates show why jumping is risky:

- For tenants using vCluster-managed etcd, vCluster 0.29 upgraded etcd to 3.6. A tenant older than 0.24.2 must first reach a 0.24.2–0.28.x release. Before crossing to 0.29, follow the dedicated etcd 3.5-to-3.6 guide and use its safe patch-level path for embedded or deployed etcd, then verify every etcd member is healthy.
- vCluster 0.20 introduced `vcluster.yaml` in place of the legacy values format and requires a conversion workflow.

K3s support was removed in vCluster 0.33. Migrate a legacy K3s tenant to the K8s distro using the documented one-way migration before attempting that hop.

Backing store and distro choices have restricted migration paths. Do not change them opportunistically during an ordinary version upgrade.

## Capture Recovery Points

For a running K8s-distribution tenant with a snapshot-supported backing store, create a vCluster control-plane snapshot and poll until `Completed`:

```bash
vcluster snapshot create team-a \
  --namespace team-a-vcluster \
  "s3://platform-backups/vcluster/team-a/pre-0.36-upgrade.tar.gz"

# Re-run until STATUS is Completed.
vcluster snapshot get team-a \
  --namespace team-a-vcluster \
  "s3://platform-backups/vcluster/team-a/pre-0.36-upgrade.tar.gz"
```

This snapshot does not include persistent-volume contents or cluster certificates in v0.36. Use Velero or an application/provider backup for stateful workloads. If the tenant uses an external MySQL or PostgreSQL database, back it up natively and avoid the vCluster CLI snapshot and restore commands. Verify every applicable artifact before the maintenance window.

Also capture a small sync canary set in a dedicated tenant namespace: a Pod that consumes both a ConfigMap and a Secret, a Service, a PVC if applicable, and one object for each optional syncer you rely on. Record each counterpart on the other side; for objects synced to the control plane cluster, use the vCluster management labels and object annotations.

## Upgrade One Minor at a Time

Upgrade the CLI to the next target version using the official installation or upgrade procedure, then apply the same reviewed configuration:

```bash
vcluster upgrade --version 0.36.0

vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

The example shows the final hop. For a multi-minor route, repeat it separately for each next minor and validate before continuing. Do not assume the latest CLI safely performs all intermediate migrations in one operation.

Watch the control plane rollout:

```bash
kubectl get pods -n team-a-vcluster \
  -l app=vcluster,release=team-a --watch
kubectl get events -n team-a-vcluster \
  --sort-by=.metadata.creationTimestamp
kubectl logs -n team-a-vcluster \
  -l app=vcluster,release=team-a \
  --all-containers --prefix --since=10m
```

Wait for the tenant API, not merely the Pod phase:

```bash
vcluster connect team-a -n team-a-vcluster -- \
  kubectl get --raw=/readyz
```

## Validate Resource Synchronization After Every Hop

For each canary, verify three things:

1. The tenant object still has the expected spec and status.
2. Its counterpart exists on the other side and, where applicable, references translated dependencies.
3. A change in either supported direction reconciles according to the documented ownership model.

Useful checks include:

```bash
# Tenant, through the CLI-managed connection
vcluster connect team-a -n team-a-vcluster -- \
  kubectl get pod,service,pvc,configmap,secret -A
vcluster connect team-a -n team-a-vcluster -- \
  kubectl get events -A --sort-by=.metadata.creationTimestamp

# Control plane
kubectl get pod,service,pvc,configmap,secret -A \
  -l vcluster.loft.sh/name=team-a,vcluster.loft.sh/namespace=team-a-vcluster
```

For Ingress, inspect `.status.loadBalancer` and controller events. For Gateway API Routes, inspect `Accepted`, `ResolvedRefs`, and other controller-reported conditions under `.status.parents[].conditions`; for Gateways, inspect `Accepted`, `Programmed`, addresses, and listener conditions. For storage, inspect PVC events on both APIs. For resources synced from the control plane cluster, verify selector or mapping membership and the configured one-way or sync-back behavior; if `sync.fromHost.nodes.syncBackChanges` is enabled, separately verify its permitted label and taint updates. For custom resources, confirm that the explicitly configured API version still exists, or that the CRD storage version exists when no version is specified, and that only one version of each custom resource is configured for sync.

Look for repeated `Forbidden`, translation, patch-path, watch, or immutable-field errors in the vCluster logs. A healthy Pod with a hot reconcile loop is not a healthy upgrade.

## Decide Whether to Continue or Stop

Continue to the next minor only when:

- control-plane Pods are stable with no restart loop,
- the tenant API is Ready,
- every canary has converged on both sides,
- stateful applications pass read/write checks,
- routing and DNS work through the real endpoint,
- no sustained new error class appears in logs or events.

If a hop fails, stop. Preserve logs and events, identify whether the documented rollback supports a chart downgrade, and prefer a tested snapshot restore or clone over repeatedly toggling versions against the same datastore. Database migrations can make a naive Helm rollback unsafe.

## Official Documentation

- [vCluster: Upgrade vCluster](https://www.vcluster.com/docs/vcluster/manage/upgrade/upgrade-version)
- [vCluster: Lifecycle and supported versions](https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions)
- [vCluster: Safely upgrade etcd from 3.5 to 3.6](https://www.vcluster.com/docs/vcluster/learn-how-to/control-plane/container/safely-upgrade-etcd)
- [vCluster: How synchronization works](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Migrate from K3s to Kubernetes](https://www.vcluster.com/docs/vcluster/manage/upgrade/distro-migration)

## Conclusion

Upgrade through every minor with the same pinned configuration, a control-plane and data backup, and canaries for every sync path you use. Readiness is necessary but not sufficient: only translated-object, status, storage, and routing checks prove that resource synchronization survived the hop.
