# Validation Summary: How to Set Up Nested Virtualization in Harvester

## Status
not-technically-relevant

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Harvester
- KubeVirt
- KVM/QEMU
- libvirt and virt-install
- cloud-init
- K3s
- Kubernetes

## Sources Consulted
- Harvester Hardware and Network Requirements (v1.7): https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester CPU Model Selection (documents `host-passthrough` behavior): https://docs.harvesterhci.io/v1.8/vm/select-cpu-model/
- KubeVirt Virtual Hardware user guide: https://kubevirt.io/user-guide/compute/virtual_hardware/
- KubeVirt API reference v1.7.1 (`CPUFeature` policies): https://kubevirt.io/api-reference/v1.7.1/definitions.html
- KubeVirt Dedicated CPU Resources: https://kubevirt.io/user-guide/compute/dedicated_cpu_resources/
- KubeVirt Hugepages Support: https://kubevirt.io/user-guide/compute/hugepages/
- Ubuntu Server libvirt documentation (`kvm-ok` / `cpu-checker`): https://documentation.ubuntu.com/server/how-to/virtualisation/libvirt/
- K3s Cluster Access: https://docs.k3s.io/cluster-access

## Issues Found
- The core premise is unsupported by current Harvester documentation. Harvester v1.7 requirements explicitly state that nested virtualization is not supported on virtual machines running on Harvester, which invalidates the title, introduction, prerequisites, host setup steps, and the later KVM/K3s walkthrough.
- The CPU feature example is incorrect for AMD hosts. The VM manifest sets `vmx` with `policy: require` and `svm` as `optional`, but KubeVirt documents that `require` causes VM creation to fail unless the host or hypervisor can provide that feature. On AMD, `vmx` is not available, so this is not a portable Intel/AMD example.
- The verification commands are incomplete as written. Ubuntu documents that `kvm-ok` comes from the `cpu-checker` package and is not installed by default, but the guest package list in the article does not install `cpu-checker`.
- The optimization section omits required prerequisites. KubeVirt documents that hugepages require Kubernetes/node-level hugepage enablement and pre-allocation, and that `dedicatedCpuPlacement` depends on Kubernetes CPU Manager conditions. The article presents these as simple VM-only settings.
- Because the unsupported premise affects the entire tutorial, this post is not fixable with targeted corrections. It would require a full rewrite or removal.

## Review Notes
No edits were made to the article body because the problems are structural rather than isolated syntax or command mistakes. If this topic is retained, it should be rewritten either as a note that Harvester does not support nested virtualization in guest VMs, or as a different guide that is not framed as a Harvester-supported workflow.
