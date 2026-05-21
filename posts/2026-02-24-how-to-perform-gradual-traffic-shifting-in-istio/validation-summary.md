# Validation Summary: How to Perform Gradual Traffic Shifting in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio standard metrics and PromQL
- Kubernetes Deployments and Services
- kubectl
- Bash scripting

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic shifting task: https://istio.io/latest/docs/tasks/traffic-management/traffic-shifting/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#scale

## Issues Found
- The prerequisites deployed two versioned Deployments but did not define a Kubernetes Service named `my-service`. Istio route destinations must resolve to a real service-registry host, so I added a Service that selects `app: my-service` and exposes port 80 to container port 8080.
- The Istio examples used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for VirtualService and DestinationRule examples, so I updated all Istio manifests to `networking.istio.io/v1`.
- The first error-rate example used `destination_service="my-service"`, which may not match because Istio's `destination_service` label is the full service host. I changed the examples to use `destination_service_name="my-service"` and grouped by `destination_version`.
- The automation script attempted to inspect Envoy admin stats with `kubectl exec ... curl localhost:15000/stats`, which is not a reliable service-level error-rate check and may fail if the proxy image lacks `curl`. I replaced that with a health-check function placeholder and a PromQL example using Istio standard metrics.
- The monitoring queries were not scoped to the target service and could double count source and destination telemetry. I scoped them to `destination_service_name="my-service"` and `reporter="destination"`.

## Review Notes
- The examples use Kubernetes short names such as `my-service`, which are valid when the Service, VirtualService, and DestinationRule are in the same namespace. Istio recommends fully qualified service names in production to avoid namespace ambiguity.
- The script remains illustrative. In production, the `check_v2_health` gate should call the team's actual Prometheus, Grafana, or deployment automation API and enforce concrete SLO thresholds.
