# Validation Summary: How to Run the CockroachDB Operator Under Kubernetes Restricted Pod Security

## Status

validated

## Post Type

Technical guide / Kubernetes security configuration tutorial

## Technologies Covered

- CockroachDB
- CockroachDB Kubernetes Operator 1.0.0
- CockroachDB `crdb.cockroachlabs.com/v1beta1` custom resources
- CockroachDB Helm chart 26.2.4
- Kubernetes Pod Security Admission and the Restricted Pod Security Standard
- Kubernetes pod and container `securityContext`
- Kubernetes CSI volume ownership and `fsGroup`
- Helm OCI charts and manifest rendering
- Kustomize overlays
- `kubectl`

## Sources Consulted

- [CockroachDB GA Operator announcement and `v1beta1` example](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB Operator chart 1.0.0 changelog](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [CockroachDB Operator chart metadata and values](https://github.com/cockroachdb/helm-charts/tree/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator)
- [CockroachDB Operator Deployment template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [CockroachDB Operator certificate templates](https://github.com/cockroachdb/helm-charts/tree/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/templates)
- [CockroachDB Operator v1.0.0 image](https://hub.docker.com/r/cockroachdb/cockroachdb-operator-v2/tags?name=v1.0.0)
- [CockroachDB init-container v1.0.0 image](https://hub.docker.com/r/cockroachdb/cockroachdb-init-container/tags?name=v1.0.0)
- [CockroachDB certificate-reloader v1.0.0 image](https://hub.docker.com/r/cockroachdb/cockroachdb-cert-reloader/tags?name=v1.0.0)
- [CockroachDB Operator direct-manifest installation guidance](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/manifests/README.md)
- [CockroachDB Operator public `v1beta1` API reference](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/api/README.md)
- [CockroachDB `CrdbNodeSpec` and `PodTemplateSpec` definitions](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB GA pod-template example](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [CockroachDB chart 26.2.4 values](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB self-signer Job template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/job-certSelfSigner.yaml)
- [CockroachDB self-signer cleaner Job template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/job-cleaner.yaml)
- [CockroachDB CA certificate-rotation CronJob template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/cronjob-ca-certSelfSigner.yaml)
- [CockroachDB client and node certificate-rotation CronJob template](https://github.com/cockroachdb/helm-charts/blob/acbe07b85d75867a41a78d02064096ee02eb0d10/cockroachdb-parent/charts/cockroachdb/templates/cronjob-client-node-certSelfSigner.yaml)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Pod Security Admission behavior](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Kubernetes Pod Security namespace labels](https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/)
- [Kubernetes security contexts and volume ownership](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes `CSIDriverSpec` and `fsGroupPolicy` API](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-driver-v1/#CSIDriverSpec)
- [Kubernetes API dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes Kustomize documentation](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Helm OCI registry documentation](https://helm.sh/docs/topics/registries/)
- [Helm `template` command reference](https://helm.sh/docs/helm/helm_template/)

## Issues Found

No technical issues found.

## Review Notes

- The review was pinned to upstream commit `acbe07b85d75867a41a78d02064096ee02eb0d10`, the published `cockroachdb-operator-chart` 1.0.0 artifact, and `cockroachdb-chart` 26.2.4. The database chart's `appVersion` is 26.2.5.
- The exact operator chart was pulled from its documented OCI location, linted, and rendered with `selfSignedOperatorCerts=true`. The rendered Deployment is named `cockroach-operator`, contains the `cockroach-operator` container, uses an `emptyDir` for certificates in operator-managed certificate mode, and exposes no chart values for pod or container security contexts.
- The operator image `cockroachdb/cockroachdb-operator-v2:v1.0.0` has no configured image `USER`; explicitly running the pinned image as UID/GID 1000 succeeded. The related init-container and certificate-reloader images declare UID 1000. Future image versions still require fresh runtime testing, as the post advises.
- A live v1.0.0 reconciliation confirmed that a fresh cluster with `dropChownContainer` unset did not generate a separate ownership-changing init container. It also confirmed that the named `cockroachdb-init` and `cockroachdb` overrides merge into the generated Pod and run under Restricted admission as UID/GID 1000. The public API and examples confirm the `cert-reloader` name for TLS-enabled Pods.
- CockroachDB chart 26.2.4 defaults both `cockroachdb.tls.selfSigner.securityContext.enabled` and `cockroachdb.tls.selfSigner.rotateCerts` to `true`. Its signer and cleaner Jobs contain Restricted-compatible contexts, while both default rotation CronJob templates omit them. The post correctly requires disabling rotation or durably patching those CronJobs before relying on self-signer rotation in a Restricted namespace.
- The CRDs are approximately 1.3 MB and 1.1 MB, which is too large for client-side apply's `last-applied-configuration` annotation. The documented server-side apply command is appropriate.
- PVC writability remains storage-driver-specific. The post correctly distinguishes kubelet ownership handling from CSI `VOLUME_MOUNT_GROUP`, warns that `fsGroupChangePolicy` is ineffective when the CSI driver handles ownership, and requires testing a fresh PVC before using the pattern with existing data.
- All commands and YAML snippets are syntactically valid for the pinned versions, and all links in the post's Official Documentation section resolved to relevant sources.
