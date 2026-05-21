# Validation Summary: How to Set Up Istio Ingress Gateway for External Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio ingress gateways
- Istio Gateway and VirtualService resources
- Kubernetes Services, Deployments, and HorizontalPodAutoscaler
- Kubernetes topology spread constraints
- Prometheus queries for Istio standard metrics
- kubectl and istioctl commands

## Sources Consulted
- Istio Ingress Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Installation Configuration Profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The scaling example showed a partial `Deployment` manifest with `replicas` and `topologySpreadConstraints`, but it omitted required Deployment fields such as `spec.selector`, matching pod template labels, and the container template. Applying it as shown would fail. I changed it to a `kubectl scale` command plus a `kubectl patch deployment` command that updates the existing `istio-ingressgateway` Deployment.
- The PromQL examples filtered on `source_workload="istio-ingressgateway"` without specifying the Istio `reporter` label. Istio documents gateways as `reporter="source"`, so I added that label to the request rate, error rate, and latency queries to make the intended gateway series explicit.

## Review Notes
- The Istio Gateway and VirtualService examples use current `networking.istio.io/v1` APIs and match Istio's documented ingress pattern.
- The examples assume the default `istioctl` installation namespace and gateway name, `istio-system/istio-ingressgateway`. Istio's Helm gateway installation commonly uses `istio-ingress/istio-ingress`, so readers using Helm may need to adjust names and namespaces.
- The HPA example is valid for `autoscaling/v2`, but CPU utilization metrics require resource requests on the target pods and a working metrics API such as Metrics Server.
