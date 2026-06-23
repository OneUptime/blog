# Validation Summary: How to Debug MetalLB BGP Session Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- MetalLB
- BGP
- Kubernetes Services and endpoints
- Kubernetes CustomResourceDefinitions
- kubectl
- Cisco IOS/IOS-XE
- Juniper JunOS
- FRRouting
- Prometheus metrics

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB troubleshooting documentation: https://metallb.universe.tf/troubleshooting/
- MetalLB usage documentation for BGP traffic policy behavior: https://metallb.universe.tf/usage/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB upstream CRD definitions: https://github.com/metallb/metallb/blob/main/charts/metallb/charts/crds/templates/crds.yaml
- MetalLB upstream Prometheus native overlay: https://github.com/metallb/metallb/blob/main/config/prometheus-native/prometheus-operator.yaml
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The `kubectl describe bgppeer` example omitted the namespace for the namespaced `BGPPeer` resource. Updated it to include `-n metallb-system`.
- The test LoadBalancer service example had no backing workload, so it would not create healthy endpoints and would not prove BGP advertisement. Added a minimal `Deployment` with matching labels.
- The debugging script used `kubectl get svc -A --field-selector spec.type=LoadBalancer`, but Kubernetes Service field selectors do not consistently support `spec.type`. Replaced it with `kubectl get svc -A | grep LoadBalancer || true`.
- The eBGP multihop section did not mention that MetalLB's `ebgpMultiHop` field is for FRR-based modes. Added that caveat.
- The MD5 authentication example created a generic secret and referenced it through `password`, which would treat the secret name as the literal password. Changed the secret to type `kubernetes.io/basic-auth` and referenced it with `passwordSecret.name`.
- The BFD recommendation was too broad. Updated it to apply to FRR-based modes, which is how current MetalLB documents BFD support.
- The metrics example used an outdated service name/port and only listed `metallb_bgp_*` metrics. Updated it to the current `speaker-monitor-service` on port `9120`, HTTPS curl with `-k`, and both `metallb_bgp_*` and default FRR-K8s `frrk8s_bgp_*` metric names.

## Review Notes
The post is now technically valid for current MetalLB CRD-based configuration. Some router log strings and vendor command outputs are illustrative and can vary by platform/version, but the underlying troubleshooting guidance is accurate.
