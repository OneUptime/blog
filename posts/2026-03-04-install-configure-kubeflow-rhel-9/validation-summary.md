# Validation Summary: How to Install and Configure Kubeflow on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubeflow
- Kubernetes
- kubeadm
- kubectl
- kustomize
- containerd
- Calico
- Istio
- Dex
- Kubernetes StorageClass
- Kubeflow Pipelines SDK

## Sources Consulted
- Kubeflow installation documentation: https://www.kubeflow.org/docs/started/installing-kubeflow/
- Kubeflow manifests repository README: https://github.com/kubeflow/manifests
- Kubeflow manifests 26.03 release notes: https://github.com/kubeflow/manifests/releases/tag/26.03
- Kubeflow dashboard access documentation: https://www.kubeflow.org/docs/components/central-dash/access/
- Kubeflow Pipelines getting started documentation: https://www.kubeflow.org/docs/components/pipelines/getting-started/
- Kubeflow Pipelines compile documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/compile-a-pipeline/
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes container runtime documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Calico on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
- The prerequisites listed Kubernetes v1.25+ and 4 CPU cores. Updated this to reflect Kubeflow manifests 26.03 requirements, including Kubernetes v1.34+ and higher CPU expectations.
- The RHEL kubeadm instructions installed Kubernetes packages without configuring the official `pkgs.k8s.io` yum repository. Added the Kubernetes v1.34 rpm repository and installed kubelet, kubeadm, and kubectl with `--disableexcludes=kubernetes`.
- The containerd setup did not configure the systemd cgroup driver, which Kubernetes documents as important for systemd-based Linux systems. Added default containerd configuration generation and `SystemdCgroup = true`.
- The Calico manifest URL used the older `docs.projectcalico.org` host. Replaced it with the current versioned upstream Calico manifest URL.
- The Kubeflow checkout used the outdated `v1.8-branch`. Updated it to the current stable `26.03` release tag.
- The Kubeflow deployment command used client-side apply and a shorter retry interval. Updated it to the server-side apply command used by the official manifests README.
- The storage section implied that a `kubernetes.io/no-provisioner` StorageClass dynamically provisions volumes. Clarified that it requires matching PersistentVolumes and that production deployments should use a dynamic CSI-backed StorageClass before deploying Kubeflow.
- The Kubeflow Pipelines example created a second task without returning the pipeline output. Added a return value and return type annotation to match current KFP v2 examples.
- The Dex password hash command depended on `passlib` without installing it. Added a pip install command for `passlib` and `bcrypt`.
- The firewall section implied that opening port 8080 was enough for remote dashboard access. Clarified that this only applies when exposing the forwarded dashboard beyond localhost.

## Review Notes
The guide remains a lab-oriented raw-manifests installation. For production, the post correctly points readers toward stronger authentication and external storage, but a future revision should consider documenting a supported CSI driver, certificate management, GPU node setup, and an external ingress strategy.
