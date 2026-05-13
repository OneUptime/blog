# Validation Summary: How to Migrate Existing Workloads to Calico on Single-Node Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico Open Source
- Flannel
- Kubernetes CNI
- Kubernetes NetworkPolicy
- PersistentVolumes and PersistentVolumeClaims

## Sources Consulted
- Calico documentation: Install Calico networking and network policy for on-premises deployments: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: Install Calico on a single-host Kubernetes cluster: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k8s-single-node
- Calico documentation: What is network policy?: https://docs.tigera.io/calico/latest/about/about-network-policy
- Kubernetes documentation: kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: Field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Flannel GitHub README and release manifest location: https://github.com/flannel-io/flannel

## Issues Found
- The introduction said the guide covered both in-place replacement and blue-green migration step by step, but the post only provides in-place steps. I changed the wording to say the post focuses on in-place replacement and that production blue-green migrations should use the same backup and validation checks.
- The backup section used "All Workload Definitions" even though `kubectl get all` does not export every relevant namespaced resource. I changed the heading to "Core Workload Definitions" and added an Ingress export command.
- The Flannel removal command used the old `coreos/flannel` raw manifest URL. I updated it to the current official Flannel release manifest URL.
- The Calico install command pinned an older `v3.27.0` manifest. I updated it to the current `v3.32.0` manifest and changed the command to download the manifest locally first so users can apply required CIDR customization before installation.
- The Calico install instructions did not mention pod CIDR handling. I added the documented note to set `CALICO_IPV4POOL_CIDR` when the cluster is not kubeadm-based and does not use the default `192.168.0.0/16` pod CIDR.
- The pod restart command deleted all running pods in all namespaces, which would include system and CNI pods. I changed it to target a workload namespace and added a note to repeat it per workload namespace.

## Review Notes
- `kubectl wait --for=condition=ready pod --selector=k8s-app=calico-node` is valid for the manifest-based Calico install because the current manifest still deploys `calico-node` in `kube-system` with that label.
- The post still presents generic backup commands. In a real production migration, teams should also account for CRDs, Helm releases, GitOps state, RBAC, admission controllers, storage-provider-specific snapshots, and application-specific restore tests.
