# Validation Summary: How to Install Flux CD on Docker Desktop Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Desktop Kubernetes
- Flux CD / Flux CLI
- Kubernetes manifests
- Flux `GitRepository` and `Kustomization` custom resources
- GitHub bootstrap workflow
- Docker local image workflows

## Sources Consulted
- Docker Desktop Kubernetes documentation: https://docs.docker.com/desktop/use-desktop/kubernetes/
- Docker Desktop containerd image store documentation: https://docs.docker.com/desktop/features/containerd/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `GitRepository` documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `Kustomization` API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `uninstall` CLI documentation: https://fluxcd.io/flux/cmd/flux_uninstall/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- Docker Desktop Kubernetes was described only as a built-in single-node cluster enabled with a toggle. Current Docker Desktop supports `kubeadm` single-node clusters and `kind` multi-node clusters, so the introduction, enablement steps, and expected node output were updated.
- The post claimed Docker Desktop always shares the Docker daemon between the host and Kubernetes, making locally built images immediately available. Current Docker Desktop behavior depends on the Kubernetes provisioner and image store, so the local image guidance was changed to call out `kubeadm`, `kind`, Docker image store, and containerd image store compatibility.
- The post claimed Docker Desktop Kubernetes uses the host network for `NodePort` and `LoadBalancer` services. This was softened to the accurate practical guidance that these service types can publish local-machine ports and may conflict with existing services.
- The conclusion repeated the outdated shared-Docker-daemon claim. It was updated to refer to Docker Desktop's local image-store integration instead.

## Review Notes
The Flux CLI commands, bootstrap flags, Flux CRD API versions, `GitRepository` and `Kustomization` field names, `flux uninstall --silent`, and Kubernetes `imagePullPolicy: Never` usage are consistent with current official documentation. The local podinfo example uses the upstream Flux documentation's `stefanprodan/podinfo` repository and `master` branch.
