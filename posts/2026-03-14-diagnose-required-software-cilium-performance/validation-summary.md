# Validation Summary: Diagnosing Required Software Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF and BPF tooling
- Hubble
- iperf3 and netperf
- Linux kernel modules and cgroups
- Container runtimes

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble Observer API documentation: https://docs.cilium.io/en/stable/_api/v1/observer/README/
- Cilium Hubble Flow API documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README.html
- iperf3 official documentation: https://software.es.net/iperf/

## Issues Found
- The prerequisites claimed Kubernetes v1.24+ with Cilium v1.14+ as a blanket requirement. Current Cilium support is version-specific, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- The kernel module check described `wireguard`, `ip_tables`, `xt_conntrack`, `br_netfilter`, and `vxlan` as required modules. Cilium requirements vary by feature and are primarily documented as kernel config requirements, so the wording was changed to "common kernel modules used by typical Cilium features" and the sample list was adjusted to feature-relevant modules.
- The iperf3 note claimed version 3.9+ was required for best JSON output. Official iperf3 documentation describes JSON output as a supported feature without that threshold, so the note was changed to recommend a recent release and `-J/--json` for machine-readable results.
- The bpftool note said it should match the kernel version. The practical requirement is compatibility with the running kernel, so the wording was corrected.
- Several node-local Cilium datapath commands used `cilium bpf`, `cilium endpoint`, and `cilium monitor`. Current Cilium documentation exposes those as `cilium-dbg` commands, typically run inside a Cilium agent pod in Kubernetes. The examples were updated to select a Cilium pod and execute `cilium-dbg` through `kubectl`.
- The connection tracking command used `cilium bpf ct list global`, which is not the current documented syntax. It was updated to `cilium-dbg bpf ct list`.
- Hubble JSON examples referenced top-level `.verdict`, `.source`, and `.destination` fields. Hubble JSON flow responses contain flow data under `.flow`, so the `jq` filters were corrected to use `.flow.verdict`, `.flow.source`, `.flow.destination`, and `.flow.drop_reason_desc`.
- The real-time monitor section text referred to `cilium monitor`; it was updated to `cilium-dbg monitor` to match the corrected commands.

## Review Notes
- The Cilium and Hubble commands are version-sensitive. The corrected examples align with current Cilium documentation, but users on older Cilium releases may still see the pre-`cilium-dbg` command naming.
- The bpftrace example could not be fully executed locally because bpftrace requires root privileges in this environment.
