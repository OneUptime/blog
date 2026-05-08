# Validation Summary: Validating Cilium on K3s

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Cilium
- Cilium CLI
- Kubernetes
- K3s
- Kubernetes NetworkPolicy
- CoreDNS
- kube-proxy replacement

## Sources Consulted
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium kube-proxy replacement validation docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- K3s custom CNI and Cilium networking notes: https://docs.k3s.io/networking/basic-network-options
- K3s embedded network policy controller docs: https://docs.k3s.io/networking/networking-services
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium connectivity test source for current test names: https://github.com/cilium/cilium/tree/main/cilium-cli/connectivity

## Issues Found
- The DNS-focused connectivity test used `--test dns-resolution`, but current Cilium connectivity test names include `dns-only`; changed the command to `cilium connectivity test --test dns-only`.
- The post said the full connectivity test creates a `cilium-test` namespace. Current Cilium CLI documentation notes test namespaces may be suffixed for concurrency, such as `cilium-test-1`; changed the wording to `cilium-test` namespace(s).
- The CoreDNS check waited for a one-shot `kubectl run` pod to become `Ready`, which can fail after the command completes. Replaced it with `kubectl run --rm -i` so the DNS command result is returned directly.
- The Kubernetes service check used BusyBox `wget` against the API server, which can fail because of HTTPS certificate or HTTP status handling rather than service connectivity. Replaced it with a curl image using `curl -k -sS --connect-timeout 5`.
- The kube-proxy replacement check used `cilium status | grep KubeProxyReplacement`, but Cilium's documented validation command runs `cilium-dbg status` inside the Cilium DaemonSet. Updated the command accordingly.
- The final pod networking checklist printed `OK` even if `kubectl wait` failed. Wrapped the wait in an `if` statement so failures are reported as `FAILED`.
- The troubleshooting command for skipping external connectivity tests used `!to-outside`, which is not a current Cilium connectivity scenario name. Updated it to skip `!pod-to-world`.
- The kernel caveat referenced older kernels `< 4.19`. Current Cilium system requirements recommend Linux kernel 5.10 or later, or a distribution-equivalent kernel such as RHEL 8.10's 4.18 kernel; updated the wording.

## Review Notes
The NetworkPolicy example uses the stable `networking.k8s.io/v1` API and correctly isolates only the selected `app: web` pod for ingress, while leaving client pod egress non-isolated. The post does not pin a Cilium version, so the review used current stable/official documentation as of 2026-05-08.
