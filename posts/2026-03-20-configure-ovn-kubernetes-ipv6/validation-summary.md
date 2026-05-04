# Validation Summary: How to Configure OVN-Kubernetes for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OVN-Kubernetes (CNI)
- Open Virtual Network (OVN)
- Open vSwitch (OVS)
- Kubernetes (NetworkPolicy, Service, dual-stack networking)
- IPv6
- ovn-nbctl / ovs-ofctl CLI tooling
- Helm

## Sources Consulted
- OVN-Kubernetes upstream repository: https://github.com/ovn-kubernetes/ovn-kubernetes
- OVN-Kubernetes Helm chart `ovn-config` ConfigMap: `helm/ovn-kubernetes/templates/ovn-setup.yaml`
- OVN-Kubernetes dual-stack KIND helper: `contrib/kind-common.sh`
- Kubernetes documentation: dual-stack services and `ipFamilyPolicy`/`ipFamilies` fields
- Kubernetes documentation: NetworkPolicy `ipBlock` semantics
- Open vSwitch `ovs-ofctl` and OVN `ovn-nbctl` man pages
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- OpenShift release notes: OVN-Kubernetes default in 4.12+, OpenShift SDN deprecation in 4.14, removal in 4.17

## Issues Found
1. **Fabricated ConfigMap fields removed.** The original Step 2 ConfigMap listed keys (`v6cidr`, `v4cidr`, `v6servicecidr`, `v4servicecidr`, `enable_ipv6`, `enable_ipv4`) that do not exist in the OVN-Kubernetes `ovn-config` ConfigMap. Verified against the upstream Helm chart, the only data keys are `net_cidr`, `svc_cidr`, `k8s_apiserver`, `mtu`, and `host_network_namespace`. OVN-Kubernetes infers IP family from the CIDR strings themselves. Rewrote the example to use only the real keys with comma-separated dual-stack CIDRs in the documented `<cidr>/<host-subnet-length>` format.
2. **Non-existent install path corrected.** The original Step 1 instructed `kubectl apply -f dist/images/ovn-kubernetes.yaml`, but no such file exists in the repository (`dist/images/` only contains Dockerfiles and shell scripts; rendered manifests are produced from `dist/templates/*.j2` at build time). Replaced with the upstream-supported Helm chart install (`helm install ovn-kubernetes ./helm/ovn-kubernetes ...`).
3. **Outdated repository URL updated.** The repo moved from `ovn-org/ovn-kubernetes` to `ovn-kubernetes/ovn-kubernetes`. Updated the `git clone` URL.
4. **Service CIDR adjusted to upstream default.** Changed the IPv6 service CIDR example from `fd00:10:96::/108` to `fd00:10:96::/112` to match the upstream OVN-Kubernetes default; also corrected the IPv4 service CIDR from `/12` to `/16` to match upstream defaults. (Both `/108` and `/112` are valid in upstream Kubernetes, which caps IPv6 service CIDR at `/108`.)
5. **Conclusion updated** to reference the actual `net_cidr`/`svc_cidr` keys instead of the fabricated `v4cidr`/`v6cidr` ones.

## Review Notes
- `ping6` is deprecated on modern Linux distributions (iputils now ships a unified `ping`), but it still works on most container images and is fine in a debug context.
- The `2001:db8::/32` prefix used in the NetworkPolicy `ipBlock` example is the official IPv6 documentation prefix per RFC 3849 — appropriate for examples.
- `ipFamilyPolicy: PreferDualStack` and `ipFamilies: [IPv6, IPv4]` are valid Kubernetes Service fields; setting `IPv6` first makes it the primary family.
- Steps 3 and 6 use real `ovn-nbctl` and `ovs-ofctl` subcommands (`ls-list`, `lsp-list`, `lr-list`, `lr-route-list`, `lb-list`, `dump-flows`).
- The repo is undergoing migration; users may still be redirected from the old `ovn-org` path, but new clones should use the current canonical URL.
