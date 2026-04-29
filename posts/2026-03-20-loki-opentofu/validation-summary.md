# Validation Summary: How to Deploy Loki with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- Grafana Loki
- Grafana Alloy
- Kubernetes
- Helm
- Amazon S3
- Amazon EKS IRSA / IAM
- Grafana

## Sources Consulted
- Grafana Loki Helm monolithic install docs: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki Helm storage configuration docs: https://grafana.com/docs/loki/latest/setup/install/helm/configure-storage/
- Grafana Loki storage schema docs: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki storage and S3 permissions docs: https://grafana.com/docs/loki/latest/configure/storage/ and https://grafana.com/docs/loki/latest/operations/storage/
- Grafana Alloy Kubernetes install docs: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy Kubernetes log collection docs: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Promtail install docs with deprecation/EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Amazon EKS IRSA trust policy docs: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS IAM roles for service accounts overview: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Grafana Community Helm chart index: https://grafana-community.github.io/helm-charts/index.yaml
- Grafana Helm chart index: https://grafana.github.io/helm-charts/index.yaml

## Issues Found
- The post recommended Promtail for a new deployment even though Promtail reached end-of-life on March 2, 2026. I replaced the Promtail Helm example with a current Grafana Alloy DaemonSet example that uses `loki.write`, `discovery.kubernetes`, `discovery.relabel`, `loki.source.kubernetes`, and `loki.process`.
- The Loki Helm snippet used outdated chart coordinates and incomplete monolithic-mode values. I updated it to the current community Loki chart (`13.4.1`), switched the repo to `https://grafana-community.github.io/helm-charts`, set `deploymentMode = "Monolithic"`, added `commonConfig.replication_factor`, and zeroed the other deployment-mode replica counts so the chart configuration is internally valid.
- The Loki schema configuration used `schema_config` under Helm values and set `schema = "v12"`. For the Helm chart, the values key is `schemaConfig`, and the current recommended TSDB schema for new installs is `v13`, so I corrected both and updated the `from` date to a current documented past date.
- The retention example only set `limits_config.retention_period`, which does not enable retention-driven deletion by itself. I added `loki.compactor.retention_enabled = true` and `delete_request_store = "s3"` so the retention example matches Loki’s documented compactor-based retention model.
- The IRSA trust policy omitted the `aud` condition recommended by AWS for `sts:AssumeRoleWithWebIdentity`, and the S3 IAM statement mixed bucket-level and object-level actions in one block. I added the `:aud = "sts.amazonaws.com"` condition and split the S3 permissions into bucket-scoped and object-scoped statements.

## Review Notes
- The current Loki community chart uses `deploymentMode: Monolithic`, but the component key remains `singleBinary`; `SingleBinary` is now a deprecated alias rather than the preferred name.
- The Alloy example assumes the Helm release runs in the same namespace as Loki, so `http://loki-gateway/loki/api/v1/push` resolves correctly through in-cluster DNS.
- The IRSA trust-policy example assumes `var.oidc_provider_url` contains the issuer host/path without the `https://` prefix, which matches AWS’s documented trust-policy key format.
