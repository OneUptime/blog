# Validation Summary: How to Run K3s in Docker (K3d) - Part 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3d
- K3s
- Docker
- Kubernetes
- kubectl
- GitHub Actions

## Sources Consulted
- k3d overview and requirements: https://k3d.io/stable/
- k3d cluster create command reference: https://k3d.io/stable/usage/commands/k3d_cluster_create/
- k3d image registry guide: https://k3d.io/stable/usage/registries/
- k3d nodefilter concepts: https://k3d.io/stable/design/concepts/
- k3d image import command reference: https://k3d.io/stable/usage/commands/k3d_image_import/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub-hosted runners overview: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- GitHub Actions Ubuntu runner software inventory: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The post installed only K3d, but the examples also require Docker and `kubectl`. I added a prerequisite note because the official k3d docs list Docker and `kubectl` as requirements.
- The port-mapping example implied `curl http://localhost:8080/` would work immediately after cluster creation. I clarified that this access works after deploying an ingress or service, which matches k3d's service-exposure flow.
- The local-registry example used `k3d-my-registry:5000` for host-side image pushes, but k3d's registry docs note that the host usually cannot resolve the k3d-managed container name directly. I changed the registry to `my-registry.localhost`, pushed from the host via `localhost:5000`, and kept the cluster-side image reference on `k3d-my-registry.localhost:5000`. I also renamed the cluster from `dev` to `dev-registry` so the step does not fail if the earlier `dev` cluster already exists.
- The GitHub Actions snippet was shown as `.github/workflows/integration.yml` but omitted the required trigger. I added `on: push` so the file is a valid workflow example. I also changed `condition=ready` to `condition=Ready` to match the Kubernetes reference examples.
- The best-practices example used `--k3s-arg "--disable=traefik"` without the nodefilter syntax required by k3d's `--k3s-arg` flag format. I corrected it to `--k3s-arg "--disable=traefik@server:*"`.

## Review Notes
- `k3d cluster create --wait` is valid, but redundant, because the current k3d command reference documents `--wait` as enabled by default.
- GitHub-hosted `ubuntu-latest` runners currently include `kubectl`, so the CI example is valid as of April 29, 2026. That said, GitHub updates runner images weekly, so explicitly pinning `kubectl` in CI would be more reproducible in a future revision.
