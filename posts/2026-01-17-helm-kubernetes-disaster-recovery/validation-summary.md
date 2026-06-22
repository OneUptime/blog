# Validation Summary: Disaster Recovery Strategies with Helm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes Deployments, Jobs, CronJobs, ConfigMaps, and PrometheusRule resources
- Velero backup and restore
- ExternalDNS with AWS Route53
- AWS Route53 health checks and failover records
- Bitnami PostgreSQL Helm chart replication and standby settings
- CockroachDB Helm chart multi-region/operator settings
- Prometheus and Grafana monitoring

## Sources Consulted
- Velero Helm chart values: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- Velero Restore API documentation: https://velero.io/docs/main/api-types/restore/
- Velero restore reference: https://velero.io/docs/main/restore-reference/
- Velero release documentation noting the distroless image base: https://velero.io/docs/main/release-instructions/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- ExternalDNS AWS tutorial and Route53 routing annotations: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- AWS Route53 CreateHealthCheck API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_CreateHealthCheck.html
- AWS CLI Route53 create-health-check reference: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- CockroachDB Helm chart values: https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/values.yaml

## Issues Found
- The DR strategy table claimed Active-Active provides zero RTO and zero RPO. Changed this to near-zero because real active-active systems can reduce recovery objectives substantially but do not guarantee literal zero data loss or interruption in all failure modes.
- The Velero restore Job used the official `velero/velero:v1.12.0` image with `/bin/sh` and `jq`. Current Velero release documentation identifies the image as distroless, so the shell-based script would not run. Reworked the job to use `bitnami/kubectl`, select the latest Velero Backup CR, create a Velero Restore CR, wait for completion, and verify with `kubectl get`.
- The restore script described a restore named `$BACKUP-restore` without actually creating that name. Added `RESTORE_NAME` and used it consistently.
- The Bitnami PostgreSQL DR standby values used non-current keys (`standbyMode`, `primaryHost`, `primaryPort` directly under `primary`). Updated them to the documented `primary.standby.enabled`, `primary.standby.primaryHost`, and `primary.standby.primaryPort` structure.
- The `kubectl annotate` examples would fail if the annotation already existed. Added `--overwrite` where annotations are used as state toggles.
- The ExternalDNS examples used older alpha annotation prefixes. Updated them to the current `external-dns.kubernetes.io/*` annotations documented for Route53 routing policies.
- The CockroachDB example used unsupported chart keys (`localities` and `geo`). Updated it to use documented CockroachDB chart operator and `cockroachdb.regions` values, and corrected the network policy shape to `ingress.grpc` and `ingress.http`.
- The failover controller Deployment was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added both.
- The ExternalDNS `--aws-evaluate-target-health` flag was shown without an explicit boolean value. Updated it to `--aws-evaluate-target-health=true`.
- The Route53 health check and failover record JSON did not match AWS API/CLI request shapes. Updated the health check payload to include `CallerReference` and `HealthCheckConfig`, and the failover record payload to use a `Changes` list with a `ResourceRecordSet` and required alias target fields.
- The DR test Helm template emitted an unquoted environment variable value. Added Helm's `quote` filter to keep the rendered Kubernetes manifest valid for string values.

## Review Notes
Several snippets are still illustrative and depend on chart-specific application values, custom images, RBAC, credentials, and cloud infrastructure. They are now technically aligned with the referenced upstream APIs and chart value structures, but production use would still require environment-specific testing, pinned image versions, IAM/RBAC configuration, and failover runbooks.
