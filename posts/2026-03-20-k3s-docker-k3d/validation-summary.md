# Validation Summary: How to Run K3s in Docker (K3d)

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
- k3d overview and installation: https://k3d.io/stable/
- k3d command tree: https://k3d.io/stable/usage/commands/
- k3d kubeconfig handling: https://k3d.io/stable/usage/kubeconfig/
- k3d config files: https://k3d.io/stable/usage/configfile/
- k3d registries: https://k3d.io/stable/usage/registries/
- K3s networking services and default Traefik behavior: https://docs.k3s.io/networking/networking-services
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Ingress concept docs: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The prerequisites only mentioned Docker, but the post relies on `kubectl` throughout. I updated the prerequisites to include `kubectl` and added `kubectl version --client` as a verification command.
- The basic cluster section attempted to create `mycluster` twice. That would fail on the second command because the cluster already exists. I consolidated the example into a single valid `k3d cluster create mycluster --kubeconfig-update-default` command.
- The multi-node cluster example had an invalid shell line continuation because a comment followed a trailing backslash on the same line. I moved the explanation into its own comment so the command is valid Bash.
- The Ingress example used the `nginx.ingress.kubernetes.io/rewrite-target` annotation even though K3s ships with Traefik by default. I removed the NGINX-specific annotation so the manifest matches the default K3s ingress setup.
- The local registry section reused the `dev` cluster name from an earlier step. Running the tutorial sequentially would cause the later `k3d cluster create` to fail. I changed that example to use a distinct cluster name.

## Review Notes
- The config file example uses `apiVersion: k3d.io/v1alpha5`, which is still the config API version shown in the current k3d documentation.
- The sample config disables Traefik with `--disable=traefik`; that is technically valid, but if readers reuse that cluster for Ingress-based examples later, they would need to install another ingress controller or remove that setting.
