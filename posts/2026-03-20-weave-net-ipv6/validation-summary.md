# Validation Summary: How to Configure Weave Net for IPv6 in Kubernetes

## Status
not-technically-relevant

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Weave Net (CNI plugin)
- Kubernetes
- IPv6 / dual-stack networking
- Cilium (mentioned as migration target)

## Sources Consulted
- Weave Net official Kubernetes add-on docs — environment variable reference: https://github.com/weaveworks/weave/blob/master/site/kubernetes/kube-addon.md
- Weave Net GitHub issue #19 "support IPv6" (feature request, never implemented, remained in "icebox" milestone): https://github.com/weaveworks/weave/issues/19
- Weave Net CHANGELOG: https://github.com/weaveworks/weave/blob/master/CHANGELOG.md
- Weaveworks / Weave Net repository (archived June 20, 2024): https://github.com/weaveworks/weave

## Issues Found

The blog post is fundamentally technically incorrect and cannot be salvaged with minor edits. The core premise — that Weave Net can be configured for IPv6 via environment variables — is false.

Specific problems:

1. **`IPV6=1` environment variable does not exist.** The official Weave Net kube-addon documentation lists exactly 14 supported environment variables: `CHECKPOINT_DISABLE`, `CONN_LIMIT`, `HAIRPIN_MODE`, `IPALLOC_RANGE`, `EXPECT_NPC`, `KUBE_PEERS`, `IPALLOC_INIT`, `WEAVE_EXPOSE_IP`, `WEAVE_METRICS_ADDR`, `WEAVE_PASSWORD`, `WEAVE_STATUS_ADDR`, `WEAVE_MTU`, `NO_MASQ_LOCAL`, `IPTABLES_BACKEND`. Neither `IPV6` nor `IPALLOC_RANGE_V6` appears in that list or anywhere in the Weave Net source / docs.

2. **`IPALLOC_RANGE_V6` environment variable does not exist.** Same reason as above. Weave Net's IPAM is IPv4-only (`IPALLOC_RANGE` defaults to `10.32.0.0/12`, IPv4).

3. **Weave Net does not support IPv6 pod networking.** Issue #19 (the tracking issue for IPv6 support) was opened in September 2014 and was placed in the "icebox" milestone. It was never implemented. The issue enumerates multiple IPv4-specific assumptions (PMTU discovery, fragmentation, peer connections using udp4/tcp4, overhead calculations) that would need to be redesigned for IPv6. None of that work ever landed.

4. **The Weave Net repository was archived on 2024-06-20** (read-only). No new features, including IPv6, will ever be added. Weaveworks itself shut down in 2024.

5. **The verification steps would not work.** `kubectl get pod ... -o jsonpath='{.status.podIPs[1].ip}'` assumes pods receive IPv6 addresses from Weave; they do not. `ip -6 addr show weave` would show nothing IPv6-related. `/home/weave/weave --local status ipam` has no IPv6 output because Weave IPAM is IPv4-only.

6. **Install URL is effectively dead.** `https://cloud.weave.works/k8s/net` was the Weaveworks SaaS endpoint that generated manifests. After Weaveworks shut down and the repo was archived, this endpoint is unreliable / no longer maintained.

Because every core technical instruction in the post describes a feature that does not exist in the software, the post cannot be corrected without rewriting it into a different article (e.g., "migrate from Weave Net to Cilium for IPv6"). Per the review rubric ("do not add new sections, restructure the post, or make stylistic changes"), fixing is out of scope. The post should be removed.

## Review Notes

- The post's disclaimer that "Weave Net is in maintenance mode" understates reality — Weave Net is archived and abandoned, not merely in maintenance.
- The migration-to-Cilium section at the bottom is the only technically useful content; users should use Cilium (or Calico) for IPv6 in Kubernetes from the start.
- Recommended replacement topics on the same theme: "Configure Cilium for IPv6 in Kubernetes" or "Configure Calico for dual-stack IPv4/IPv6 in Kubernetes" — both CNIs have real, documented IPv6 support.
