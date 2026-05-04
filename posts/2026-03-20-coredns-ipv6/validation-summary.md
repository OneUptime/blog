# Validation Summary: How to Configure CoreDNS for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS (Corefile, kubernetes plugin, forward plugin, ready/health plugins)
- Kubernetes (kubectl, Services, ConfigMaps, dual-stack networking)
- DNS (A and AAAA records, reverse lookups via in-addr.arpa / ip6.arpa)
- DNS64 / NAT64 (well-known prefix `64:ff9b::/96`, RFC 6052)
- IPv6 addressing (ULA `fd00::/8`, dual-stack ClusterIPs)
- busybox / alpine container images, dig (bind-tools), nslookup

## Sources Consulted
- CoreDNS plugin documentation: https://coredns.io/plugins/ (specifically `ready`, `health`, `kubernetes`, `forward`, `cache`, `reload`)
- CoreDNS `ready` plugin: https://coredns.io/plugins/ready/ — confirms default port `:8181`
- CoreDNS `health` plugin: https://coredns.io/plugins/health/ — confirms default port `:8080`
- CoreDNS `kubernetes` plugin: https://coredns.io/plugins/kubernetes/ — confirms zone syntax `cluster.local in-addr.arpa ip6.arpa` and `pods insecure` option
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/ — confirms `ipFamilyPolicy` values (`SingleStack`, `PreferDualStack`, `RequireDualStack`) and `ipFamilies`/`clusterIPs` schema
- RFC 6052 (IPv6 Addressing of IPv4/IPv6 Translators) — confirms `64:ff9b::/96` well-known prefix for DNS64/NAT64
- RFC 4291 (IP Version 6 Addressing Architecture) — confirms embedded-IPv4 notation `64:ff9b::8.8.8.8` is valid IPv6 textual representation
- Alpine package docs — confirms `apk add bind-tools` provides `dig`; busybox base image has no `apk`

## Issues Found
1. **Wrong port for CoreDNS readiness endpoint.** The troubleshooting section ran `wget -qO- http://localhost:8080/ready`. Port `8080` is the default for the `health` plugin (path `/health`); the `ready` plugin defaults to port `8181`. Fixed by changing the URL to `http://localhost:8181/ready` and adding a clarifying comment.
2. **`apk add bind-tools` against a `busybox` image.** The test pod was created with `--image=busybox`, then later told to run `apk add bind-tools -q`. busybox has no `apk` (apk is Alpine's package manager), so this would fail. Changed the test pod image to `alpine`, which still provides `nslookup` (busybox-derived) for the earlier checks and supports `apk add bind-tools` for the dig test.

## Review Notes
- The default Corefile shown matches the upstream Kubernetes/CoreDNS deployment manifest and the dual-stack zone list (`cluster.local in-addr.arpa ip6.arpa`) is correct.
- `ipFamilyPolicy: RequireDualStack` with `ipFamilies: [IPv4, IPv6]` and matching `clusterIPs` is a valid dual-stack Service spec.
- The DNS64 forwarder example uses `64:ff9b::8.8.8.8`, which is valid IPv6 textual notation per RFC 4291 (embedded-IPv4 form). CoreDNS's forward plugin accepts this via Go's `net.ParseIP`. Equivalent canonical form is `64:ff9b::808:808`.
- busybox `nslookup` support for `-type=AAAA` depends on busybox version (supported in modern 1.31+ builds). Switching the test pod to `alpine` keeps the same busybox-derived `nslookup` and is a safe substitution.
- The `reload` plugin polls every 30s by default (with a small jitter), so ConfigMap edits propagate within ~1 minute — the post's "auto-reloads" wording is accurate but the latency is worth keeping in mind.
