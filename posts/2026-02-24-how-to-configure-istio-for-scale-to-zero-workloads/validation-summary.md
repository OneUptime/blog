# Validation Summary: How to Configure Istio for Scale-to-Zero Workloads

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- Istio
- Knative Serving
- Knative Pod Autoscaler
- KEDA
- Prometheus
- RabbitMQ
- Kubernetes YAML manifests

## Sources Consulted
- Knative autoscaling overview: https://knative.dev/docs/serving/autoscaling/
- Knative scale bounds and autoscaling annotation keys: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative scale-to-zero configuration: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative target burst capacity and activator behavior: https://knative.dev/docs/serving/load-balancing/target-burst-capacity/
- Knative Istio installation and mTLS guidance: https://knative.dev/docs/install/installing-istio/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.15/scalers/rabbitmq-queue/
- Istio VirtualService retry reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio sidecar injection resource customization guidance: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The Knative Service example used `autoscaling.knative.dev/minScale` and `autoscaling.knative.dev/maxScale`. Current Knative documentation uses `autoscaling.knative.dev/min-scale` and `autoscaling.knative.dev/max-scale`, so the annotations and explanatory text were updated.
- The description of `scale-to-zero-grace-period` incorrectly described it as the time after the last request before scaling to zero. Knative documents it as the maximum time allowed for scale-from-zero routing setup before removing the last pod, so the explanation was corrected and pointed readers to `scale-down-delay`, `scale-to-zero-pod-retention-period`, and the stable window for keeping pods warm.
- The `target-burst-capacity` explanation said any positive value keeps the activator in the request path. Knative documents `0` as scale-from-zero only, `-1` as always in path, and other values as conditional based on scale and load, so the description was corrected.
- The RabbitMQ KEDA scaler example used the deprecated `queueLength` metadata field. It was replaced with `mode: QueueLength` and `value: "5"` according to current KEDA RabbitMQ scaler documentation.
- The Istio VirtualService section implied timeouts and retries handle the no-backend-pods case by themselves. The text now clarifies that retries do not trigger scale-up or buffer HTTP requests, and that a Knative activator or another request-buffering component is still required.
- The DestinationRule explanation said `connectTimeout` allows for pod startup time. Istio's `connectTimeout` applies to TCP connection establishment to ready endpoints, so the text now clarifies that it does not make Istio wait for pods that do not exist yet.
- The Istio sidecar resource annotation example set proxy CPU and memory requests without limits. Istio documentation recommends explicitly setting `sidecar.istio.io/proxyCPULimit` and `sidecar.istio.io/proxyMemoryLimit` when setting those request annotations, so limits were added.
- The PeerAuthentication section recommended PERMISSIVE mode for application namespaces with scale-to-zero services. Knative's Istio mTLS guidance specifically calls for sidecar injection and PERMISSIVE mode in the `knative-serving` namespace, so the namespace and explanation were corrected.

## Review Notes
The remaining examples are intentionally generic and assume the corresponding Knative, KEDA, Istio, Prometheus, and RabbitMQ components already exist in the cluster. The VirtualService and DestinationRule snippets may still need service-specific hostnames, gateways, ports, and traffic policy tuning in a production mesh.
