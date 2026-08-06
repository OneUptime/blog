# Validation Summary: Argo Events Trigger Retries and Dead-Letter Triggers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Events Sensor CRD
- Argo Events HTTP triggers and trigger policies
- Trigger retry strategies and exponential backoff
- Dead-letter triggers
- Kubernetes `wait.Backoff`
- Prometheus metrics for Argo Events
- Idempotency and controlled replay

## Sources Consulted
- [Argo Events v1.9.11 release](https://github.com/argoproj/argo-events/releases/tag/v1.9.11)
- [Argo Events: More About Sensors and Triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events HTTP trigger documentation](https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/)
- [Argo Events metrics documentation](https://argoproj.github.io/argo-events/metrics/)
- [Argo Events v1.9.11 retry implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/shared/util/retry.go)
- [Argo Events v1.9.11 Sensor listener implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/listener.go)
- [Argo Events v1.9.11 HTTP trigger implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/triggers/http/http.go)
- [Argo Events v1.9.11 Kafka trigger implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/triggers/kafka/kafka.go)
- [Kubernetes apimachinery v0.32.2 backoff implementation](https://github.com/kubernetes/apimachinery/blob/v0.32.2/pkg/util/wait/backoff.go)

## Issues Found
- The primary HTTP example had no `policy.status.allow`. In Argo Events, an HTTP response is considered successful regardless of its status code when that policy is absent, so `429` and `5xx` responses would not have activated retries or the DLQ. Added an explicit trigger-level status policy and JSON content type.
- The Kafka DLQ example could not demonstrate observable durable acceptance. The v1.9.11 Kafka trigger submits to Sarama's asynchronous producer and returns success before broker acknowledgement; later producer errors are logged rather than returned to the Sensor retry loop. Replaced it with an HTTP ingestion trigger that accepts only `202`, and documented that the service must return `202` only after durable storage.
- The explanation of `steps` was unnecessarily indeterminate. In v1.9.11, Argo Events passes `steps` to Kubernetes `wait.ExponentialBackoff`, where it limits total condition executions, including the first. Clarified that `steps: 4` permits at most four attempts and three intervening sleeps.
- The retry guidance implied failures could be selected by category. `retryStrategy` has no per-error predicate and retries every error returned by the trigger implementation. Clarified HTTP transport and status-policy behavior and updated the malformed-event test case accordingly.
- The post described `spec.errorOnFailedRound` as an effective circuit breaker. Although the field and that description remain in the v1.9.11 API schema, the current Sensor runtime does not read the field. Replaced the operational recommendation with a warning not to depend on it in v1.9.11.
- Clarified why `atLeastOnce: true` is required in the current runtime: it makes trigger execution blocking so failures reach the retry and DLQ path.

## Review Notes
- The revised full Sensor manifest was linted successfully with the Argo Events v1.9.11 `argo-events lint` implementation.
- `dynamicHeaders`, `secureHeaders`, `retryStrategy`, `dlqTrigger`, and the documented retry-failure metric are present in the current API/runtime.
- Recheck release-specific implementation details when upgrading, particularly `steps`, HTTP success policy, Kafka producer acknowledgement behavior, and `errorOnFailedRound`.
