# Validation Summary: How to Replace kube-proxy with Cilium eBPF for IPv4 Service Handling

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- eBPF
- Kubernetes
- kube-proxy
- kubeadm
- Helm
- Hubble

## Sources Consulted
- Cilium: Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium: Per-node configuration (KubeProxyReplacement rollout): https://docs.cilium.io/en/stable/configuration/per-node-config/
- Cilium: Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium: `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium: `cilium-dbg service list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- Kubernetes: `kubeadm init` reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes: Creating a cluster with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/

## Issues Found
- The fresh-cluster kubeadm setup copied `admin.conf` into `$HOME/.kube/config` but omitted the ownership fix required for non-root `kubectl` usage. Added `sudo chown $(id -u):$(id -g) $HOME/.kube/config` to match Kubernetes' kubeadm guidance.
- The Helm install examples were pinned to Cilium `1.15.0`, which is outdated relative to the current stable documentation. Updated the chart version to `1.19.3`.
- The Helm examples assumed the Cilium Helm repository was already configured. Added `helm repo add cilium https://helm.cilium.io/` so the commands work as written.
- The Hubble monitoring section used `cilium hubble port-forward`, which relies on Hubble Relay, but the install commands did not enable Relay. Added `--set hubble.relay.enabled=true` to the Helm install and upgrade examples.
- The existing-cluster migration flow did not match current Cilium guidance for rolling out kube-proxy replacement on a live cluster. Replaced it with the documented node-by-node rollout pattern using a `CiliumNodeConfig`, kube-proxy DaemonSet patching, per-node labeling, and cleanup steps.
- The existing-cluster cleanup omitted deletion of the `kube-proxy` ConfigMap, which Cilium documents recommend removing to avoid kube-proxy being reinstalled during kubeadm upgrades. Added the ConfigMap deletion step.
- The verification section used `cilium status | grep KubeProxyReplacement` and `cilium service list`, but current Cilium documentation uses `cilium-dbg status --verbose` and `cilium-dbg service list` inside a Cilium pod for these checks. Updated the commands accordingly.
- The service-test example could race because it immediately accessed the deployment and test pod. Added `kubectl rollout status` and `kubectl wait` to make the example reliably executable.
- The service-test example grepped for `nginx` in the Cilium service table, but `cilium-dbg service list` shows frontends and backends rather than Kubernetes service names in the normal tabular output. Changed the check to grep for the Service ClusterIP instead.
- The Hubble example output used an oversimplified forwarded/translated description that did not reflect Cilium's documented socket-LB trace output. Replaced it with the pre-translation and post-translation event pattern shown in the kube-proxy-free documentation.
- The closing performance claim cited a specific 10-30% latency improvement without an authoritative source in the official documentation consulted. Reworded it to a non-quantified latency claim that remains technically accurate.

## Review Notes
- Option 2 now reflects the current Cilium rollout model for clusters that already use Cilium and are transitioning kube-proxy replacement gradually. Migrating from a different CNI is a separate procedure covered by Cilium's "Migrating a cluster to Cilium" documentation.
- The post is now technically consistent with the current stable Cilium documentation available on May 6, 2026, which documents Cilium 1.19.3.
