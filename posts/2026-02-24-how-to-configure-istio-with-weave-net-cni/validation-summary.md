# Validation Summary: How to Configure Istio with Weave Net CNI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Weave Net
- Kubernetes
- Kubernetes CNI
- Kubernetes NetworkPolicy
- Istio PeerAuthentication and AuthorizationPolicy
- CoreDNS / Kubernetes DNS

## Sources Consulted
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio CNI node agent installation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Weave Net for NetworkPolicy: https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/weave-network-policy/
- Kubernetes NetworkPolicy concepts/API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Weave Net Kubernetes add-on documentation: https://rajch.github.io/weave/kubernetes/kube-addon
- Weave Net encryption documentation: https://rajch.github.io/weave/concepts/encryption.html
- Weave Net troubleshooting/status documentation: https://rajch.github.io/weave/troubleshooting.html
- Weave Net FAQ, ports, and fast datapath notes: https://rajch.github.io/weave/faq.html

## Issues Found
- The post described Weave Net encryption as only NaCl-based. Updated the explanation to note that Weave uses NaCl for control and sleeve datapath traffic, while encrypted fast datapath traffic uses ESP/IPsec.
- The post implied WeaveDNS is normally present in Kubernetes add-on deployments and suggested disabling it with `WEAVE_DNS=false`. Updated the DNS guidance to reflect that the Weave Net Kubernetes add-on disables WeaveDNS, modern clusters typically use CoreDNS, and `WEAVE_DNS` is not the supported add-on toggle.
- The Istio install example used `ISTIO_META_DNS_AUTO_ALLOCATE` in proxy metadata, which Istio has deprecated. Removed it and kept `ISTIO_META_DNS_CAPTURE`.
- The DNS NetworkPolicy example used an explicit empty `to: []`. Simplified the rule to omit `to`, matching Kubernetes NetworkPolicy semantics for allowing the listed ports to all destinations.
- The Weave status commands used case-sensitive `grep encryption` and checked MTU on the summary status output. Updated them to `grep -i encryption` and `status connections | grep -i mtu`.

## Review Notes
Weave Net is now community-maintained under the Reweave/rajch documentation set, so future readers should verify Kubernetes version compatibility and image freshness before adopting it for a new production cluster. The remaining Istio and Kubernetes API examples use current stable API groups and valid YAML structure.
