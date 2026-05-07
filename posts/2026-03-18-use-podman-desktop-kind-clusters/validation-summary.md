# Validation Summary: How to Use Podman Desktop with Kind Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kind
- Podman
- Podman Desktop
- Kubernetes
- kubectl
- ingress-nginx

## Sources Consulted
- Kind Quick Start: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kind Rootless guide: https://kind.sigs.k8s.io/docs/user/rootless/
- Kind Configuration guide: https://kind.sigs.k8s.io/docs/user/configuration/
- Kind Ingress guide: https://kind.sigs.k8s.io/docs/user/ingress/
- Podman Desktop Kind cluster creation: https://podman-desktop.io/docs/kind/creating-a-kind-cluster
- Podman Desktop Kind CLI installation: https://podman-desktop.io/docs/kind/installing
- Podman Desktop working with Kind clusters: https://podman-desktop.io/docs/kind/working-with-your-local-kind-cluster
- Podman `save` reference: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- Podman `info` reference: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- ingress-nginx deployment guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Kind manifest checked in use by the post: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
- Kind upstream runtime selection implementation: https://github.com/kubernetes-sigs/kind/blob/main/pkg/internal/runtime/runtime.go
- Kind upstream `delete clusters` implementation: https://github.com/kubernetes-sigs/kind/blob/main/pkg/cmd/kind/delete/clusters/deleteclusters.go
- Kind upstream `export kubeconfig` implementation: https://github.com/kubernetes-sigs/kind/blob/main/pkg/cmd/kind/export/kubeconfig/kubeconfig.go
- Kind upstream `load image-archive` implementation: https://github.com/kubernetes-sigs/kind/blob/main/pkg/cmd/kind/load/image-archive/image-archive.go

## Issues Found
- The macOS direct-download example for Kind pointed to the Linux binary (`kind-linux-amd64`). I replaced it with the correct current macOS binaries for Intel and Apple Silicon from the official Kind installation guide.
- The post stated that Kind "needs to know" to use Podman. Current Kind documentation shows runtime auto-detection for Docker, Podman, and nerdctl, so I revised the wording to explain that `KIND_EXPERIMENTAL_PROVIDER=podman` is an explicit override, not a hard requirement.
- The Podman Desktop UI navigation was outdated. The post referenced `Settings` and a Kubernetes section, but current Podman Desktop documentation uses `Settings > Resources`, then the Kind tile and `Create new ...`.
- The multi-node Kind config mapped host ports `80` and `443`. Kind's rootless Podman guidance warns that privileged host ports are not the safe default there, so I changed the host mappings to `8080` and `8443` and noted why.
- The `podman save` example used a loose argument order. I updated it to the documented form `podman save -o my-app.tar my-app:latest` and normalized the `kind load image-archive` example to the documented flag order.

## Review Notes
- The ingress-nginx Kind manifest and readiness selector used in the post are still valid as of the review date.
- ingress-nginx documentation now notes project retirement after March 2026. The manifest remains available, but this is a maintenance caveat worth monitoring for future revisions of the post.
- `kind delete clusters --all`, `kind export kubeconfig --name ...`, and `kind load image-archive --name ...` were verified against current upstream Kind command implementations.
