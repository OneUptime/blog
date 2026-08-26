# How to Choose a CockroachDB Image Version Supported by Your Operator Release

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Helm, Version Compatibility, Upgrades

Description: Select a CockroachDB container image using the GA operator and database chart version contracts, verify the rendered v1beta1 field, and avoid unsupported upgrade paths.

---

The GA CockroachDB Operator and CockroachDB database are versioned independently. Do not derive a database image from the operator's version number. Operator chart `1.0.0`, for example, does not imply CockroachDB `1.0.0`.

The safest selection is the `appVersion` shipped by a published `cockroachdb-chart`. The database chart's major and minor numbers track the CockroachDB series, while its patch number can differ from the database patch. The operator chart uses its own semantic version and supports multiple database chart versions. Any exception or new minimum operator requirement should be stated in the relevant official changelog.

This guide covers the GA `crdb.cockroachlabs.com/v1beta1` operator. The older public `cockroachdb/cockroach-operator` project uses `v1alpha1`, a different custom-resource shape, and a different release lifecycle.

## Separate the four versions

Record four values for every deployment:

| Component | Example | What it controls |
| --- | --- | --- |
| Operator chart | `cockroachdb-operator-chart` `1.0.0` | CRDs, RBAC, Deployment, and operator image |
| Operator image | `cockroachdb/cockroachdb-operator-v2:v1.0.0` | Reconciliation behavior |
| CockroachDB chart | `cockroachdb-chart` `26.2.4` | The rendered `v1beta1` cluster and supporting resources |
| CockroachDB image | `cockroachdb/cockroach:v26.2.5` | The database binary run by every CockroachDB pod |

Those example values match the official v2 Helm index published on August 5, 2026. They are a snapshot, not a rule to hard-code forever: query the repository at deployment time and pin the versions you reviewed.

## Inspect the published chart metadata

Add the GA v2 repository and list every available release:

```bash
helm repo add cockroachdb-v2 https://charts.cockroachdb.com/v2 --force-update
helm repo update cockroachdb-v2

helm search repo cockroachdb-v2/cockroachdb-operator-chart --versions
helm search repo cockroachdb-v2/cockroachdb-chart --versions
```

Then inspect a candidate database chart:

```bash
helm show chart cockroachdb-v2/cockroachdb-chart --version 26.2.4
```

For that release, the important result is:

```yaml
name: cockroachdb-chart
version: 26.2.4
appVersion: 26.2.5
```

That means the reviewed default image is CockroachDB `v26.2.5`, even though the chart is `26.2.4`. Inspect its defaults rather than guessing the image string:

```bash
helm show values cockroachdb-v2/cockroachdb-chart --version 26.2.4 \
  | sed -n '/^[[:space:]]*image:/,/^[[:space:]]*clusterSettings:/p'
```

Also read both changelogs. The operator changelog records operator behavior and fixes; the database chart changelog records its default CockroachDB image and feature-specific minimums. For a new CockroachDB series, the official versioning guide says to check compatibility notes for a required operator upgrade.

## Inventory the versions already installed

Before proposing a change, capture the live operator image, Helm releases, desired database image, and observed database version:

```bash
helm -n database-operators list
helm -n crdb-prod list

kubectl -n database-operators get deployment cockroach-operator \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="cockroach-operator")].image}{"\n"}'

kubectl -n crdb-prod get crdbcluster orders-db \
  -o jsonpath='{.spec.template.spec.image}{"\n"}{.status.image}{"\n"}{.status.version}{"\n"}'
```

The first line from the `CrdbCluster` is the desired `v1beta1` image. `status.image` and `status.version` describe what the operator observes running. A difference can be normal during a rolling upgrade, but it must converge before you call the change complete.

## Prefer the chart default

For a new deployment, pin a database chart and leave its image default unchanged:

```bash
helm upgrade --install orders-db cockroachdb-v2/cockroachdb-chart \
  --version 26.2.4 \
  --namespace crdb-prod \
  --values values.yaml
```

This keeps the chart templates, helper images, defaults, and database image on a combination published together. It also makes upgrades reviewable: a Git change to the chart version reveals the effective image change through `appVersion` and the changelog.

If you need a patch that was released before the chart was updated, the official versioning guide allows an explicit override:

```yaml
cockroachdb:
  crdbCluster:
    image:
      name: cockroachdb/cockroach:v26.2.5
      pullPolicy: IfNotPresent
```

The chart renders that to the GA custom resource as a string:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
spec:
  template:
    spec:
      image: cockroachdb/cockroach:v26.2.5
```

Use this first-class field. Do not override the `cockroachdb` entry in `podTemplate.spec.containers` merely to change versions; that bypasses the chart's intended image setting and makes review harder. Do not use the legacy public operator's `spec.image.name` shape either.

## Check three kinds of support before overriding

An image is a reasonable candidate only when all three checks pass:

1. **Operator and chart contract:** the operator and database chart changelogs do not identify an unmet minimum or incompatibility.
2. **CockroachDB release support:** the exact database version is a supported production release under Cockroach Labs' release support policy, not an unreviewed alpha, beta, or RC image.
3. **Upgrade path:** the running cluster can move to the target version through a supported patch or major-version path, with required intermediate Regular releases and finalization behavior understood.

Being able to pull an image is not proof of support. A container with a `cockroach` binary can still be rejected by version validation, fail an upgrade constraint, or use a database release outside its support window.

For production, mirror the exact reviewed image to your approved registry without changing its contents, retain its digest in supply-chain records, and test that the mirrored image still reports the expected version. A custom image that replaces the binary or entrypoint is a separate qualification exercise.

## Render and stage the change

Preview the exact desired image:

```bash
helm template orders-db cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml \
  --show-only templates/crdb.yaml \
  | grep -A2 '^[[:space:]]*image:'
```

If a newer operator is required, upgrade the operator chart first and wait for it to become ready. Then upgrade the CockroachDB chart. The official versioning guide explicitly requires operator-first order when both change.

During the database rollout, watch the operator actions and pod images:

```bash
kubectl -n crdb-prod get crdbcluster orders-db \
  -o jsonpath='{.status.actions}{"\n"}{.status.image}{"\n"}{.status.version}{"\n"}'

kubectl -n crdb-prod get pods \
  -l app.kubernetes.io/component=cockroachdb \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.containers[?(@.name=="cockroachdb")].image,READY:.status.containerStatuses[?(@.name=="cockroachdb")].ready'
```

The operator performs a staged pod update. Before a major-version change, verify cluster health, backups, node-version consistency, and under-replicated ranges. Decide whether automatic finalization is acceptable: after a major upgrade finalizes, returning to the prior binary is no longer a normal rollback.

## Official Documentation

- [CockroachDB Helm v2 versioning and upgrade order](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/docs/VERSIONING.md)
- [CockroachDB Operator chart changelog](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [CockroachDB database chart changelog](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/CHANGELOG.md)
- [Official CockroachDB v2 Helm repository index](https://charts.cockroachdb.com/v2/index.yaml)
- [CockroachDB: Upgrade with the operator](https://www.cockroachlabs.com/docs/stable/upgrade-cockroachdb-operator)
- [CockroachDB release support policy](https://www.cockroachlabs.com/docs/releases/release-support-policy)
- [CockroachDB GA `v1beta1` image field](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)

## Conclusion

Choose the database version from a pinned `cockroachdb-chart` and read its `appVersion`; never infer it from the independently versioned operator. Prefer the published default, use `cockroachdb.crdbCluster.image.name` only for a reviewed override, confirm release support and the upgrade path, and wait for `status.image`, `status.version`, and all live pod images to converge.
