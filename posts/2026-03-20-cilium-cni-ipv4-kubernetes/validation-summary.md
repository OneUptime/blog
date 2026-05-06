# Validation Summary: How to Install Cilium CNI with IPv4 Networking in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- kubeadm
- Helm
- Hubble
- IPv4 networking
- eBPF

## Sources Consulted
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Installation using kubeadm: https://docs.cilium.io/en/stable/installation/k8s-install-kubeadm/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Cluster-Pool IPAM: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI stable version file: https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt
- Hubble CLI stable version file: https://raw.githubusercontent.com/cilium/hubble/main/stable.txt
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/

## Issues Found
- The kernel requirement was outdated. The post said Cilium required Linux kernel `4.9.17+` with `5.10+` only recommended, but current Cilium system requirements document `5.10+` or an equivalent supported kernel such as `4.18` on RHEL 8.10. I updated the prerequisite accordingly.
- The Cilium CLI install instructions used the GitHub `latest` download URL without checksum verification. Current official docs install the CLI via `stable.txt`, detect architecture, verify the SHA256 checksum, and then extract the binary. I updated the commands to match the official installation flow.
- The post used `cilium install` without pinning a Cilium version and used Helm chart version `1.15.0`, which is outdated relative to the current stable docs. I updated the installation examples to `1.19.3`, which is the version shown by the current stable Cilium install docs, and kept the commands aligned with official examples.
- The kube-proxy guidance was ambiguous. The original prerequisites said kube-proxy removal was optional, but the Helm example always enabled `kubeProxyReplacement=true` and required `k8sServiceHost` and `k8sServicePort`. I clarified that skipping kube-proxy applies only when enabling kube-proxy replacement, and split the Helm examples so the kube-proxy-free settings are shown only for that case.
- The installation verification example used `cilium status` with expected output showing `Hubble Relay: disabled`. Current Cilium validation docs use `cilium status --wait`, and when Hubble is not enabled the status output shows `Hubble: disabled`. I corrected both the command and the expected output.
- The Hubble CLI installation example used the GitHub `latest` download URL without checksum verification. I updated it to the current official `stable.txt` plus checksum workflow.
- The Hubble observation example used `hubble observe --follow`. Current official Hubble setup docs demonstrate `hubble observe` after port-forwarding, so I aligned the command with the documented usage.
- The endpoint inspection command used `cilium endpoint list` inside a Cilium pod. Current Cilium troubleshooting docs use `cilium-dbg endpoint list` for in-pod endpoint inspection. I replaced the command with the supported form.
- The pod IP verification note implied that every installation would assign addresses from `10.0.0.0/16`, but that only applies if the reader used the custom cluster-pool settings shown earlier. I clarified that the range check applies to the custom-pool example.
- The closing statement made an unqualified performance and preference claim about Cilium versus iptables-based solutions. I replaced it with a factual description of Cilium’s eBPF-based networking, policy, and observability capabilities.

## Review Notes
- The post is technically valid after the fixes above.
- The Helm repository flow used in the post is still supported, although current Cilium docs also document OCI-based chart installation as a recommended alternative.
- When using cluster-pool IPAM, the configured pod CIDR should not overlap with node networking ranges. Cilium’s docs specifically warn about conflicts with overlapping CIDRs.
- Enabling Hubble Relay requires TCP port `4244` to be open between nodes. The post’s commands are correct, but this is a useful deployment caveat for future revisions.
