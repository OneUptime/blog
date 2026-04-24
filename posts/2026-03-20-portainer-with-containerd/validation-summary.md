# Validation Summary: How to Use Portainer with Containerd (Without Docker)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- containerd
- Kubernetes
- K3s
- CRI / crictl
- nerdctl

## Sources Consulted
- Portainer FAQ: Does Portainer support containerd? https://docs.portainer.io/faqs/installing/does-portainer-support-containerd
- Portainer: Add a Kubernetes environment https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer: Install Portainer Agent on your Kubernetes environment https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer: Import an existing Kubernetes environment https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer CE install on Kubernetes https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- K3s overview https://docs.k3s.io/
- K3s CLI tools https://docs.k3s.io/cli
- K3s cluster access https://docs.k3s.io/cluster-access
- Kubernetes: Debugging Kubernetes nodes with crictl https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- nerdctl official repository and README https://github.com/containerd/nerdctl

## Issues Found
- The post originally stated that Portainer can manage raw containerd directly via the Portainer Agent and `nerdctl`. Portainer's official docs state that containerd is not supported directly, only through Kubernetes integration. I corrected the introduction, architecture section, and conclusion to reflect the supported model.
- The original `nerdctl run` instructions for both the Portainer Agent and Portainer Server were not a supported Portainer deployment path for raw containerd hosts. I replaced these with supported Kubernetes-based guidance and an official Helm install command for Portainer CE on Kubernetes.
- The original K3s connection instructions implied importing `/etc/rancher/k3s/k3s.yaml` directly into Portainer without caveats. I updated this to generate a self-contained kubeconfig, noted that kubeconfig import is a Portainer Business Edition feature, and clarified that the kubeconfig `server:` endpoint must be reachable from the Portainer instance.
- The original `crictl` and `ctr` examples used generic containerd tooling and socket assumptions that do not match the K3s-focused workflow used earlier in the post. I updated those examples to use K3s's embedded `crictl` and `ctr` commands.
- The original standalone `containerd` setup section was misleading in the K3s-based flow because K3s already bundles and manages containerd. I replaced it with the Kubernetes storage prerequisite that Portainer's official Kubernetes install documentation requires.

## Review Notes
- Portainer's current documentation describes the Kubernetes Agent and kubeconfig import paths as legacy in some contexts and recommends the Edge Agent for many use cases.
- Portainer's kubeconfig import flow is available only in Portainer Business Edition.
- K3s updates certificates in `/etc/rancher/k3s/k3s.yaml` when K3s restarts; copied kubeconfig files need to be refreshed manually over time.
- Installing Portainer on Kubernetes requires a default `StorageClass`.
