# Validation Summary: How to Configure Runner Auto-scaling in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI
- GitLab Runner
- Docker Machine executor
- Docker Autoscaler executor
- Kubernetes executor
- GitLab Runner Helm chart
- Kubernetes Cluster Autoscaler
- AWS EC2 / EKS
- Prometheus and Prometheus Operator ServiceMonitor

## Sources Consulted
- GitLab Runner Docker Machine autoscale configuration: https://docs.gitlab.com/runner/configuration/autoscale/
- GitLab Runner Docker Machine executor: https://docs.gitlab.com/runner/executors/docker_machine/
- GitLab Runner Docker Autoscaler executor: https://docs.gitlab.com/runner/executors/docker_autoscaler/
- GitLab Runner advanced configuration: https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Runner Kubernetes executor: https://docs.gitlab.com/runner/executors/kubernetes/
- GitLab Runner Helm chart installation: https://docs.gitlab.com/runner/install/kubernetes/
- GitLab Runner Helm chart configuration: https://docs.gitlab.com/runner/install/kubernetes_helm_chart_configuration/
- GitLab Runner registration workflow migration: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Runner monitoring: https://docs.gitlab.com/runner/monitoring/
- Kubernetes Cluster Autoscaler AWS documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html

## Issues Found
- Docker Machine was presented as the current primary autoscaling approach. Updated the architecture text to identify Docker Autoscaler as the current cloud VM autoscaling executor and Docker Machine as deprecated and scheduled for removal in GitLab 20.0.
- The Docker Machine installation section omitted Docker Engine and GitLab's Docker Machine fork, both required for Docker Machine autoscaling. Added a note to the install snippet.
- Runner registration used the legacy `--registration-token` workflow. Updated the command to use `--token` with a runner authentication token.
- The Docker Machine `MaxBuilds` comment incorrectly described it as a scale-up instance limit. Changed the comment to explain that it controls how many jobs a machine runs before removal, and added `limit = 50` as the runner-level concurrency/machine cap.
- The Helm chart example used deprecated `runnerRegistrationToken`. Updated it to `runnerToken` and added `rbac.create: true`, matching current Helm chart requirements.
- The Kubernetes executor configuration had an invalid TOML shape for `node_tolerations`. Replaced the array-of-tables form with the documented table form.
- The Helm chart example enabled privileged mode at the chart level but not inside the embedded runner TOML. Added `privileged = true` under `[runners.kubernetes]`.
- The Cluster Autoscaler Deployment example lacked the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added both.
- The autoscaling flow incorrectly showed provisioned VMs or pods registering with GitLab. Changed that step to preparing the job environment, because the runner manager is the registered runner.
- The monitoring section listed non-current or unsupported runner metrics and used a nonexistent `gitlab_runner_jobs_queued` alert expression. Replaced these with documented runner metrics and a saturation alert based on `gitlab_runner_request_concurrency_exceeded_total`.
- The Kubernetes RBAC example was too broad in some places and incomplete in others. Updated it to reflect the Kubernetes executor resources and verbs documented by GitLab Runner.

## Review Notes
Docker Machine examples are still valid only as legacy guidance. For new cloud VM autoscaling deployments, GitLab recommends Docker Autoscaler with Fleeting plugins instead of Docker Machine.
