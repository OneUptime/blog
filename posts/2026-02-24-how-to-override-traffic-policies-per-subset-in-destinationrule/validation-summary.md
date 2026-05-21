# Validation Summary: How to Override Traffic Policies per Subset in DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio traffic policies
- Istio subsets
- Istio mTLS
- Kubernetes
- Envoy proxy configuration
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio traffic policy merge implementation: https://raw.githubusercontent.com/istio/istio/master/pilot/pkg/networking/util/util.go

## Issues Found
- The post incorrectly stated that a subset-level `trafficPolicy` completely replaces the top-level `trafficPolicy`. Istio documentation says subsets inherit top-level traffic policies, and settings specified at the subset level override corresponding top-level settings. Updated the explanation and examples to show that a subset-level `loadBalancer` override does not remove the inherited top-level `connectionPool`.
- The post's partial override section repeated inherited `connectionPool` settings unnecessarily. Updated the example so the subset only specifies the changed `loadBalancer` and the overridden `outlierDetection` block, while inheriting the top-level `connectionPool`.
- The common mistakes and conclusion repeated the incorrect full-replacement claim. Updated them to clarify the correct behavior: subset policies inherit top-level policy, while subset-level top-level policy blocks such as `connectionPool`, `outlierDetection`, `loadBalancer`, or `tls` replace their corresponding top-level block.

## Review Notes
The DestinationRule and VirtualService snippets use current `networking.istio.io/v1` APIs and valid field names. The `istioctl proxy-config cluster` commands use documented flags, including `--fqdn`, `--subset`, and `-o json`. Port-level traffic policies have stricter override behavior: omitted destination-level settings are not inherited when a matching port-level policy is used, which is consistent with the article's port-level example.
