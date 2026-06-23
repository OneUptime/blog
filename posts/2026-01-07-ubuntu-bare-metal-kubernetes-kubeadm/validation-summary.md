# Validation Summary: How to Set Up a Bare-Metal Kubernetes Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 LTS and 24.04 LTS
- Kubernetes
- kubeadm, kubelet, and kubectl
- containerd
- Calico
- Cilium
- Metrics Server
- Kubernetes Dashboard
- UFW firewall rules
- Kubernetes RBAC and Pod Security Standards

## Sources Consulted
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes container runtime documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes release history: https://kubernetes.io/releases/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes Dashboard documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Calico on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Cilium quick installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Metrics Server installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Helm installation documentation: https://helm.sh/docs/intro/install/

## Issues Found
- The post described the result as "production-ready" and mentioned storage and high availability in the description, but the tutorial creates a basic single-control-plane cluster without storage or HA configuration. Updated the wording to describe a working bare-metal Kubernetes cluster with CNI networking and essential add-ons.
- The worker NodePort requirements and UFW rules listed only TCP. Kubernetes documents both TCP and UDP for the default NodePort range, so the table and UFW commands now include UDP.
- The Kubernetes apt repository was pinned to v1.31, which is no longer one of the maintained Kubernetes release branches as of 2026-06-23. Updated the repository and example output versions to v1.36, matching the current official kubeadm installation documentation.
- The `--pod-network-cidr` comment said it is required for CNI plugins generally. Updated it to say it is required by some CNI plugins.
- The Calico instructions used an older raw manifest and did not align Calico's default pod CIDR with the kubeadm `10.244.0.0/16` pod CIDR. Updated the Calico install path to the current Tigera Operator flow and added a CIDR adjustment before applying the custom resources.
- The validation section implied nginx replicas should be distributed across worker nodes. Kubernetes scheduling can place replicas differently, so the wording now treats this as an example rather than a guarantee.
- The diagnostics section used `kubectl get componentstatuses`, but ComponentStatus is deprecated in Kubernetes v1.19+. Replaced it with the API server readiness endpoint via `kubectl get --raw='/readyz?verbose'`.
- The Kubernetes Dashboard instructions used the old v2.7 manifest and `kubectl proxy` URL. Current Kubernetes documentation states Dashboard is deprecated/unmaintained and supports Helm-based installation, so the section now uses Helm and the documented port-forward target.

## Review Notes
- The Metrics Server manifest URL and `kubectl top` usage match the official Metrics Server documentation. The `--kubelet-insecure-tls` flag remains presented as a bare-metal workaround, but a production deployment should use properly signed kubelet serving certificates instead of disabling verification.
- The guide still describes a single-control-plane kubeadm cluster. A future production-focused version should add external load balancing, multiple control-plane nodes, etcd backup/restore, upgrade procedure, ingress, persistent storage, and monitoring details.
