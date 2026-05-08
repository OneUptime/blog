# Validation Summary: Fixing Connection Rate (TCP_CRR) Issues in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF socket load balancing
- Cilium BPF connection tracking and NAT maps
- Linux TCP/sysctl tuning
- CiliumNetworkPolicy
- netperf TCP_CRR

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.14 Helm chart values: https://raw.githubusercontent.com/cilium/cilium/v1.14.14/install/kubernetes/cilium/values.yaml
- Cilium v1.19 Helm chart values: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium agent command reference for BPF CT, NAT, socket LB, and GC options: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium kube-proxy-free and socket load balancer documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/dns.html and https://docs.cilium.io/en/stable/security/policy/language/#dns-based
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
- The Cilium Helm map sizing values used `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`, which are agent flag-derived names rather than documented Helm chart values. Changed them to `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The conntrack timeout example used nonexistent Helm values: `bpf.ctTCPTimeoutEstablished`, `bpf.ctTCPTimeoutClose`, and `bpf.ctTCPTimeoutFIN`. Replaced them with documented Cilium ConfigMap/agent option keys under `extraConfig`: `bpf-ct-timeout-regular-tcp`, `bpf-ct-timeout-regular-tcp-syn`, and `bpf-ct-timeout-regular-any`.
- The `helm upgrade` examples did not preserve existing chart values. Added `--reuse-values` so the examples do not unintentionally reset unrelated Cilium settings during partial tuning changes.
- The policy-count command used `cilium policy get` in a way that is not a current Kubernetes-wide policy listing workflow. Replaced it with a `kubectl get cnp,ccnp -A -o json` command that counts ingress and egress rules in Cilium policy CRDs.
- The post claimed FQDN policies require DNS resolution per new connection. Updated the wording because Cilium uses DNS proxy/cache data to generate IP-based policy entries; the overhead is DNS proxy/cache and rule churn, not necessarily one DNS resolution per connection.
- The conntrack verification command used the outdated `cilium bpf ct list global` form. Replaced it with `kubectl exec ... cilium-dbg bpf ct list`, matching the current command reference.
- The verification and rollback examples used `cilium status --verbose` even though the prerequisites only required Helm and kubectl access. Replaced those checks with `kubectl exec ... cilium-dbg status --verbose`.

## Review Notes
- The Linux sysctl examples are syntactically valid, but they are workload- and kernel-version-sensitive. In a future revision, the post could warn readers to persist sysctl settings through node configuration management and validate `tcp_fastopen` and `tcp_tw_reuse` behavior on their kernel version.
