# Validation Summary: Upgrade Cilium on Broadcom VMware ESXi

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VMware ESXi and vSphere
- VMware NSX
- eBPF
- VXLAN and Geneve tunneling

## Sources Consulted
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium upgrade guide: https://docs.cilium.io/en/latest/operations/upgrade/
- Cilium Helm installation and upgrade documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium installation on Broadcom VMware ESXi / NSX: https://docs.cilium.io/en/stable/installation/k8s-install-broadcom-vmware-esxi-nsx/
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium debug status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium debug BPF policy command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html

## Issues Found
- The introduction incorrectly suggested that ESXi hardware capability passthrough directly affects Cilium eBPF programs. Updated it to clarify that Cilium eBPF runs in the guest Linux kernel, while VMware-specific concerns are primarily virtual NIC driver and tunnel offload behavior.
- The kernel requirement stated "4.9+ for basic Cilium, 5.3+ for eBPF", which is outdated for current Cilium documentation. Updated it to Cilium 1.19's documented Linux 5.10+ requirement, with equivalent vendor kernels such as RHEL 8.10's 4.18 kernel.
- The hardware virtualization CPU check used `vmx`, which is not a Cilium requirement. Replaced it with a BPF-related kernel configuration check.
- The VMXNET3 statement said it was required for optimal Cilium performance. Changed it to "recommended" because Cilium does not require VMXNET3, though VMXNET3 is the appropriate high-performance VMware adapter.
- The BPF filesystem check used a broad `mount | grep bpf`. Narrowed it to `/sys/fs/bpf`, matching Cilium's documented BPFFS mount point.
- The prerequisites omitted Helm and the `helm diff` plugin even though the guide uses them. Added both prerequisites.
- The Helm upgrade commands used `--reuse-values` for a chart version upgrade. Cilium's upgrade guide warns not to use `--reuse-values` for minor-version upgrades because it can omit newly introduced values. Replaced this with exporting current values, reviewing them, and passing them with `-f`.
- The example upgrade target was Cilium `1.15.0`, which is outdated relative to current Cilium stable documentation. Updated the example target to `1.19.3`.
- The in-pod debug commands used `cilium bpf policy list` and `cilium status --verbose`. Current Cilium documentation uses `cilium-dbg` inside Cilium agent pods for local agent and BPF-map inspection. Updated those commands to `cilium-dbg bpf policy list` and `cilium-dbg status --verbose`.
- The best-practice language around snapshots was too broad for Kubernetes nodes. Updated it to defer to the operator's snapshot and etcd backup policy.
- The NSX guidance did not mention Cilium's documented VMware/NSX VXLAN issue. Added the documented custom tunnel port or Geneve recommendation for NSX with VXLAN tunnel mode.
- The conclusion repeated the inaccurate hardware-virtualization framing. Updated it to focus on the guest kernel, BPFFS, backups, Helm upgrade, and connectivity validation.

## Review Notes
The guide is technically relevant and contains executable operational commands. Future revisions should avoid pinning a static Cilium version unless the article is intentionally version-specific, and should remind readers to review version-specific Cilium upgrade notes for each minor release in their upgrade path.
