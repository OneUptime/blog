# Validation Summary: Resolve ImagePullBackOff Errors from Private Registry Authentication Failures

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Pods, Deployments, ServiceAccounts, Secrets, and CronJobs
- Kubernetes ImagePullSecrets and private registry authentication
- kubectl
- Amazon ECR
- Google Container Registry
- Azure Container Registry
- containerd registry configuration
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes image documentation, including Docker config interpretation and ImagePullBackOff behavior: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes ServiceAccount image pull secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#add-image-pull-secret-to-service-account
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- AWS CLI `ecr get-login-password` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- containerd CRI registry configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/registry.md
- containerd registry hosts configuration documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The ECR `kubectl create secret docker-registry` example used `--docker-password-stdin`, which is not a supported flag for `kubectl create secret docker-registry`. I changed it to pass the AWS ECR token through `--docker-password="$(aws ecr get-login-password --region us-east-1)"`.
- The ECR registry hostname used a 9-digit placeholder account ID. I changed it to a 12-digit AWS account ID placeholder.
- Two `apps/v1` Deployment examples omitted the required `.spec.selector` and matching pod template labels. I added matching selectors and `template.metadata.labels`.
- The ECR refresh CronJob used `amazon/aws-cli:latest` while running `kubectl`, which that image does not provide. I changed the example to a placeholder image that must include both AWS CLI and `kubectl`, and noted the required RBAC permissions.
- The registry credential matching explanation incorrectly said registry URLs are case-sensitive and must match exactly. I updated it to reflect Kubernetes' support for exact host matches, prefix-matched paths, and glob patterns in Docker config credentials.
- The containerd registry mirror example used deprecated `registry.mirrors` and `registry.configs` tables. I replaced it with the current `config_path` plus `hosts.toml` pattern and adjusted the text around pull-through cache behavior.

## Review Notes
The examples are otherwise technically consistent with current Kubernetes behavior. The cloud registry examples remain illustrative; production clusters may prefer cloud-native kubelet credential providers or managed identity integrations instead of periodically rewriting pull secrets.
