# Validation Summary: How to Send Logs to CloudWatch from Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Logging
- Kubernetes
- Logging Operator / Fluentd
- Amazon CloudWatch Logs
- Amazon EKS IRSA
- AWS CLI

## Sources Consulted
- Rancher docs, "Outputs and ClusterOutputs": https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Rancher docs, "Logging Architecture": https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging/logging-architecture
- Rancher chart source, root logging template: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/templates/loggings/root/logging.yaml
- Rancher chart source, values for `loggingServiceAccountAnnotations`: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-logging/108.0.4%2Bup4.10.0-rancher.23/values.yaml
- Logging Operator CloudWatch output docs: https://kube-logging.dev/4.3/docs/configuration/plugins/outputs/cloudwatch/
- Logging Operator buffer docs: https://kube-logging.dev/6.0/docs/configuration/plugins/outputs/buffer/
- Fluent plugin CloudWatch Logs README: https://github.com/fluent-plugins-nursery/fluent-plugin-cloudwatch-logs
- Fluentd buffer section docs: https://docs.fluentd.org/configuration/buffer-section
- Fluentd output plugin API docs (`extract_placeholders` and chunk metadata): https://docs.fluentd.org/plugin-development/api-plugin-output
- Amazon EKS, "Assign IAM roles to Kubernetes service accounts": https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS, "Use IRSA with the AWS SDK": https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html
- Amazon EKS / eksctl IRSA docs: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI, `put-retention-policy`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html
- AWS CLI, `put-metric-filter`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-metric-filter.html
- CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html

## Issues Found
- The IRSA example annotated the wrong Fluentd service account name. Rancher’s chart creates a root logging resource named `rancher-logging-root`, and the Logging Operator names the Fluentd service account and StatefulSet from that logging resource, so I corrected the example to use `rancher-logging-root-fluentd`.
- The IRSA example did not account for existing Fluentd pods already running before the service account annotation was added. Because EKS injects IRSA credentials into pods via admission at pod creation time, I added a `kubectl rollout restart` for the Fluentd StatefulSet so the change is applied.
- The IRSA `ClusterOutput` used `cloudwatch-irsa-output`, but the later `ClusterFlow` still referenced `cloudwatch-output`. I renamed the IRSA output to `cloudwatch-output` so the tutorial works end-to-end without a broken reference.
- The per-namespace log-group example used `${$.kubernetes.namespace_name}` and `${$.kubernetes.pod_name}` placeholders without defining matching Fluentd buffer chunk keys. Fluentd placeholder expansion uses chunk metadata, so I added `buffer.tags: "$.kubernetes.namespace_name,$.kubernetes.pod_name"` to make that example work as written.
- The prerequisites listed fewer IAM permissions than the CloudWatch output actually relies on. The plugin checks for existing log groups and streams, so I aligned the prerequisite permissions with `DescribeLogGroups` and `DescribeLogStreams` as well.
- The retention-period list was incomplete. AWS currently allows additional valid values including `1096`, `2192`, `2557`, `2922`, and `3288`, so I updated the list to match the AWS CLI reference.
- The post referred to "CloudWatch Insights" instead of the specific log-query feature name, "CloudWatch Logs Insights". I corrected the product naming in the intro, query section, and summary.
- The Logs Insights example block was marked as `bash` even though it is Logs Insights query language, not a shell command. I changed the code fence to `text`.
- The `aws logs get-log-events` verification example used a hard-coded stream name that did not match the earlier configurations reliably. I changed it to an explicit placeholder so readers use one of their actual stream names.

## Review Notes
- The manual IRSA annotation flow is valid, but Rancher’s chart also supports setting Fluentd service account annotations at install time through `loggingServiceAccountAnnotations.root`.
- The CloudWatch output examples still rely on the legacy `logging.banzaicloud.io/v1beta1` CRDs used by Rancher Logging and the Logging Operator integration documented by Rancher at review time.
