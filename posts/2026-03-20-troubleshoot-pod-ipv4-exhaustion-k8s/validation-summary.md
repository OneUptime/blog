# Validation Summary: How to Troubleshoot Pod IPv4 Address Exhaustion in Kubernetes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Kubernetes (kubectl, kubelet, node CIDR, pod networking)
- Calico CNI (calicoctl, IPAM, IPPool CRD)
- Flannel CNI (subnet.env, VXLAN)
- Container Network Interface (CNI)
- Bash / awk scripting for monitoring

## Sources Consulted
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes kubelet configuration reference (`maxPods`, `/var/lib/kubelet/config.yaml`)
- Flannel project documentation for `/run/flannel/subnet.env`

## Issues Found
1. **Invalid `calicoctl ipam release --leaked-ips` flag.** The `--leaked-ips` flag does not exist. The documented flags for `calicoctl ipam release` are `--ip=<IP>`, `--from-report=<REPORT>`, and `--force`. Replaced the single-command invocation with the documented two-step workflow: generate a report with `calicoctl ipam check --show-problem-ips -o report.json`, then release via `calicoctl ipam release --from-report=report.json`.
2. **Invalid `calicoctl ipam show --summary` flag.** `--summary` is not a valid flag on `calicoctl ipam show`; the summary table is the default output. Removed `--summary` from both the diagnostic command and the monitoring script.
3. **Incorrect `apiVersion` on the IPPool manifest.** The post used `crd.projectcalico.org/v1`, which is the internal CRD group and bypasses Calico API server validation. Changed to the documented `projectcalico.org/v3` and updated the apply command to `calicoctl apply -f ...` to match the documented workflow.
4. **Broken awk field indices in the monitoring script.** Given the pipe-delimited table `| IP Pool | <CIDR> | <IPS TOTAL> | <IPS IN USE> | <IPS FREE> |`, default-whitespace awk splits `|` and `IP`/`Pool` into separate fields. The original `$5`/`$6` selected the CIDR and a pipe character rather than numbers. Corrected to `$7` (IPS TOTAL) and `$9` (IPS IN USE) and added a comment documenting the assumed row format.

## Review Notes
- The monitoring script's awk parsing is inherently fragile: the `IPS IN USE` column contains `N (P%)` so `$9` captures the raw number, but any format change in future calicoctl versions would break it. A longer-term alternative would be parsing structured output (e.g., JSON via the Kubernetes API or Prometheus metrics from `calico-node`), but that is out of scope for the fix.
- `vxlanMode: CrossSubnet`, `natOutgoing`, `disabled`, and `blockSize: 26` are all valid IPPool spec fields and consistent with current Calico defaults.
- The kubelet `maxPods` guidance is correct, but on managed Kubernetes (EKS/GKE/AKS) the knob is exposed differently (e.g., node group launch template, `--max-pods` on GKE). Readers on managed platforms should consult their provider's docs.
- The `FailedCreatePodSandBox` / "failed to allocate for range 0" event text is an accurate representation of host-local / Calico IPAM exhaustion messages.
