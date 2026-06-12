# Validation Summary: How to Configure GitLab CI Runners on Kubernetes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- GitLab Runner
- GitLab CI/CD
- GitLab Runner Kubernetes executor
- GitLab Runner Helm chart
- GitLab Runner Operator
- Kubernetes
- Helm
- KEDA
- Prometheus
- Kubernetes HPA
- Kubernetes RBAC, NetworkPolicy, ResourceQuota, LimitRange, and Pod Security Standards
- Docker-in-Docker and Kaniko

## Sources Consulted
- GitLab Runner Helm chart documentation: https://docs.gitlab.com/runner/install/kubernetes/
- GitLab Runner Helm chart configuration documentation: https://docs.gitlab.com/runner/install/kubernetes_helm_chart_configuration/
- GitLab Runner chart values.yaml: https://gitlab.com/gitlab-org/charts/gitlab-runner/-/raw/main/values.yaml
- GitLab Runner Operator install documentation: https://docs.gitlab.com/runner/install/operator/
- GitLab Runner Operator configuration documentation: https://docs.gitlab.com/runner/configuration/configuring_runner_operator/
- GitLab Runner Kubernetes executor documentation: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner monitoring documentation: https://docs.gitlab.com/runner/monitoring/
- GitLab runner creation workflow migration documentation: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.20/scalers/prometheus/
- Kubernetes HPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The post showed installing the GitLab Runner Operator from the GitLab Helm repository. The official operator installation path is OperatorHub/OLM, so the example was corrected to point to OperatorHub and cert-manager prerequisites.
- The Operator Runner custom resource used inline `spec.config` TOML. The operator expects `config` to reference a ConfigMap for custom templates, so the basic example was changed to use `buildImage` and the token secret.
- The post centered legacy registration tokens and `runnerRegistrationToken`. Current GitLab docs recommend runner authentication tokens and the Helm `runnerToken` value, so Helm commands, values, and token-secret examples were updated.
- The production Helm values used invalid or obsolete top-level keys such as `runnerTags` and `untagged`. These were removed, and RBAC/service account creation plus `runners.secret` were added.
- The Docker-in-Docker service image was `docker`, which is not the DinD daemon image. It was changed to `docker:24.0-dind`, and the host Docker socket comment was corrected to reflect its security risk.
- The Kaniko and secrets examples used unsupported `secret_name` and projected volume syntax for GitLab Runner Kubernetes executor volumes. They were changed to supported `[[runners.kubernetes.volumes.secret]]` configuration.
- The resource override example omitted the required `*_overwrite_max_allowed` settings. Those maximums were added because GitLab Runner ignores per-job override variables unless the corresponding maximum is configured.
- The Pod Security example enforced `restricted` by default, which can reject common CI images unless security contexts are configured. It now enforces `baseline` and audits/warns on `restricted`.
- The NetworkPolicy selected a non-standard `app: gitlab-runner-job` label. It now selects GitLab Runner job pods using the documented `job.runner.gitlab.com/pod` label.
- The KEDA and Grafana examples used non-portable or undocumented runner metric names such as `gitlab_runner_jobs{state="pending"}`. They now use metrics shown in GitLab Runner monitoring documentation.
- A troubleshooting command attempted to find runner tags in Kubernetes pod YAML. Runner tags are GitLab metadata, so the guidance now directs readers to check the runner settings in GitLab.
- Two markdown headings were missing `##` / `###` markers. They were corrected as part of making the technical sections render correctly.

## Review Notes
- GitLab Runner metric availability can vary by runner version and configuration. Operators should confirm exact names from the `/metrics` endpoint before building dashboards or autoscaling rules.
- Scaling directly on GitLab pending job queue depth usually requires GitLab API data or a custom/exporter metric, not only the built-in runner metrics endpoint.
- Helm was not installed in the local review environment, so Helm CLI behavior was verified against official Helm and GitLab documentation rather than local `helm --help` output.
