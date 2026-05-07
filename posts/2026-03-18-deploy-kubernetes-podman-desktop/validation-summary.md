# Validation Summary: How to Deploy to Kubernetes from Podman Desktop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Desktop
- Kubernetes
- kubectl
- Kubernetes YAML manifests
- Container image registries

## Sources Consulted
- Podman `podman kube generate` documentation: https://docs.podman.io/en/stable/markdown/podman-kube-generate.1.html
- Podman Desktop deploying a pod or container to Kubernetes: https://podman-desktop.io/docs/kubernetes/deploying-a-pod-to-kubernetes
- Podman Desktop starting a container / generated Kubernetes YAML: https://podman-desktop.io/docs/containers/starting-a-container
- Podman Desktop Kubernetes overview: https://podman-desktop.io/docs/kubernetes
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The post used the older `podman generate kube` command. Updated the examples to the current documented `podman kube generate` command.
- The Podman Desktop UI steps described selecting a direct button and reviewing YAML in an editor. Updated the steps to match the documented overflow-menu workflow, context selection, optional namespace selection, and optional local service exposure.
- The `kubectl describe`, `kubectl logs`, and cleanup examples used `my-web-app` as the pod name, but current Podman examples generate a pod name and label with a `-pod` suffix for a container-generated pod. Updated the commands to use `my-web-app-pod`.
- The manually written Service selector used `app: my-web-app`, which would not match the current generated pod label shown in Podman examples. Updated it to `app: my-web-app-pod`.
- The registry example tagged and substituted `my-app:latest`, which was not the image used earlier in the tutorial. Updated it to tag `nginx:alpine` and replace the generated `docker.io/library/nginx:alpine` image reference.
- The post stated generated YAML typically creates pods but not services. Clarified that `podman kube generate` creates a pod by default and can include a Service with `--service`.
- The troubleshooting event command sorted by `.lastTimestamp`, while the current Kubernetes quick reference recommends sorting Events by `.metadata.creationTimestamp`. Updated the command accordingly.

## Review Notes
The examples assume the user has a reachable Kubernetes cluster, a working metrics pipeline for `kubectl top pods`, and permission to push to the chosen registry namespace. These are valid operational prerequisites rather than technical errors.
