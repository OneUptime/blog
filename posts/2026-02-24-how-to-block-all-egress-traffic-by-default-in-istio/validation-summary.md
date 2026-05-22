# Validation Summary: How to Block All Egress Traffic by Default in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio outbound traffic policy
- Istio ServiceEntry
- Istio Sidecar
- Istio Telemetry API
- Istio egress gateway
- Kubernetes NetworkPolicy
- Prometheus / PromQL
- kubectl and istioctl

## Sources Consulted
- Istio: Accessing External Services - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio: ServiceEntry reference - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio: Sidecar reference - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio: MeshConfig OutboundTrafficPolicy reference - https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio: Envoy Access Logs / Telemetry API - https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio: Egress Gateways - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio: Egress using Wildcard Hosts - https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction described `REGISTRY_ONLY` as blocking all egress traffic. Istio documents this as sidecar behavior for unknown destinations, not a complete outbound firewall or security policy. Updated the wording to say it applies to sidecar-managed unknown egress traffic.
- The post suggested directly editing the `istio` ConfigMap with `jq` to switch modes. This is brittle because the default `ALLOW_ANY` value may not be explicitly present and Istio documents changing the setting through the original `istioctl install` flow. Replaced the command with `istioctl install <flags-you-used-to-install-Istio> --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY`, and used the corresponding `ALLOW_ANY` command for rollback.
- The allow-list text implied only the three example external hosts would be reachable. Kubernetes services and any other configured ServiceEntries remain reachable, so the statement now says other unknown external hosts remain blocked.
- The container registry example implied clusters generally need registry ServiceEntries for basic image pulls. Container image pulls are normally performed by kubelet on the node, not by application pods through an Istio sidecar. Updated the wording to limit the registry ServiceEntry example to workloads that call registry APIs directly.
- The NetworkPolicy section said external traffic must go through an egress gateway, but the snippet only allows traffic to pods in `istio-system`; it does not configure Istio routing through an egress gateway by itself. Updated the explanation to say this helps only when egress gateway routing is also configured.

## Review Notes
The remaining Istio API versions and field names reviewed are current for Istio 1.30 documentation. `REGISTRY_ONLY` is useful for detecting and failing unknown sidecar egress, but future revisions should continue to avoid presenting it as a standalone security boundary; enforcement still requires sidecar coverage plus external controls such as NetworkPolicy, firewalls, or equivalent cluster/network policy.
