# Validation Summary: How to Configure Load Balancing Policies in DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio traffic management
- Envoy load balancing
- Kubernetes
- istioctl
- kubectl

## Sources Consulted
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post said Istio uses round robin by default. Current Istio documentation says the default load balancing policy is least request, so the introduction, algorithm guidance, and summary were updated.
- The post described least request as "least connections" in the introduction. Istio's current non-deprecated simple load balancer is `LEAST_REQUEST`, so the wording was corrected.
- The random load-balancing explanation described a head-of-line issue and synchronization behavior that is not how Istio documents the option. It was replaced with Istio's documented behavior: random selects a random healthy host and can perform better than round robin when no health checking policy is configured.
- The consistent-hash explanation said the same hash key always goes to the same backend. Istio documents this as soft session affinity that can change when hosts are added or removed, so the wording was corrected.
- The ring hash sizing example used `consistentHash.minimumRingSize`, which Istio now marks deprecated. The example now uses `consistentHash.ringHash.minimumRingSize`.
- The performance section said both ring hash and Maglev maintain a hash ring. Ring hash uses a ring; Maglev uses a lookup table. The wording was generalized to "extra lookup structures."
- The PASSTHROUGH external-service example was clarified to apply to an external service registered in Istio, such as with a ServiceEntry, because DestinationRule hosts are looked up from Istio's service registry.

## Review Notes
- The `apiVersion: networking.istio.io/v1` DestinationRule examples, `simple` load balancer values, subset override pattern, cookie hash example, `istioctl proxy-config cluster --fqdn ... -o json`, and `kubectl run ... --rm -it -- sh` command were verified against current official documentation.
- Istio also exposes a deprecated `LEAST_CONN` simple load balancer value. The post correctly focuses on the current `LEAST_REQUEST` option instead.
