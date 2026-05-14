# Validation Summary: Cilium FQDN Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CiliumNetworkPolicy
- Cilium DNS proxy and FQDN policies
- Kubernetes DNS and pod egress policy
- Cilium `cilium-dbg` troubleshooting commands
- Hubble CLI
- Helm configuration for Cilium

## Sources Consulted
- Cilium DNS-based policy guide: https://docs.cilium.io/en/latest/security/dns.html
- Cilium Layer 3 DNS-based policy documentation: https://docs.cilium.io/en/latest/security/policy/layer3/
- Cilium Layer 7 DNS policy and IP discovery documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium FQDN troubleshooting notes: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium Helm values reference for `dnsProxy.minTtl`: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg fqdn cache list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_list/
- Cilium `cilium-dbg fqdn cache clean` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_fqdn_cache_clean.html
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The DNS allow rule only allowed TCP/UDP port 53 and did not include `rules.dns`, so it would not reliably enable DNS proxy interception needed for `toFQDNs`. Added the DNS L7 rule with `matchPattern: "*"` and used `protocol: ANY`, matching Cilium's documented examples.
- The kube-dns selector used `k8s-app: kube-dns`; Cilium examples select the imported Kubernetes label as `"k8s:k8s-app": kube-dns`. Updated the selector accordingly.
- The wildcard AWS example used `*.amazonaws.com`, which only matches one DNS label and does not cover nested AWS service hostnames. Changed it to `**.amazonaws.com` and narrowed the comment to AWS service subdomains.
- The FQDN cache commands used `cilium fqdn ...`, but current command reference documents these as agent-side `cilium-dbg fqdn ...` commands. Updated the commands and sample output.
- The cache clean command omitted `--force`, which is needed to skip confirmation in scripted examples. Added `--force`.
- The TTL explanation implied existing connections can be removed from the allow list when DNS TTL expires. Cilium documents that existing live connections are retained while tracked; the problem is new connections using expired DNS data. Reworded the explanation and sequence diagram.
- The troubleshooting command `cilium bpf policy get <endpoint-id>` was not valid for the documented CLI. Replaced it with `cilium-dbg bpf ipcache list` for the resolved IP and `cilium-dbg bpf policy get --all`.

## Review Notes
The `dnsProxy.minTtl` Helm value is current in the stable Helm values reference. The Hubble DNS observation command is plausible for installed Hubble CLI usage, though actual visibility depends on Hubble being enabled and DNS flows being proxied or otherwise visible in the deployment.
