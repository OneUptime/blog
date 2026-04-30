# Validation Summary: How to Deploy GitLab Runners on Kubernetes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitLab Runner
- GitLab Runner Helm chart
- Kubernetes
- Helm
- AWS IAM Roles for Service Accounts (IRSA)
- Prometheus metrics
- Horizontal Pod Autoscaler

## Sources Consulted
- GitLab Runner Helm chart install docs: https://docs.gitlab.com/runner/install/kubernetes/
- GitLab Runner Helm chart configuration docs: https://docs.gitlab.com/runner/install/kubernetes_helm_chart_configuration/
- GitLab Kubernetes executor docs: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab new runner creation workflow docs: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Runner monitoring docs: https://docs.gitlab.com/runner/monitoring/
- GitLab Runner chart values for `v0.62.0`: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/v0.62.0/values.yaml
- GitLab Runner chart registration template for `v0.62.0`: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/v0.62.0/templates/configmap.yaml
- GitLab Runner chart secret template for `v0.62.0`: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/v0.62.0/templates/secrets.yaml
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- HashiCorp Kubernetes provider docs for `kubernetes_horizontal_pod_autoscaler_v2`: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/horizontal_pod_autoscaler_v2.md

## Issues Found
- The post used the deprecated runner registration-token flow and an unsupported `existingSecret` Helm value. I changed the example to use a runner authentication token in `runner-token`, left `runner-registration-token` empty for chart compatibility, and switched the chart configuration to `runners.secret`.
- The post set Kubernetes executor options in unsupported Helm values such as `runners.kubernetes` and JSON-encoded node selectors and tolerations. I moved those settings into `runners.config` TOML and corrected the GitLab Runner syntax for `node_selector` and `node_tolerations`.
- The post set runner tags in `values.yaml`, but GitLab documents that registration-time settings such as tags are ignored when using runner authentication tokens. I removed that line from the example.
- The S3 cache example paired IRSA with S3 caching but omitted the cache authentication mode. I added `AuthenticationType = "iam"` so the example matches GitLab’s documented AWS credential-chain behavior.
- The service-account example granted `cluster-admin`. I replaced it with a namespace-scoped `Role` and `RoleBinding` pattern aligned with GitLab Runner’s documented Kubernetes executor permissions and configured the chart to use that existing service account.
- The custom pod template snippet used invalid TOML for `pod_annotations` and did not make clear that it should be passed through `runners.config`. I corrected the TOML table syntax and clarified its intended use.
- The HPA snippet omitted the requirement for a metrics adapter. I added a note that the custom metric must be exposed through Kubernetes aggregated metrics APIs before the autoscaler can use it.

## Review Notes
- The post pins GitLab Runner Helm chart `0.62.0`, which GitLab maps to GitLab Runner `16.9.0`. The examples were corrected to stay valid for that pinned chart version, but the version is older than current chart releases.
- The runner manager HPA is optional. The Kubernetes executor already creates one ephemeral job pod per CI job; the HPA only applies to the long-lived runner manager deployment.
