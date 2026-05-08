# Validation Summary: Configuring iptables-Based Masquerading in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- iptables masquerading
- Cilium CLI and `cilium-dbg`

## Sources Consulted
- Cilium 1.16 masquerading documentation: https://docs.cilium.io/en/v1.16/network/concepts/masquerading/
- Cilium v1.16.5 Helm chart values: https://github.com/cilium/cilium/blob/v1.16.5/install/kubernetes/cilium/values.yaml
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/

## Issues Found
- The post described `ipMasqAgent` as fine-grained control for iptables-based masquerading. Cilium documents `ipMasqAgent` as the eBPF-based ip-masq-agent, so I removed that setting from the iptables example and replaced it with the documented optional `egressMasqueradeInterfaces` setting.
- The Helm command referenced `cilium-values.yaml`, but the snippet defined `cilium-iptables-masq-values.yaml`. I updated the command to use the matching file name.
- The validation command used a direct host `iptables` chain inspection. I changed it to the documented `kubectl exec ds/cilium -- cilium-dbg status | grep Masquerading` check.
- The BPF configuration inspection used `cilium bpf config list`, which is not the current in-pod diagnostic command. I changed it to `cilium-dbg status` for the relevant masquerading mode.
- The endpoint check used `cilium endpoint list`, but endpoint listing is exposed through `cilium-dbg` in the agent pod. I changed it to `kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list`.
- The BusyBox `wget` example used the long timeout option. I changed it to `-T 5`, which is more portable for BusyBox.
- The Cilium connectivity test passed multiple test names as one comma-separated value. I changed it to repeat `--test`, matching the documented string-list flag behavior.

## Review Notes
Cilium v1.16.5 is not the latest Cilium release as of this review date, but it remains a valid chart version in the Cilium 1.16 line. Future updates could consider refreshing the post to a currently maintained Cilium version and adding a note that `egressMasqueradeInterfaces` must match the node's actual egress interface names.
