# Validation Summary: How to Handle Hot Spots in Istio Load Balancing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule load balancing
- Envoy sidecar proxy statistics
- Prometheus and PromQL
- Kubernetes Deployments, Services, readiness probes, PodDisruptionBudgets, and topology spread constraints
- gRPC and HTTP/2 connection behavior

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus operators and functions documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/ and https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, which is the current documented DestinationRule API version.
- The DestinationRule examples used short service names such as `my-service`. Updated them to fully qualified service hostnames to avoid namespace-dependent host resolution ambiguity.
- The initial PromQL examples omitted `reporter="destination"` and used `pod` without caveat. Added the destination reporter filter and kept pod-level grouping, with a later note that `pod` must come from the Prometheus scrape target labels or be replaced with the equivalent label in that setup.
- The gRPC connection explanation said the connection is simply closed after `maxRequestsPerConnection`. Updated the wording to say it is drained and closed, which better matches Envoy/Istio connection-pool behavior.
- The startup timing section referred vaguely to slow start. Updated it to use Istio `warmup`, which is the documented DestinationRule setting for gradually increasing traffic to new endpoints with `ROUND_ROBIN` or `LEAST_REQUEST`.
- The Kubernetes Deployment snippets were incomplete as applyable manifests because they lacked selectors, template labels, and container images. Added the required fields while keeping the examples generic.
- The PDB guidance incorrectly implied PDBs prevent capacity bottlenecks during Deployment rolling updates. Updated the wording to clarify that PDBs cover eviction-based disruptions such as node drains, while rolling updates should be controlled by the workload rollout strategy.
- The hot spot alert compared max and average request rates across raw metric series rather than per-pod service totals. Rewrote the expression to first aggregate request rate by `destination_service` and `pod`, then compare the busiest pod with the average pod for each service.

## Review Notes
- The article remains intentionally generic. In real clusters, the exact pod label used in Prometheus queries depends on scrape configuration and relabeling, so readers may need to substitute `pod`, `instance`, or a custom Kubernetes metadata label.
