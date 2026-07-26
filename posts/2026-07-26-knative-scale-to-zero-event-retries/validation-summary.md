# Validation Summary: How to Prevent Knative Scale-to-Zero Cold Starts from Causing Event Retries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Knative Serving
- Knative Eventing
- Knative Pod Autoscaler (KPA)
- Kubernetes
- CloudEvents
- Apache Kafka ordered delivery

## Sources Consulted
- [Knative: Configuring scale bounds](https://knative.dev/docs/serving/autoscaling/scale-bounds/)
- [Knative: Configuring scale to zero](https://knative.dev/docs/serving/autoscaling/scale-to-zero/)
- [Knative: HTTP request flow](https://knative.dev/docs/serving/request-flow/)
- [Knative: Configuring probes](https://knative.dev/docs/serving/services/configure-probing/)
- [Knative: Serving API reference](https://knative.dev/docs/serving/reference/serving-api/)
- [Knative: Configuring Serving defaults and request timeouts](https://knative.dev/docs/serving/configuration/config-defaults/)
- [Knative: Handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative: Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative: DeliverySpec.Timeout field](https://knative.dev/docs/eventing/features/delivery-timeout/)
- [Knative: Using Triggers](https://knative.dev/v1.21-docs/eventing/triggers/)
- [Knative: JobSink](https://knative.dev/docs/eventing/sinks/job-sink/)
- [Knative: Apache Kafka Broker ordered delivery](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Kubernetes: kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Container images and immutable digests](https://kubernetes.io/docs/concepts/containers/images/)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)

## Issues Found
- The startup guidance said to request enough CPU and memory to avoid startup throttling. Kubernetes applies throttling to CPU limits, while resource requests primarily affect scheduling and reserved resources; memory is not throttled in the same way. Changed the guidance to recommend realistic CPU and memory requests and avoiding CPU limits that throttle startup.
- The retry warning stated unconditionally that a high retry count blocks ordered partitions. Knative Kafka's unordered mode is the default, while its ordered mode is a per-partition blocking consumer. Changed the statement to say that excessive retries can block later events on ordered partitions.

## Review Notes
- The Knative Serving annotations, their placement under the Revision template, the KPA-only restriction for scale-down delay, and the documented duration ranges are correct.
- The Trigger delivery configuration uses valid current fields and values. Delivery behavior still depends on the installed Broker or Channel implementation, as the post notes.
- The Trigger uses the supported legacy `filter.attributes` form. The newer `filters` exact dialect is preferred where available, but the official documentation limits that newer form to the Apache Kafka Broker and MTChannelBasedBroker.
- `DeliverySpec.timeout` is currently documented as a Beta feature enabled by default. The post correctly advises checking the installed Eventing version and implementation.
- `JobSink` is appropriate for long-running asynchronous work, but its current API is `sinks.knative.dev/v1alpha1` if a future revision of the post adds a manifest.
- The example image digest is an explicit placeholder and must be replaced with a real SHA-256 digest before deployment.
