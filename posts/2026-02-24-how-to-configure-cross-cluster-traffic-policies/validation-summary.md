# Validation Summary: How to Configure Cross-Cluster Traffic Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Multi-cluster service mesh
- VirtualService
- DestinationRule
- AuthorizationPolicy
- istioctl
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio multi-cluster traffic management guide: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio multicluster installation prerequisites: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The AuthorizationPolicy example used `source.cluster`, but Istio's supported AuthorizationPolicy condition keys do not include a built-in `source.cluster` attribute. I changed the example to use the supported `request.headers[x-source-cluster]` condition and added a caveat that this only works when a trusted gateway or proxy injects or overwrites that header.
- The locality load balancing examples omitted `localityLbSetting.enabled: true`. While locality load balancing can also be enabled mesh-wide, Istio's task documentation shows enabling it explicitly in the DestinationRule for self-contained locality examples, so I added `enabled: true` to both locality examples.
- The connection pool section said cross-cluster traffic goes through an east-west gateway. That is accurate for multi-network deployments but not for all Istio multicluster topologies, so I narrowed the statement to multi-network deployments.

## Review Notes
- The VirtualService, DestinationRule, retry, mirroring, connection pool, and istioctl examples match current Istio 1.30 API and command documentation.
- Cluster-specific routing can also be implemented with DestinationRule subsets using the built-in `topology.istio.io/cluster` label, as shown in Istio's multi-cluster traffic management documentation.
