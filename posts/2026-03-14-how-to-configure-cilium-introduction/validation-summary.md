# Validation Summary: Configuring Cilium: Getting Started with Installation and Setup

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium CLI
- Hubble
- CiliumNetworkPolicy
- eBPF networking

## Sources Consulted
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Installation using Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium IPAM concepts: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium network policy documentation: https://docs.cilium.io/en/stable/security/policy/

## Issues Found
- The prerequisites stated "Kubernetes cluster (v1.25+)", which is too broad for current Cilium releases. Current Cilium stable documentation lists specific tested Kubernetes versions per Cilium release; for Cilium 1.19, that range is Kubernetes 1.32 through 1.35. Updated the prerequisite to refer to the Cilium release compatibility matrix and included the current Cilium 1.19 example.
- The network mode Helm values used `tunnel: vxlan` and `tunnel: disabled`. Current Cilium Helm values use `routingMode: tunnel` with `tunnelProtocol: vxlan` for VXLAN tunneling, and `routingMode: native` for native routing. Updated the YAML snippet accordingly.
- The Cilium CLI installation snippet was Linux AMD64-specific and omitted checksum verification. Replaced it with the official Linux command pattern that detects AMD64/AArch64 and verifies the downloaded archive.
- The verification section uses `hubble observe`, but the prerequisites did not mention that the Hubble CLI must be installed locally. Added that prerequisite.
- The VXLAN comment said it "works everywhere", which is too broad because VXLAN tunneling depends on kernel support and network/firewall rules. Changed it to "works in most environments."

## Review Notes
- The post enables Hubble in Cilium but does not show Hubble CLI installation. This is acceptable after adding the prerequisite, though a future revision could link to or include the official Hubble CLI install command.
