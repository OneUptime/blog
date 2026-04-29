# Validation Summary: How to Configure Minikube for IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Minikube
- Kubernetes (dual-stack networking)
- Calico CNI
- kubectl
- IPv6 / Dual-stack
- busybox (test image)
- ip6tables, ip -6 route (Linux networking)

## Sources Consulted
- Kubernetes feature gates removed reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dockershim FAQ (re: `--network-plugin` deprecation): https://kubernetes.io/blog/2022/02/17/dockershim-faq/
- Calico (Tigera) install/quickstart docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico configure-calico-node reference (env vars): https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Minikube start flags source: https://github.com/kubernetes/minikube/blob/master/cmd/minikube/cmd/start_flags.go

## Issues Found

1. **Removed feature gate `IPv6DualStack=true`** — The `IPv6DualStack` feature gate went GA in Kubernetes 1.23, was locked in 1.24, and was removed in 1.27. Setting it on a modern cluster either does nothing (1.23–1.26 with warnings) or causes startup failures (1.27+). Removed the `--feature-gates="IPv6DualStack=true"` flag from the `minikube start` command and added a sentence noting that dual-stack has been GA since 1.23. Also updated the corresponding verification step in Step 2 (which grepped for "dual" in the API server manifest — that string is no longer present) to grep for `service-cluster-ip-range` instead, which actually shows the dual-stack CIDR configuration.

2. **Deprecated kubelet flag `--network-plugin=cni`** — This flag was tied to dockershim and was removed alongside it in Kubernetes 1.24. Minikube also deprecated `--network-plugin` in favor of just `--cni`. Removed the `--network-plugin=cni` line from the `minikube start` command.

3. **Outdated Calico install URL** — `https://docs.projectcalico.org/manifests/calico.yaml` is the legacy URL; Calico documentation moved to `docs.tigera.io` and the canonical install path is now a version-pinned URL on `raw.githubusercontent.com`. Updated the manifest URL to `https://raw.githubusercontent.com/projectcalico/calico/v3.28.2/manifests/calico.yaml`.

## Review Notes
- The IPv6 service CIDR `fd00:1::/108` is correct — Kubernetes enforces a maximum prefix length of /108 for IPv6 service CIDRs.
- The pod CIDR `fd00::/56` is a valid IPv6 ULA range.
- The Calico env vars (`IP6=autodetect`, `CALICO_IPV6POOL_CIDR`, `FELIX_IPV6SUPPORT=true`) are valid for the manifest-based (non-operator) Calico install used here. If a future revision moves to the tigera-operator install, these should be replaced with fields on the `Installation` custom resource instead.
- `kubectl get pod ... -o jsonpath='{.status.podIPs[1].ip}'` assumes the IPv6 entry is at index 1. With a primary-IPv4 dual-stack setup that is typically the case, but for clusters configured as IPv6-primary the order would differ; readers debugging unexpected output may want to inspect the full `podIPs` array.
- The post pins `busybox:1.36`, which supports `ping6`. Newer busybox releases unify `ping`/`ping6` behind a single `ping` binary that infers address family — keep the pinned tag if `ping6` is required as written.
