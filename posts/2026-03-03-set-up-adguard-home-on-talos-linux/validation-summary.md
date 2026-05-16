# Validation Summary: How to Set Up AdGuard Home on Talos Linux

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- AdGuard Home (DNS-based ad blocker)
- Talos Linux
- Kubernetes (Deployment, Service, ConfigMap, PVC, initContainers)
- MetalLB (LoadBalancer IP assignment)
- cert-manager (TLS certificates for DoH)
- Prometheus + `ebrianne/adguard-exporter` for metrics
- DNS-over-HTTPS (DoH) and DNS-over-TLS (DoT)

## Sources Consulted
- AdGuardHome GitHub repository and configuration wiki — https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- AdGuardHome `internal/home/config.go` source for `http`, `pprof`, `filtering`, `filters`, `dns` schema
- Official `adguard/adguardhome` image on Docker Hub — https://hub.docker.com/r/adguard/adguardhome
- Cloudflare DNS-over-HTTPS docs — https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/
- `ebrianne/adguard-exporter` Docker Hub and config package — https://hub.docker.com/r/ebrianne/adguard-exporter
- Talos Linux machine config `network.nameservers` field
- Kubernetes Service / PVC / Deployment API references
- MetalLB `loadBalancerIPs` annotation docs

## Issues Found
1. **Invalid Cloudflare DoH upstream URL.** The post listed `https://dns.cloudflare.com/dns-query`, which is not a Cloudflare endpoint. Replaced with the official `https://cloudflare-dns.com/dns-query`.
2. **Invalid `filtering:` config fields.** The `filtering:` block used `enabled: true` and `url: ...`, which are not valid fields under `filtering:` in AdGuardHome.yaml (they belong inside entries of the separate `filters:` list, which is already present below). Replaced with the correct fields `protection_enabled: true` and `filtering_enabled: true`.
3. **Two volumes sharing one PVC.** Both the `config` and `data` volumes were bound to the same `adguard-data` PVC, which would alias `/opt/adguardhome/conf` and `/opt/adguardhome/work` to the same directory. Added a second PVC `adguard-config` (1Gi) and pointed the `config` volume at it; `data` continues to use `adguard-data` (5Gi).

## Review Notes
- The post uses the `:latest` tag for `adguard/adguardhome` and `ebrianne/adguard-exporter`. Pinning to specific versions would be better practice for reproducibility, but `latest` works.
- The example bcrypt hash `$2y$10$changethishashaftersetup` is an obvious placeholder, not a working hash. The post clearly tells readers to change it; left as-is.
- The `adguard-web` Service exposes port 443 and 853, but the deployment will only listen on those ports once DoH/DoT is configured through the web UI or YAML. This sequencing is correct but not called out explicitly.
- The `kubectl cp adguard/adguard-home-xxx:...` backup snippet uses a placeholder pod-name suffix; readers must substitute the real pod name. This is conventional and was left as-is.
