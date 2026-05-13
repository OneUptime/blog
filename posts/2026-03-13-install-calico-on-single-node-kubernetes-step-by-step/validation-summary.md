# Validation Summary: How to Install Calico on Single-Node Kubernetes Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubeadm
- containerd
- Calico
- Tigera Operator
- calicoctl
- Kubernetes CNI networking
- Calico NetworkPolicy

## Sources Consulted
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes container runtime documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Calico on-premises operator installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview

## Issues Found
- The prerequisites listed `calicoctl` as already installed even though the post installs it later. Changed the prerequisite to `curl`, which is required by the install commands.
- The Kubernetes apt repository used `v1.29`, which is outdated for this validation date. Updated the repository examples to the current stable `v1.36` path.
- The containerd setup did not configure the systemd cgroup driver, while kubeadm-managed clusters use systemd by default. Added the documented `SystemdCgroup = true` configuration.
- The Kubernetes node preparation loaded kernel modules only for the current boot and omitted required sysctl settings. Added persistent module configuration and the required bridge/IP forwarding sysctl values.
- The `kubeadm init` command used `--ignore-preflight-errors=NumCPU` even though the prerequisites require at least 2 CPUs. Removed the unnecessary preflight bypass.
- The Calico install used the older `v3.27.0` operator URL and did not include the current separate Calico CRD manifest. Updated the Calico manifests to `v3.32.0` and added `v1_crd_projectcalico_org.yaml`.
- The Calico Installation IP pool omitted `blockSize`, which is present in the official default custom resources and makes the intended default explicit. Added `blockSize: 26`.
- The `calicoctl` install wrote to `/usr/local/bin` without sudo. Added `sudo` to the download and chmod commands.
- The Calico `projectcalico.org/v3` NetworkPolicy examples were applied with `kubectl`, but the post did not install the Calico API server or native v3 CRDs needed for direct `kubectl` management of those resources. Changed the examples to `calicoctl apply -f -`, which matches the installed tool and Kubernetes datastore configuration.
- The best-practices note implied both `kubectl` and `calicoctl` manage the same policy API in this setup. Clarified that `kubectl` is used for Kubernetes NetworkPolicy while `calicoctl` is used for Calico policy management.

## Review Notes
The post is technically valid after the fixes. The installation remains version-specific: future Kubernetes or Calico releases may require updating the pinned `v1.36` and `v3.32.0` examples.
