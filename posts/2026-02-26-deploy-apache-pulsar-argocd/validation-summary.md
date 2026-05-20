# Validation Summary: How to Deploy Apache Pulsar with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Pulsar
- Apache Pulsar Helm chart
- Argo CD
- Kubernetes
- Prometheus Operator ServiceMonitor
- JWT authentication
- BookKeeper and ZooKeeper

## Sources Consulted
- Apache Pulsar Helm chart repository and values/templates: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar Helm chart repository index: https://pulsar.apache.org/charts/index.yaml
- Apache Pulsar chart 3.5.0 package: https://archive.apache.org/dist/pulsar/helm-chart/3.5.0/pulsar-3.5.0.tgz
- Apache Pulsar token authentication documentation: https://pulsar.apache.org/docs/3.0.x/security-token-admin/
- Apache Pulsar namespace administration documentation: https://pulsar.apache.org/docs/3.0.x/admin-api-namespaces/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/

## Issues Found
- The Argo CD Helm values were missing `initialize: true` and `useReleaseStatus: false`, which the Pulsar chart documents for GitOps renderers that do not track Helm install/upgrade state. Added both values.
- The JWT chart value used `auth.authentication.usingSecretKey`, but chart 3.5.0 expects `auth.authentication.jwt.usingSecretKey`. Moved the value under the correct `jwt` key.
- The Pulsar Manager section used `pulsar_manager.enabled`, but the chart enables the component through `components.pulsar_manager`. Updated the values while keeping the resource settings.
- The monitoring values used a non-chart `monitoring.prometheus/grafana` block. Updated them to the chart's `kube-prometheus-stack` values.
- The broker anti-affinity snippet used `podAntiAffinity.zone`, which is not a Pulsar chart value. Replaced it with `broker.affinity.anti_affinity` and `broker.affinity.anti_affinity_topology_key`.
- The JWT setup job created a single `pulsar-token-keys` secret, but chart 3.5.0 mounts `pulsar-token-symmetric-key` plus per-role token secrets named from `auth.superUsers`. Updated the job to generate the expected secrets and added the required ServiceAccount, Role, and RoleBinding.
- The Pulsar token commands passed the secret key path without the required `file://` URI form. Updated the token generation commands.
- The tenant setup job did not authenticate to Pulsar even though the chart enables JWT authentication. Added token mounting and `pulsar-admin` authentication parameters.
- Tenant creation omitted allowed clusters. Added `--allowed-clusters pulsar` to match the chart's default release/cluster name.
- The tiered storage snippet placed chart-supported S3 values directly under `broker.configData`. Updated it to use `broker.storageOffload`, which chart 3.5.0 maps into the broker configuration.
- The BookKeeper ServiceMonitor selector used `component: bookkeeper`, but the chart labels the BookKeeper service as `component: bookie`. Corrected the selector.
- The scaling section said BookKeeper data rebalancing is automatic. Clarified that new bookies take new ledger traffic and existing placement is handled separately through recovery/re-replication when needed.

## Review Notes
- Chart 3.5.0 deploys Pulsar appVersion 3.0.6, so the Pulsar utility images in the snippets were aligned to `apachepulsar/pulsar:3.0.6`.
- The guide still assumes the hook manifests are included in the Argo CD-managed source alongside the Helm chart. A future revision could show a complete multi-source Application or app-of-apps layout.
