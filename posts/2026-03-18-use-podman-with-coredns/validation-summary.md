# Validation Summary: How to Use Podman with CoreDNS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- CoreDNS
- DNS
- etcd
- Prometheus
- Compose-style container deployment

## Sources Consulted
- CoreDNS etcd plugin: https://coredns.io/plugins/etcd/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS view plugin: https://coredns.io/plugins/view/
- CoreDNS health plugin: https://coredns.io/plugins/health/
- CoreDNS ready plugin: https://coredns.io/plugins/ready/
- CoreDNS Prometheus metrics plugin: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- Podman network create: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman compose: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- etcd configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd in containers: https://etcd.io/docs/v3.5/op-guide/container/
- RFC 6762 (Multicast DNS): https://www.rfc-editor.org/rfc/rfc6762.html
- RFC 2606 (Reserved Top Level DNS Names): https://www.rfc-editor.org/rfc/rfc2606

## Issues Found
- The post used `.local` for unicast DNS examples (`dev.local` and `services.local`). `.local` is reserved for mDNS, so I changed the examples to `dev.example.test` and `services.example.test`.
- The `stubzones` directive in the `etcd` plugin example is not part of the current CoreDNS `etcd` plugin syntax. I removed it.
- The `dig` SRV lookup example used the arguments in the wrong order. I changed it to `dig @localhost api.services.example.test SRV`.
- The Compose example mounted `/etcd-data` but did not tell etcd to use that directory. I added `--data-dir=/etcd-data`.
- The etcd image version was pinned to an older 3.5 patch release. I updated it to `quay.io/coreos/etcd:v3.5.21`.
- The rewrite plugin example used a `rewrite.example.com:53` server block while rewriting `old-api.example.com`; that server block would not receive those queries. I changed the example to use `.:53`.
- The “DNS over HTTPS forwarding” example actually used the CoreDNS `forward` plugin with `tls://...`, which is DNS over TLS, not DNS over HTTPS. I corrected the label.
- The initial `podman run` example exposed the health port but not the configured readiness or metrics ports. I added host port mappings for `8181` and `9153`.
- The initial setup only created `~/coredns/config`, but later examples wrote files under `~/coredns/config/zones`. I updated the setup command to create the `zones` directory too.
- The health-check script still wrote etcd keys under the old `.local` path and declared `ETCD_ENDPOINT` without using it. I updated the etcd key paths and used `--endpoints="${ETCD_ENDPOINT}"`.
- The monitoring section described `coredns_cache_hits_total` as a hit rate, but it is a counter. I corrected the description and added `coredns_cache_requests_total` as the request counter.

## Review Notes
- The post now aligns with current CoreDNS plugin documentation, current etcd 3.5 container guidance, and Podman network behavior.
- `podman compose` is a wrapper around an external Compose provider, so exact behavior still depends on the installed provider on the host.
