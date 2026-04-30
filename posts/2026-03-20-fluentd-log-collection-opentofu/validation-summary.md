# Validation Summary: How to Deploy Fluentd Log Collection with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Fluentd
- Fluent Helm chart
- Kubernetes
- Amazon EKS IRSA
- AWS IAM
- Amazon CloudWatch Logs
- Amazon EC2 launch templates

## Sources Consulted
- Fluent Helm chart repository: https://github.com/fluent/helm-charts
- Fluent Helm chart values and templates: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/values.yaml
- Fluent Helm chart ConfigMap template: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/templates/fluentd-configurations-cm.yaml
- Fluent Helm chart helpers and pod template: https://raw.githubusercontent.com/fluent/helm-charts/main/charts/fluentd/templates/_helpers.tpl
- Fluent Helm chart index: https://fluent.github.io/helm-charts/index.yaml
- Fluentd Kubernetes deployment docs: https://docs.fluentd.org/container-deployment/kubernetes
- Fluentd config file syntax: https://docs.fluentd.org/configuration/config-file
- Fluentd parser filter docs: https://docs.fluentd.org/filter/parser
- Fluentd `none` parser docs: https://docs.fluentd.org/parser/none
- Fluentd CloudWatch Logs plugin README: https://github.com/fluent-plugins-nursery/fluent-plugin-cloudwatch-logs
- Amazon EKS IRSA guide: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Fluent Package RPM install docs: https://docs.fluentd.org/installation/install-fluent-package/install-by-rpm-fluent-package
- Fluent Package download page: https://www.fluentd.org/download/fluent_package/
- td-agent v4 EOL install docs: https://docs.fluentd.org/installation/obsolete-installation/treasure-agent-v4-eol-installation/install-by-rpm-td-agent-v4

## Issues Found
- The Helm release was still using the chart’s default Elasticsearch-oriented image path and environment assumptions while the post’s Fluentd configuration used the CloudWatch output plugin. I changed the release to `variant = "cloudwatch"` and removed the Elasticsearch-specific values so the image and config now match.
- The Helm chart was not wired to the separately defined ConfigMap or IRSA-enabled service account, so the custom Fluentd config and IAM role would not actually be used by the deployed pods. I connected them with `mainConfigMapNameOverride` and `serviceAccount.create = false` / `serviceAccount.name = ...`.
- The post relied on Helm to create the `logging` namespace, but the `kubernetes_config_map` and `kubernetes_service_account` resources also needed that namespace before Helm could run. I added an explicit `kubernetes_namespace` resource and pointed all Kubernetes resources at it.
- `replicaCount` was set even though the official Fluentd chart only applies that setting to `Deployment` and `StatefulSet`, not `DaemonSet`. I removed it.
- The container log source parsed `/var/log/containers/*.log` as JSON only. Current Kubernetes container logs commonly use CRI text format, and the official chart’s default config uses a multi-format parser for that reason. I replaced the source parser with JSON + CRI regex parsing and enabled `emit_unmatched_lines`.
- The CloudWatch output used `log_stream_name_key stream`, which would only separate streams by `stdout` / `stderr`. I changed it to `use_tag_as_stream true`, matching the official CloudWatch daemonset behavior.
- The IRSA trust policy omitted the `aud = sts.amazonaws.com` condition shown in the official EKS documentation, and the snippet referenced `data.aws_caller_identity.current` without declaring it. I added both.
- The EC2 section used deprecated `td-agent` v4 installation commands, paths, and service names. I updated it to the current `fluent-package` installer, config path, gem command, position file path, and `fluentd` systemd service.

## Review Notes
- The EC2 example now assumes an Amazon Linux 2023 AMI because the current official `fluent-package` rpm installer targets that platform.
- The official Fluentd Helm chart currently publishes version `0.5.3`; its app version still lags newer Fluentd package releases, so future updates should re-check the chart before publishing.
