# Validation Summary: How to Set Up Rancher for Telecommunications

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- SR-IOV
- SR-IOV Network Device Plugin
- Multus / NetworkAttachmentDefinition annotations
- DPDK
- Linux HugePages
- Kubernetes CPU Manager
- Kubernetes Topology Manager
- Red Hat real-time kernel and TuneD
- SUSE Telco Cloud

## Sources Consulted
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Linux Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- Kubernetes CPU Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Topology Manager: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes HugePages: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- Kubernetes Pod QoS: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- SR-IOV Network Device Plugin documentation: https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin
- Linux kernel HugeTLB documentation: https://docs.kernel.org/admin-guide/mm/hugetlbpage.html
- Linux kernel parameters reference: https://docs.kernel.org/admin-guide/kernel-parameters.html
- DPDK Linux Getting Started Guide, system requirements and hugepages: https://doc.dpdk.org/guides/linux_gsg/sys_reqs.html
- Red Hat Enterprise Linux 8 monitoring and performance tuning documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/8/pdf/monitoring_and_managing_system_status_and_performance/Red_Hat_Enterprise_Linux-8-Monitoring_and_managing_system_status_and_performance-en-US.pdf
- SUSE Telco Cloud product documentation: https://www.suse.com/products/edge-for-telco/

## Issues Found
- The CPU governor command used shell redirection with a wildcard path, which does not expand in the redirection target. I replaced it with a loop over each `scaling_governor` file so the command works as intended.
- The embedded `config.json` for the SR-IOV device plugin contained inline comments, which make JSON invalid. I removed the comments and updated the non-DPDK VF driver example to include both `i40evf` and `iavf`, which matches current plugin documentation.
- The UPF pod example did not include the `app: upf` label that the later anti-affinity and PodDisruptionBudget snippets rely on. I added the label so the scheduling and disruption rules target the same workload.
- The UPF pod had CPU and memory requests without matching limits, which would leave it outside the `Guaranteed` QoS class and undermine the CPU pinning guidance. I added matching CPU and memory limits to align the manifest with Kubernetes CPU Manager behavior.
- The HugePages section implied that DPDK requires 1Gi hugepages and paired boot parameters in a way that could conflict with `vm.nr_hugepages` semantics. I clarified that the sysctl example applies to default-size hugepages and that 1Gi pages should be reserved explicitly at boot when the workload requests `hugepages-1Gi`.
- The UPF manifest assumed existing Multus `NetworkAttachmentDefinition` objects and a matching `RuntimeClass` without saying so. I added brief inline notes to make those prerequisites explicit.
- The YAML examples in Steps 5 and 6 mixed separate configuration fragments in a single block. I added `---` separators so the examples are unambiguous.

## Review Notes
- RKE2 v1.32 and later recommends kubelet configuration drop-in files for many kubelet settings, but `kubelet-arg` remains a supported and technically valid way to express the settings shown in this post.
- The article is still intentionally environment-specific. Interface names, PCI device IDs, hugepage counts, and CPU isolation ranges will need adjustment for the reader's actual NICs, NUMA layout, and CNF resource profile.
