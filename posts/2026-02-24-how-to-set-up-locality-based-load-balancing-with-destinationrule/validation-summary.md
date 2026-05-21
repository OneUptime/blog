# Validation Summary: How to Set Up Locality-Based Load Balancing with DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy locality load balancing
- Istio DestinationRule
- Kubernetes node topology labels
- kubectl
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Locality Load Balancing task documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio Locality failover task documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio Locality weighted distribution task documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found
- The post listed `topology.kubernetes.io/subzone` as an Istio locality label. Istio documents sub-zone as the Istio-specific `topology.istio.io/subzone` label because Kubernetes does not define a built-in sub-zone label. Updated the label and clarified that it is Istio-specific.
- The full production example configured both `distribute` and `failover` under the same `localityLbSetting`. Istio documents `distribute`, `failover`, and `failoverPriority` as mutually exclusive options. Removed the `failover` block and the corresponding explanatory bullet from that distribution-focused example.

## Review Notes
The remaining DestinationRule fields, locality distribution syntax, failover syntax, outlier detection examples, Kubernetes region/zone labels, and istioctl command flags match the current official documentation. The post uses generic service names, so readers may need to adjust hosts, ports, namespaces, and pod names for their own mesh.
