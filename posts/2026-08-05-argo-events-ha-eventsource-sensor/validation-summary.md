# Validation Summary: High-Availability Argo EventSources and Sensors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Events
- Argo EventSources and Sensors
- Argo EventBus implementations (JetStream, NATS, and Kafka)
- Kubernetes Deployments, Services, Leases, RBAC, pod anti-affinity, PriorityClasses, and PodDisruptionBudgets
- Kafka consumer groups, partitions, retention, and Sensor coordination topics
- Prometheus metrics

## Sources Consulted
- Argo Events EventSource high availability - https://argoproj.github.io/argo-events/eventsources/ha/
- Argo Events Sensor high availability - https://argoproj.github.io/argo-events/sensors/ha/
- Argo Events HA/DR recommendations - https://argoproj.github.io/argo-events/dr_ha_recommendations/
- Argo Events JetStream EventBus documentation - https://argoproj.github.io/argo-events/eventbus/jetstream/
- Argo Events EventBus anti-affinity documentation - https://argoproj.github.io/argo-events/eventbus/antiaffinity/
- Argo Events Kafka EventBus documentation - https://argoproj.github.io/argo-events/eventbus/kafka/
- Argo Events Prometheus metrics - https://argoproj.github.io/argo-events/metrics/
- Argo Events API reference - https://argoproj.github.io/argo-events/APIs/
- Argo Events v1.9.11 release - https://github.com/argoproj/argo-events/releases/tag/v1.9.11
- Argo Events v1.9.11 EventSource type and recreate-strategy definitions - https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/apis/events/v1alpha1/const.go
- Argo Events v1.9.11 EventSource leader-election path - https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/eventsources/eventing.go
- Argo Events v1.9.11 Sensor leader-election and rate-limiter implementation - https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/listener.go
- Argo Events v1.9.11 NATS and Kubernetes leader-election implementation - https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/shared/leaderelection/leaderelection.go
- Argo Events v1.9.11 EventSource and Sensor pod-template implementation - https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/apis/events/v1alpha1/template.go
- NATS JetStream disaster recovery - https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/disaster_recovery
- Kubernetes Leases - https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes pod affinity and anti-affinity - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- Kubernetes admission controllers (`LimitPodHardAntiAffinityTopology` and `Priority`) - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes readiness probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudgets - https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post advised treating documentation shipped with an installed Argo Events release as authoritative for EventSource HA classification. The v1.9.11 HA table omits several EventSource types that the same release implements. I changed the guidance to require checking the exact release implementation when a type is absent from the HA table.
- The placement example referenced a custom `platform-critical` PriorityClass without stating that it must already exist. Kubernetes rejects a Pod whose `priorityClassName` cannot be resolved, so I added that prerequisite to the snippet.
- The post said hard zone anti-affinity could make every pod Pending. The first replica can normally schedule, while replicas that exceed the available topology domains remain Pending. I corrected that behavior and added the Kubernetes caveat that clusters enabling `LimitPodHardAntiAffinityTopology` reject hard pod anti-affinity with a zone topology key.
- The retention guidance treated EventBus retention as protection for both EventSource and Sensor outages. EventBus retention cannot preserve an event that an unavailable EventSource never ingested. I separated EventBus retention for Sensor downtime from upstream retention for EventSource downtime and catch-up.
- The post said Deployment readiness proves that containers passed readiness probes. Kubernetes considers a container ready by default when it has no readiness probe. I corrected the statement and retained the important distinction between Kubernetes readiness and an end-to-end event-path check.

## Review Notes
- The review used Argo Events v1.9.11, released July 13, 2026, as the latest published release on the validation date.
- The current HA documentation tables do not classify every EventSource supported by v1.9.11. In that release, the implementation's recreate-strategy list also drives whether an EventSource enters the leader-election path, so unlisted source types should be checked against the exact release source.
- The `argoproj.io/v1alpha1` resource API, `spec.replicas`, `spec.template` placement fields, leader-election annotation, Lease RBAC verbs, generated pod labels, Kafka Sensor scaling guidance, and metric descriptions in the post match the current official documentation and v1.9.11 implementation.
