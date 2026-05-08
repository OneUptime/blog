# Validation Summary: How to Deploy Podman Pods to Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Kubernetes Pods
- Kubernetes Deployments
- Kubernetes Services
- kubectl
- YAML

## Sources Consulted
- Podman `podman kube generate` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- Podman `podman generate` documentation: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman `podman pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Updated `podman generate kube` examples to `podman kube generate`, matching the current Podman documentation for generating Kubernetes YAML from containers, pods, and volumes.
- Replaced the manual Deployment wrapper example with `podman kube generate --type deployment --replicas 3 webapp > webapp-deployment.yaml`, because current Podman supports generating Deployment manifests directly with `--type deployment` and `--replicas`.
- Clarified that generated YAML includes "published ports, and any volume mounts" rather than implying volume mounts are always present in the example.

## Review Notes
The Kubernetes Deployment and Service examples use valid `apps/v1` and `v1` manifests with matching selectors and pod template labels. The registry push section is generic and assumes a custom local image exists before tagging and pushing.
