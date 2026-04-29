# Validation Summary: How to Deploy Loki Stack on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- Kubernetes
- Grafana Loki Helm chart
- Grafana Alloy Helm chart
- Grafana data source provisioning
- AWS S3
- AWS IAM / EKS IRSA

## Sources Consulted
- Grafana Loki Helm chart `5.47.0` values: https://github.com/grafana/helm-charts/releases/download/helm-loki-5.47.0/loki-5.47.0.tgz
- Grafana Alloy Helm chart `1.8.0` values: https://github.com/grafana/helm-charts/releases/download/alloy-1.8.0/alloy-1.8.0.tgz
- Grafana chart `10.5.15` values for datasource sidecar labels: https://github.com/grafana/helm-charts/releases/download/grafana-10.5.15/grafana-10.5.15.tgz
- Grafana Loki docs, Configure storage: https://grafana.com/docs/loki/latest/setup/install/helm/configure-storage/
- Grafana Loki docs, Install the monolithic Helm chart: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki docs, Storage schema: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki docs, Log retention: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki docs, Storage: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki docs, Promtail service discovery / deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/scraping/
- Grafana Loki docs, Promtail labels stage / deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Alloy docs, Deploy Grafana Alloy on Kubernetes: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy docs, Collect Kubernetes logs and forward them to Loki: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Grafana docs, Provision Grafana: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Amazon EKS docs, Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Terraform AWS provider docs, `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- OpenTofu docs, `yamlencode`: https://opentofu.org/docs/language/functions/yamlencode/

## Issues Found
- The Loki Helm example mixed newer chart keys with the pinned Loki chart version `5.47.0`. `deploymentMode`, nested `singleBinary.serviceAccount`, and `grafana.enabled` were not valid for that chart, while `loki.storage.bucketNames` and top-level `serviceAccount` were. I rewrote the values block to match the pinned chart and added `commonConfig.replication_factor = 1` for single-replica Loki.
- The retention example would not have enforced log deletion as written. Loki retention for TSDB requires the compactor with `retention_enabled` and `delete_request_store`, and Grafana recommends any object-store lifecycle policy be longer than Loki retention. I added the compactor settings and changed the S3 lifecycle rule to 35 days with an explicit `filter {}`.
- The IAM trust policy was missing the `aud` condition that AWS documents for EKS IRSA roles. I added the `sts.amazonaws.com` audience condition.
- The post recommended Promtail after its documented EOL date of March 2, 2026. I replaced the collector section with Grafana Alloy using the official Helm chart and Kubernetes log collection pattern.
- The Grafana datasource ConfigMap was presented as if it would always be consumed automatically. In practice this approach depends on Grafana running the datasources sidecar that watches `grafana_datasource` ConfigMaps. I clarified that requirement and removed the hard-coded Tempo derived field, which depended on an external datasource UID that the post never provisioned.
- The summary overstated Loki’s storage behavior by implying costs scale only with label combinations and not log volume. I corrected the explanation to reflect that Loki avoids full-text indexing but still stores compressed log payloads in object storage.

## Review Notes
- The post is now accurate for the pinned Loki chart `5.47.0`, but current Loki Helm documentation mainly describes the newer community-maintained chart line, where some values differ.
- Grafana recommends enabling object versioning when retention-driven deletion is enabled, so readers deploying this in production may want to add S3 versioning as an operational safeguard.
