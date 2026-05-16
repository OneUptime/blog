# Validation Summary: How to Set Up Cilium CNI on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`, KubePrism)
- Cilium CNI (Helm chart, Cilium CLI)
- eBPF networking and kube-proxy replacement
- Hubble (observability, CLI, UI)
- Kubernetes NetworkPolicy and CiliumNetworkPolicy / CiliumClusterwideNetworkPolicy CRDs
- WireGuard transparent encryption
- Cilium native routing, bandwidth manager, and BBR congestion control

## Sources Consulted
- Talos Linux "Deploying Cilium" guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Cilium Helm install documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium policy language reference (v1.16): https://docs.cilium.io/en/v1.16/security/policy/language/
- Cilium agent CLI (`cilium-dbg`) command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- cilium/cilium-cli GitHub release pattern and `stable.txt`
- cilium/hubble GitHub release pattern and `stable.txt`

## Issues Found
- **Misleading YAML comment in Step 1.** The control-plane config snippet had a comment ("Allow scheduling on control plane if needed / remove if you have dedicated worker nodes") attached to the `machine.features.kubePrism` block. KubePrism has nothing to do with scheduling on the control plane — it provides a local load balancer for the Kubernetes API server. Replaced the comment with an accurate description of what KubePrism actually does so the reader understands why it is enabled and how Cilium can later target `localhost:7445`.

## Review Notes
- **Helm values match the official Talos Linux guide.** All flags used in the `helm install` invocation — `kubeProxyReplacement=true`, `ipam.mode=kubernetes`, the `securityContext.capabilities.ciliumAgent` / `cleanCiliumState` capability lists, and the `cgroup.autoMount.enabled=false` / `cgroup.hostRoot=/sys/fs/cgroup` pair — are exactly what Sidero recommends for Talos. The capability lists were cross-checked against the upstream Talos Cilium guide.
- **`k8sServiceHost` recommendation could be tightened.** The post enables KubePrism but then suggests pointing `k8sServiceHost` at the API server IP or VIP. The official Talos guide actually recommends using `localhost` with `k8sServicePort=7445` when KubePrism is enabled, which avoids depending on the VIP for control-plane reachability from pods. Both approaches work, so this is a stylistic choice rather than a technical error.
- **`cilium` vs `cilium-dbg` inside the agent pod.** Starting with Cilium 1.16, the in-pod binary was renamed from `cilium` to `cilium-dbg` to distinguish it from the user-facing CLI. A backward-compatibility symlink keeps the old `cilium service list`, `cilium bpf lb list`, `cilium status`, `cilium encrypt status`, and `cilium bpf tunnel list` invocations working, so the troubleshooting commands in the post still execute correctly. New posts should prefer `cilium-dbg ...` to be future-proof, but the existing commands remain valid on supported releases.
- **Network policy YAMLs are correct.** `apiVersion: cilium.io/v2` is the right version for both `CiliumNetworkPolicy` and `CiliumClusterwideNetworkPolicy`. The L7 HTTP rule structure (`method` / `path` / `headers` as a list of `'Header-Name: value'` strings) matches the upstream policy language reference. The DNS rule with `matchPattern: "*"` and the `k8s:io.kubernetes.pod.namespace` label selector follow Cilium's documented selector syntax.
- **Download URLs verified.** The `cilium-cli` release URL (`https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz`) and the `stable.txt` on the `main` branch are correct. The Hubble CLI release URL and its `stable.txt` on the `master` branch are also correct — note the branch name differs between the two repos, which the post handles correctly.
- **Hubble service ports.** `kubectl port-forward svc/hubble-relay 4245:80` and `svc/hubble-ui 12000:80` reflect the default service ports created by the Helm chart.
