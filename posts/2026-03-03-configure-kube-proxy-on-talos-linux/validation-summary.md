# Validation Summary: How to Configure kube-proxy on Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.proxy`)
- Kubernetes kube-proxy (iptables and IPVS modes)
- IPVS (IP Virtual Server) scheduling algorithms
- Linux conntrack (connection tracking)
- Prometheus Operator (ServiceMonitor) for metrics scraping
- talosctl and kubectl CLIs
- nicolaka/netshoot debug image

## Sources Consulted
- Talos v1alpha1 config reference (`cluster.proxy` ProxyConfig: `disabled`, `mode`, `image`, `extraArgs`) — https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- kube-proxy command-line reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- kubernetes/pkg/proxy/ipvs README (scheduler list, IPVS mode behavior) — https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/ipvs/README.md
- Talos logging guide and `talosctl logs` behavior — https://www.talos.dev/v1.11/talos-guides/configuration/logging/
- Talos discussion on exposing kube-proxy metrics — https://github.com/siderolabs/talos/discussions/7799
- Prometheus Operator ServiceMonitor schema (port name vs targetPort) — https://github.com/prometheus-operator/prometheus-operator
- Cross-reference against previously-validated sibling posts in this repo that use the same talosctl patch workflow.

## Issues Found
1. **Wrong talosctl subcommand for applying a live patch.** The post used `talosctl apply-config --nodes ... --patch @kube-proxy-ipvs.yaml`. The `apply-config` command takes `--file`/`-f` for a full machine config and `--config-patch`/`-p` only as a modifier of a base file; it does not have a bare `--patch` flag. The documented way to apply a strategic merge patch to a running node is `talosctl patch machineconfig --nodes ... --patch @file.yaml`. Fixed the command in the "Switching to IPVS Mode" section. (This is consistent with how every other recently-validated Talos post in this repo writes the patch workflow.)
2. **Incomplete IPVS scheduler list.** The post listed `rr, lc, dh, sh, sed, nq` and omitted the weighted variants and locality-aware schedulers. kube-proxy and the in-kernel IPVS support also include `wrr` (Weighted Round Robin), `wlc` (Weighted Least Connections), `lblc` (Locality-Based Least Connections), and `lblcr` (Locality-Based Least Connections with Replication). Added these to the comment block so readers picking a scheduler see the real menu.

## Review Notes
- The `metrics-bind-address: "0.0.0.0:10249"` override in the post is correct and necessary: the kube-proxy default is `127.0.0.1:10249`, which is unreachable from a Prometheus scraper running off-node. Worth keeping that override prominent.
- The ServiceMonitor uses `port: "10249"`. In the Prometheus Operator schema, `port` is the **name** of the Service port (not the numeric value), so this only works if you create a Service for kube-proxy whose port is literally named `"10249"`. It is not technically wrong, but the conventional name is `metrics` (or use `targetPort: 10249`). Also note that Talos does not ship a kube-proxy Service by default, so readers must create one (or use kube-prometheus-stack's `kubeProxy.service.enabled=true`) before this ServiceMonitor will match anything. Left as-is to avoid scope-creeping the fix, but a future revision could include the Service definition or rename the port.
- The `kubectl debug node/<node> ... -- iptables -t nat -L KUBE-SERVICES` example assumes iptables mode. In IPVS mode, `KUBE-SERVICES` is largely empty and `ipvsadm -Ln` is the right tool; in the future nftables mode (kube-proxy `proxy-mode: nftables`, GA in Kubernetes 1.33), `nft list ruleset` is the right tool. The post correctly limits itself to iptables here but readers operating in IPVS mode should be aware.
- The conntrack duration `"1h0m0s"` is valid Go `time.Duration` syntax that kube-proxy accepts; no change needed.
- The "default verbosity is 2" note for `v: "4"` is reasonable — kube-proxy's default log level is `2` when set by kubeadm/most distros, though strictly speaking the binary's own default is `0`.
- `talosctl logs kube-proxy` works because Talos runs kube-proxy as a service/static pod whose logs are surfaced through the machine API.
