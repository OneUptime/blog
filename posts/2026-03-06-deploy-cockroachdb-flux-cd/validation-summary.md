# Validation Summary: How to Deploy CockroachDB with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CockroachDB
- CockroachDB Helm chart
- Flux CD
- Kubernetes
- cert-manager
- Prometheus Operator ServiceMonitor
- AWS S3 backups

## Sources Consulted
- CockroachDB Helm chart documentation and current chart metadata: https://github.com/cockroachdb/helm-charts/tree/master/cockroachdb
- CockroachDB Helm chart values and templates: https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/values.yaml
- CockroachDB certificate management for Kubernetes: https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes
- CockroachDB Kubernetes deployment guidance: https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-kubernetes
- CockroachDB BACKUP and S3 authentication documentation: https://www.cockroachlabs.com/docs/stable/backup and https://www.cockroachlabs.com/docs/stable/cloud-storage-authentication
- CockroachDB CLI documentation for `cockroach sql` and `cockroach node status`: https://www.cockroachlabs.com/docs/stable/cockroach-sql and https://www.cockroachlabs.com/docs/stable/cockroach-node
- CockroachDB cluster settings reference: https://www.cockroachlabs.com/docs/stable/cluster-settings
- cert-manager Certificate API documentation: https://cert-manager.io/docs/reference/api-docs/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository and Kustomization documentation: https://fluxcd.io/flux/components/source/helmrepositories/ and https://fluxcd.io/flux/components/kustomize/kustomizations/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The repository structure listed `client-secret.yaml`, but the post creates `backup.yaml` and `monitoring.yaml` instead. Updated the tree to match the files used by the tutorial.
- The monitoring manifest uses a `ServiceMonitor`, which requires Prometheus Operator CRDs. Added Prometheus Operator to the prerequisites.
- The cert-manager node certificate placed `127.0.0.1` under `dnsNames` and did not include the node common name in SANs. Moved `127.0.0.1` to `ipAddresses` and added `node` to `dnsNames`.
- The CockroachDB Helm chart version was pinned to the outdated `13.x` range. Updated it to `20.x`, matching the current official chart major version.
- The `statefulset.topologySpreadConstraints` value used Kubernetes list syntax, but the CockroachDB chart expects an object with `maxSkew`, `topologyKey`, and `whenUnsatisfiable`. Updated the values accordingly.
- The service port overrides were placed under `service.public.ports`, which the current chart does not consume. Moved them to `service.ports`.
- The `init.provisioning.grants` block is not supported by the CockroachDB Helm chart. Replaced it with the chart-supported `databases[].owners` setting for `app_user`.
- The backup CronJob used an older CockroachDB image tag. Updated it to `cockroachdb/cockroach:v26.1.4` to match the current chart app version.

## Review Notes
The post remains a valid GitOps tutorial after the fixes. For production use, the inline application and S3 passwords should be replaced with a secret-management workflow, and AWS backup credentials in URI parameters should be URL-encoded or replaced with IAM-based implicit authentication where possible.
