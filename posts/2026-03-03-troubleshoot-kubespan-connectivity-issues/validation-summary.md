# Validation Summary: How to Troubleshoot KubeSpan Connectivity Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- KubeSpan
- WireGuard
- Kubernetes
- kubectl
- Linux networking

## Sources Consulted
- Talos KubeSpan documentation: https://docs.siderolabs.com/talos/v1.13/networking/kubespan
- Talos Discovery Service documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/discovery
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post used singular KubeSpan resource names such as `kubespanidentity`, `kubespanpeerstatus`, and `kubespanendpoint`. Updated them to the documented resource names: `kubespanidentities`, `kubespanpeerstatuses`, and `kubespanendpoints`.
- The post used `discoveredmembers`, which is not the current documented discovery inspection resource. Updated general member checks to `members` and discovery-registry checks to `affiliates`.
- The configuration snippets used the older nested `machine.network.kubespan` format. Updated them to the current `apiVersion: v1alpha1`, `kind: KubeSpanConfig` document format used by current Talos documentation.
- The firewall troubleshooting snippet claimed `talosctl get links | grep kubespan` checks whether the node is listening on UDP 51820. Replaced it with `talosctl netstat --all | grep 51820`, which actually inspects sockets.
- The post described the 25-second keepalive as a WireGuard default. WireGuard's persistent keepalive is disabled by default; KubeSpan uses a 25-second keepalive. Reworded the statement accordingly.
- The resource check used `talosctl get systemstat`, which is not a documented troubleshooting command in the current CLI reference. Replaced it with `talosctl stats`.
- The reset section said disabling and re-enabling KubeSpan regenerates WireGuard configuration. Reworded it to say the KubeSpan interface is removed and re-created and peer connections are re-established, which better matches documented behavior.
- Added `--restart=Never` to the one-shot `kubectl run` iperf client example so the client pod does not restart after the throughput test exits.

## Review Notes
The guide is technically relevant and useful after the fixes. Some operational examples, especially UDP testing with `nc -zu`, can still vary by netcat implementation and firewall behavior, so readers may need packet capture or cloud firewall logs for definitive diagnosis.
