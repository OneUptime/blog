# Validation Summary: How to Set Up Istio Multi-Cluster Mesh with Multi-Primary Architecture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio multi-cluster mesh
- Istio multi-primary control plane topology
- Kubernetes
- IstioOperator
- istioctl
- Istio VirtualService and DestinationRule
- Locality load balancing
- Argo CD ApplicationSet
- Prometheus/PromQL

## Sources Consulted
- Istio Install Multi-Primary: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio Install Multi-Primary on different networks: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio multicluster prerequisites: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio multicluster verification: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio locality load balancing: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio locality weighted distribution: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus PromQL querying basics and operators: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The architecture summary said control planes communicate to share service discovery. Updated it to clarify that each control plane uses remote secrets to watch other clusters' Kubernetes API servers, matching Istio's multi-primary model.
- The same-network setup omitted required prerequisites. Added that the example assumes direct pod-to-pod connectivity, non-overlapping pod and service CIDRs, and reachable API servers.
- The frontend in cluster-3 called `backend.production.svc.cluster.local`, but no backend Service existed in cluster-3. Added a step to create only the Service in cluster-3 so Kubernetes DNS resolution succeeds while backend workloads remain in clusters 1 and 2.
- The VirtualService and DestinationRule examples used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API used in current Istio documentation.
- The PromQL latency example used `source_cluster!="destination_cluster"`, which compares `source_cluster` to the literal string `destination_cluster` rather than comparing two label values. Replaced it with a latency query grouped by source and destination cluster.

## Review Notes
The tutorial describes a same-network multi-primary deployment because all clusters use `network1`. For different-network deployments, Istio requires east-west gateways and service exposure through those gateways; that is a different installation path.
