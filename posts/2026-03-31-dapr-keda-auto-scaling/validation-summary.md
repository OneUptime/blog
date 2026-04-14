# Validation Summary: How to Use Dapr with KEDA for Auto-Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- KEDA (Kubernetes Event-Driven Autoscaler)
- Kubernetes (Deployments, HPA, Events)
- Apache Kafka (pub/sub scaler)
- Redis Streams (pub/sub scaler)
- Helm (package manager for Kubernetes)
- Python / Flask (consumer application example)

## Sources Consulted
- KEDA official documentation — ScaledObject spec: https://keda.sh/docs/latest/concepts/scaling-deployments/
- KEDA Kafka scaler reference: https://keda.sh/docs/latest/scalers/apache-kafka/
- KEDA Redis Streams scaler reference: https://keda.sh/docs/latest/scalers/redis-streams/
- KEDA TriggerAuthentication reference: https://keda.sh/docs/latest/concepts/authentication/
- KEDA Helm deployment guide: https://keda.sh/docs/latest/deploy/
- KEDA source code (ScaledObject types, event reasons)
- Dapr pub/sub subscription API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kafka component documentation: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/

## Issues Found

### 1. Incorrect KEDA event field selector (monitoring command)
- **What was wrong:** `kubectl get events --field-selector reason=KEDA -w` used `reason=KEDA`, but KEDA does not emit events with the reason literal "KEDA". KEDA uses specific reason strings like `KEDAScaleTargetActivated`, `KEDAScaleTargetDeactivated`, `ScaledObjectReady`, etc.
- **What was changed:** Replaced with `kubectl get events --field-selector involvedObject.kind=ScaledObject -w`, which correctly filters for events related to KEDA ScaledObject resources.

### 2. Incorrect HPA label selector (monitoring command)
- **What was wrong:** `kubectl get hpa -l app=order-consumer` assumed the KEDA-managed HPA would have an `app=order-consumer` label. However, the ScaledObject definition in the blog does not include that label, and KEDA does not automatically add it. KEDA adds its own label `scaledobject.keda.sh/name` to managed HPAs.
- **What was changed:** Replaced with `kubectl get hpa -l scaledobject.keda.sh/name=order-consumer-scaledobject`, which uses the label KEDA actually applies to managed HPAs.

### 3. Misleading scale-to-zero explanation
- **What was wrong:** The text stated "Dapr's pub/sub automatically reconnects and delivers buffered messages," which incorrectly implies Dapr buffers messages and performs reconnection. In reality, messages are retained by the message broker (e.g., Kafka), and when KEDA scales from zero, a completely new pod with a fresh Dapr sidecar is created — there is no "reconnection."
- **What was changed:** Replaced with an accurate description: "When KEDA scales the deployment from zero, a new pod is created with a fresh Dapr sidecar. The message broker (e.g., Kafka) retains messages regardless of consumer availability, so the consumer rejoins its consumer group and resumes processing from the last committed offset."

## Review Notes
- The Dapr programmatic subscription endpoint uses the legacy `route` field format instead of the newer `routes` object format (e.g., `"routes": {"default": "/process-order"}`). Both formats are supported by the Dapr runtime, so the blog's usage is functional, but the newer format is preferred in current documentation.
- The Deployment YAML is intentionally abbreviated (missing `selector`, `containers`, etc.) for brevity, which is acceptable for a tutorial but readers should be aware it is not a complete manifest.
- The KEDA ScaledObject API version `keda.sh/v1alpha1` is correct — despite the "alpha1" suffix, this is the stable and only API version used by KEDA since v2.0.
- The Kafka `consumerGroup` value in the KEDA ScaledObject must match exactly what the Dapr Kafka component uses. If the Dapr component does not explicitly set a `consumerGroup`, it defaults to the Dapr app-id. The blog should ideally note this alignment requirement.
