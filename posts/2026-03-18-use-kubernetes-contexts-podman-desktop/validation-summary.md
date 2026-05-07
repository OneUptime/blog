# Validation Summary: How to Use Kubernetes Contexts in Podman Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman Desktop
- Kubernetes
- `kubectl`
- kubeconfig
- Podman CLI

## Sources Consulted
- Podman Desktop: Viewing and selecting the current Kubernetes context - https://podman-desktop.io/docs/kubernetes/viewing-and-selecting-current-kubernetes-context
- Podman Desktop: Managing a Kubernetes context - https://podman-desktop.io/docs/kubernetes/managing-a-kube-context
- Podman Desktop: Configuring access to a Kubernetes cluster - https://podman-desktop.io/docs/kubernetes/existing-kubernetes
- Podman Desktop: Deploying a pod or container to Kubernetes - https://podman-desktop.io/docs/kubernetes/deploying-a-pod-to-kubernetes
- Podman Desktop: Settings Reference - https://podman-desktop.io/docs/configuration/settings-reference
- Kubernetes: Organizing Cluster Access Using kubeconfig Files - https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes: kubectl config use-context - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- Kubernetes: kubectl config set-context - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/
- Kubernetes: kubectl config view - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes: kubectl config rename-context - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_rename-context/
- Kubernetes: kubectl config delete-context - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_delete-context/
- Kubernetes: kubectl config delete-cluster - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_delete-cluster/
- Kubernetes: kubectl config delete-user - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_delete-user/
- Kubernetes: kubectl config set-credentials - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-credentials/
- Kubernetes: kubectl cluster-info - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- Podman: podman-generate - https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman: podman-kube-generate - https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html

## Issues Found
- The Podman Desktop UI instructions said to click any context to switch. Current Podman Desktop documentation shows switching via the **Set as Current Context** icon or the status bar dropdown. I updated the instructions to match the documented UI.
- The post claimed Podman Desktop reads the `KUBECONFIG` environment variable automatically for merged configs. Current Podman Desktop documentation documents a configured kubeconfig file path in **Settings > Preferences > Kubernetes**, not automatic `KUBECONFIG` discovery. I corrected the text to reflect the documented kubeconfig path behavior.
- The comment above `kubectl config rename-context old-name new-name` incorrectly described renaming as creating a new context and deleting the old one. I corrected the explanation because `rename-context` renames the context in place.
- The deployment section said Podman Desktop uses the active context. Current Podman Desktop deployment documentation shows that you select or confirm the Kubernetes context during the deployment flow. I updated that description.

## Review Notes
- The `kubectl` command examples are current and valid against the latest Kubernetes reference documentation.
- The `podman generate kube` example remains valid because `kube` is still a supported `podman generate` subcommand; the underlying command documentation is covered by `podman-kube-generate`.
- The `KUBECONFIG` merge example uses colon-delimited paths, which is correct for Linux and macOS shells. On Windows, `KUBECONFIG` entries are semicolon-delimited.
