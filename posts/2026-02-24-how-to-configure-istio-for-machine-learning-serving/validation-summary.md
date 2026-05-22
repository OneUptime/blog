# Validation Summary: How to Configure Istio for Machine Learning Serving

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- TensorFlow Serving
- Prometheus / PromQL
- gRPC
- Service mesh traffic management

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualServiceDestinationPortSelectorRequired analyzer: https://istio.io/latest/docs/reference/config/analysis/ist0112/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- TensorFlow Serving Docker documentation: https://www.tensorflow.org/tfx/serving/docker

## Issues Found
- The TensorFlow Serving Deployment mounted models at `/models/mymodel` but did not set `MODEL_NAME`. Added `MODEL_NAME=mymodel` to both versioned Deployments so TensorFlow Serving serves the mounted model under the expected model name.
- The Istio manifests used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API version used in the official Istio networking references.
- Several VirtualService routes pointed to `tf-serving`, a multi-port Kubernetes Service, without specifying a destination port. Added explicit `port.number: 8501` to HTTP routes so Istio can select the intended service port.
- The outlier detection explanation described `interval: 30s` as a 30-second error window. Istio defines it as the interval between ejection sweep analyses, so the wording was corrected.
- The external VirtualService routed 90% of traffic to `tf-serving` without a subset, which would use all service endpoints instead of only the stable version. Added `subset: v1`.
- The sidecar resource example looked like a standalone `Deployment` manifest but omitted required Deployment fields. Completed the snippet with the required selector, pod labels, and container fields so it is structurally valid as a Deployment example.
- The Prometheus `promtool query instant` command omitted the required Prometheus server argument. Added `http://localhost:9090` for execution inside the Prometheus pod.

## Review Notes
- The examples use short service host names such as `tf-serving`; Istio supports this, but fully qualified service names reduce cross-namespace ambiguity in production manifests.
