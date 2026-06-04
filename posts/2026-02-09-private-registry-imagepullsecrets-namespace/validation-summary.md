# Validation Summary: How to Configure Private Registry Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kubernetes ImagePullSecrets
- Kubernetes ServiceAccounts
- kubectl
- External Secrets Operator
- Azure Key Vault
- Docker CLI
- Prometheus / kubelet metrics
- kube-state-metrics

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes private registry image pull task: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- kubectl `create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/v2.4.1/provider/azure-key-vault/
- External Secrets Operator Kubernetes Secret types guide: https://external-secrets.io/v0.10.4/guides/common-k8s-secret-types/
- Docker `docker login` CLI reference: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The ServiceAccount Deployment example used `apps/v1` but omitted the required `spec.selector` and matching pod template labels. Added `replicas`, `selector.matchLabels`, and `template.metadata.labels`.
- The External Secrets Operator example used the older `external-secrets.io/v1beta1` API and omitted the Azure Key Vault `tenantId` required for service principal authentication. Updated the resources to `external-secrets.io/v1` and added `tenantId`.
- The Docker Hub registry Secret used `docker.io` as the registry server. Updated it to Kubernetes' documented Docker Hub registry value, `https://index.docker.io/v1/`.
- The credential rotation script deleted and renamed Secrets using `sed` over full Kubernetes YAML, which can fail because exported resources include server-managed metadata and creates an avoidable gap. Replaced it with an in-place `kubectl create secret docker-registry ... --dry-run=client -o yaml | kubectl apply -f -` update.
- The Docker credential test used `docker login -p`, which is valid but exposes the password through command history or logs. Updated it to use `--password-stdin` per Docker CLI guidance.
- The monitoring ConfigMap referenced nonexistent kubelet metrics `kubelet_image_pull_errors_total` and a nonexistent `reason` label. Replaced the failed-pull query with `kubelet_runtime_operations_errors_total{operation_type="pull_image"}` and used `kube_pod_container_status_waiting_reason` for pod image pull waiting states.

## Review Notes
- The Kubernetes Secret and ImagePullSecret examples are namespace-scoped as required; image pull secrets must be in the same namespace as the Pod or ServiceAccount that references them.
- The monitoring query for `kube_pod_container_status_waiting_reason` requires kube-state-metrics in addition to kubelet metrics.
