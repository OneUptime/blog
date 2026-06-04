# Validation Summary: How to Use Docker Images with k3d (k3s in Docker)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Registry
- Kubernetes
- kubectl
- k3d
- k3s
- containerd
- Traefik Ingress

## Sources Consulted
- k3d cluster create command reference: https://k3d.io/stable/usage/commands/k3d_cluster_create/
- k3d image import command reference: https://k3d.io/v5.3.0/usage/commands/k3d_image_import/
- k3d image registry guide: https://k3d.io/stable/usage/registries/
- k3d registry create command reference: https://k3d.io/stable/usage/commands/k3d_registry_create/
- k3d cluster start/stop/delete command references: https://k3d.io/stable/usage/commands/k3d_cluster_start/, https://k3d.io/v5.3.0/usage/commands/k3d_cluster_stop/, https://k3d.io/stable/usage/commands/k3d_cluster_delete/
- k3s documentation: https://docs.k3s.io/
- k3s storage documentation: https://docs.k3s.io/add-ons/storage
- Kubernetes image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Docker documentation: https://docs.docker.com/

## Issues Found
- The "Connect an Existing Registry" example started a plain Docker registry with `docker run` and then used `k3d cluster create --registry-use shared-registry:5000`. k3d documents `--registry-use` for k3d-managed registries, and the official guide uses the `k3d-` prefixed registry name for registries created by `k3d registry create`. Changed the example to create a reusable k3d-managed registry with `k3d registry create shared-registry --port 5000` and connect it as `k3d-shared-registry:5000`.
- The development workflow script pushed a requested tag such as `v1.1` but only ran `kubectl rollout restart deployment/myapi`, which would not change a Deployment that still referenced an older image tag. Changed the script to keep separate host-side and cluster-side registry names, push to `localhost:5111`, and update the Deployment image to `dev-registry:5111/myapi:${TAG}` with `kubectl set image`.

## Review Notes
The remaining k3d commands, registry creation flags, image import examples, Kubernetes Deployment and Ingress API versions, `imagePullPolicy: IfNotPresent` usage, and cleanup commands matched the consulted official documentation. The post assumes a Service named `myapi` exposes port 3000 for the Ingress example; that is valid but not shown in the tutorial.
