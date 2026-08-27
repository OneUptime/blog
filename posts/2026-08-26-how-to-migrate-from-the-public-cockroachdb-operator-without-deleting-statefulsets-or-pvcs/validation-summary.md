# Validation Summary: Migrate from the Public CockroachDB Operator Without Losing Data

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- CockroachDB Public Operator v2.18.3 and later
- GA CockroachDB Operator and `cockroachdb-operator-chart` 1.0.0
- `crdb.cockroachlabs.com/v1alpha1` and `v1beta1` `CrdbCluster` resources
- CockroachDB `CrdbNode` resources and migration controller
- Kubernetes StatefulSets, PersistentVolumeClaims, CRD conversion, admission webhooks, Services, RBAC, and PodDisruptionBudgets
- `kubectl`, Helm, JSONPath, and JSON Patch
- CockroachDB TLS certificates, cert-manager, replication, and health checks

## Sources Consulted

- [Automatic Public Operator migration guide at the reviewed upstream commit](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/docs/migration/operator/controller_migration.md)
- [CockroachDB v2 Helm chart distribution and versioning](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md)
- [CockroachDB Operator chart README and prerequisites](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/README.md)
- [CockroachDB Operator chart 1.0.0 changelog](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [CockroachDB Operator chart values](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/values.yaml)
- [Published CockroachDB v2 Helm repository index](https://charts.cockroachdb.com/v2/index.yaml)
- [Public Operator v2.18.3 changelog](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.3/CHANGELOG.md)
- [Public Operator v2.18.3 `skip-reconcile` guard](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.3/pkg/controller/cluster_controller.go#L145-L149)
- [Public Operator v2.18.3 webhook configurations](https://github.com/cockroachdb/cockroach-operator/blob/v2.18.3/install/operator.yaml)
- [Kubernetes admission webhook `matchPolicy`](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-matchpolicy)
- [Kubernetes StatefulSet behavior and PVC retention](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl label` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [`kubectl annotate` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/)
- [`kubectl patch` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)
- [`kubectl rollout status` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Helm `repo add` reference](https://helm.sh/docs/helm/helm_repo_add/)
- [Helm `repo update` reference](https://helm.sh/docs/helm/helm_repo_update/)
- [Helm `upgrade` reference](https://helm.sh/docs/helm/helm_upgrade/)
- [RFC 6902 JSON Patch `add` operation](https://datatracker.ietf.org/doc/html/rfc6902#section-4.1)

## Issues Found

- The original title said the migration did not delete StatefulSets, but deleting the zero-replica StatefulSet after `Finalization` is required to reach `Complete`. Changed the title to distinguish premature StatefulSet deletion from the required final handoff deletion.
- The post did not state that `crdb.io/skip-reconcile` requires Public Operator v2.18.3 or later. Added the minimum version because older releases ignore this label and continue reconciling the cluster.
- The post advised pinning releases but installed an unpinned relative source-tree chart and described the local-only `cockroachdb-parent` tree as the distribution. Replaced it with the published `cockroachdb-v2/cockroachdb-operator-chart` package pinned to GA version 1.0.0, added the official repository setup commands, clarified the source-versus-package distinction, and documented the chart's Kubernetes 1.30+ and Helm 3.0+ prerequisites.
- The completion check ran immediately after StatefulSet deletion even though the controller may take several seconds to change the mode and phase. Changed it to watch until `MutableOnly Complete` appears.
- The rollback explanation claimed that the controller restores “StatefulSet ownership,” which the official procedure does not promise. Replaced that claim with the documented restoration of the StatefulSet's original replica count.
- The post called Helm adoption optional without describing the non-rotating, one-year `ExternalCertificates` created when migrating Public Operator self-signed certificates. Added the requirement to arrange certificate rotation and the documented Helm self-signer adoption route.
- The Helm documentation link was too broad and its label implied that the repository root documented supported migration paths. Pointed it to the official chart distribution and versioning guide used by the corrected install command.

## Review Notes

The core migration sequence was otherwise accurate at CockroachDB Helm charts commit `e2fca923e3f0c77c60c771b773d46fc86bf6aa48` (2026-08-20). The compatibility limitations, custom-certificate SANs, cloud annotations, `matchPolicy: Exact` patches, opt-in migration label, phase order, health gates, highest-ordinal progression, forward PVC reuse, zero-replica StatefulSet handoff, rollback boundary, rollback PVC replacement, post-migration checks, and coexistence cleanup order all match the official automatic controller migration guide.

The published Helm index confirms that `cockroachdb-operator-chart` 1.0.0 is the GA chart and uses operator app version 1.0.0. The corrected values render the migration flag, AWS region, distinct application label, and watched namespace as intended. The operator's installation namespace remains independent of `watchNamespaces`, so the absence of a Helm `--namespace` flag does not invalidate the reconciliation scope shown.

Kubernetes retains StatefulSet PVCs by default, and the supported Public Operator migration path relies on that behavior. Kubernetes also supports an explicit `persistentVolumeClaimRetentionPolicy` with `Delete`; such a customized StatefulSet is outside the documented generated configuration and should be checked before relying on general retention behavior. The Events command is a sorted snapshot and can include events for another same-named object, but it remains a valid supplemental diagnostic command. All documentation links in the post returned HTTP 200, as did the Helm repository's `index.yaml`. Future chart upgrades should update the explicit version pin and be rechecked against the matching version of the migration guide.
