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

- vCluster 0.29 upgraded etcd to 3.6. A cluster older than 0.24.2 must first reach at least 0.24.2 and remain in a 0.24.2–0.28.x release long enough to satisfy the documented etcd 3.5 prerequisite before moving to 0.29.
- vCluster 0.20 introduced `vcluster.yaml` in place of the legacy values format and requires a conversion workflow.

K3s support was removed in vCluster 0.33. Migrate a legacy K3s tenant to the K8s distro using the documented one-way migration before attempting that hop.

Backing store and distro choices have restricted migration paths. Do not change them opportunistically during an ordinary version upgrade.

## Capture Recovery Points

Create a vCluster control-plane snapshot and wait for `Completed`:

```bash
vcluster snapshot create team-a \
  "s3://platform-backups/vcluster/team-a/pre-0.36-upgrade.tar.gz"

vcluster snapshot get team-a \
  "s3://platform-backups/vcluster/team-a/pre-0.36-upgrade.tar.gz"
```

This snapshot does not include persistent-volume contents in v0.36. Use Velero or an application/provider backup for stateful workloads and verify both artifacts before the maintenance window.

Also capture a small sync canary set in a dedicated tenant namespace: ConfigMap, Secret consumed by a Pod, Service, PVC if applicable, and one object for each optional syncer you rely on. Record their translated host objects by vCluster management labels.

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
kubectl get pods -n team-a-vcluster --watch
kubectl get events -n team-a-vcluster \
  --sort-by=.lastTimestamp
kubectl logs -n team-a-vcluster <vcluster-pod> \
  --since=10m
```

Wait for the tenant API, not merely the Pod phase:

```bash
vcluster connect team-a -n team-a-vcluster --print > /tmp/team-a.kubeconfig
kubectl --kubeconfig /tmp/team-a.kubeconfig get --raw=/readyz
```

## Validate Resource Synchronization After Every Hop

For each canary, verify three things:

1. The tenant object still has the expected spec and status.
2. The translated control-plane object exists and references translated dependencies.
3. A change in either supported direction reconciles according to the documented ownership model.

Useful checks include:

```bash
# Tenant
kubectl --kubeconfig /tmp/team-a.kubeconfig get pod,service,pvc -A
kubectl --kubeconfig /tmp/team-a.kubeconfig get events -A \
  --sort-by=.lastTimestamp

# Control plane
kubectl get pod,service,pvc -A \
  -l vcluster.loft.sh/managed-by
```

For Ingress and Gateway API, inspect `Accepted`, `ResolvedRefs`, and controller status conditions. For storage, inspect PVC events on both APIs. For imported resources, verify selector membership and read-only reconciliation. For custom resources, confirm the configured CRD storage version still exists and that only one version is configured.

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
- [vCluster: How synchronization works](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Migrate from K3s to Kubernetes](https://www.vcluster.com/docs/vcluster/manage/upgrade/distro-migration)

## Conclusion

Upgrade through every minor with the same pinned configuration, a control-plane and data backup, and canaries for every sync path you use. Readiness is necessary but not sufficient: only translated-object, status, storage, and routing checks prove that resource synchronization survived the hop.
