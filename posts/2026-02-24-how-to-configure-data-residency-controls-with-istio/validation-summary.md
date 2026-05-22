# Validation Summary: How to Configure Data Residency Controls with Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio traffic management
- Istio AuthorizationPolicy
- Istio ingress and east-west gateways
- Kubernetes topology labels
- Prometheus metrics and PromQL
- Bash, curl, and jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality load balancing task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated the examples to the current stable `networking.istio.io/v1` and `security.istio.io/v1` API versions used by the official Istio references.
- The first DestinationRule described subsets as being based on locality and matched `topology.kubernetes.io/region` directly in subset labels. DestinationRule subsets select endpoint/workload labels, while Istio locality is handled through endpoint locality metadata and `localityLbSetting`. Updated the text to explain this distinction and changed the subset labels to application-level `data-region` labels.
- The US locality-aware load balancing example omitted `outlierDetection`, which Istio's locality distribution task shows as required for distribution behavior to work correctly. Added the same outlier detection settings used in the EU example.
- The east-west gateway AuthorizationPolicy used `operation.hosts` to block traffic to a Kubernetes service host. Istio documents `hosts` as an HTTP Host header match, so that is not reliable for opaque TCP or mTLS passthrough gateway traffic. Updated the text and example to use source namespace plus the east-west gateway port instead.

## Review Notes
The examples are technically valid as illustrative policy and routing patterns, but production data residency enforcement still depends on accurate workload labeling, correct trust boundaries between namespaces, regional DNS and load balancer placement, and audit controls outside Istio.
