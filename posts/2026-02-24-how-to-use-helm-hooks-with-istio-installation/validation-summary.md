# Validation Summary: How to Use Helm Hooks with Istio Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm hooks
- Istio
- Kubernetes
- Kubernetes Jobs
- Kubernetes RBAC
- kubectl
- istioctl

## Sources Consulted
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio 1.24 release announcement and Kubernetes support statement: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/
- Istio supported releases table: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Istio 1.24.0 chart source checked for hook annotations: https://github.com/istio/istio/tree/1.24.0/manifests/charts

## Issues Found
- The post said Istio's own Helm charts already include hooks internally. I checked the Istio 1.24.0 chart templates for `helm.sh/hook` annotations and did not find built-in chart hooks, so I changed the sentence to say the official charts manage Istio resources and custom hooks can be added in a wrapper chart.
- The hook type list omitted Helm's `test` hook. I added `test`, which runs when `helm test` is executed.
- The pre-install Kubernetes version check required Kubernetes 1.25+, but the wrapper chart example uses Istio 1.24.0, which officially supports Kubernetes 1.28 through 1.31. I updated the gate to require Kubernetes 1.28+.
- The pre-install version parsing used Python against `kubectl version -o json`; the `bitnami/kubectl` image should not be assumed to include Python, and Kubernetes minor versions can include suffixes such as `+`. I changed the command to use kubectl JSONPath and strip nonnumeric suffixes with `sed`.
- The pre-upgrade backup hook accumulated resource YAML in `BACKUP_DATA` but never stored it in the ConfigMap. I added `--from-literal=resources="$BACKUP_DATA"` so the backup data is actually persisted.

## Review Notes
- The examples use separate ServiceAccount names for later hook Jobs but only show RBAC for the pre-install check. The post later tells readers to include proper RBAC, which is correct, but future improvements could add explicit scoped RBAC examples for the validation, backup, health-check, and cleanup Jobs.
- The wrapper chart example uses Istio 1.24.0, which is no longer a currently supported Istio release as of this validation date. The example remains technically valid as a version-pinned sample, but readers should choose a supported Istio version for new production installs.
