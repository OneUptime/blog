# Validation Summary: How to Scale Locust Load Tests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Locust
- Python
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler
- kubectl
- Linux sysctl tuning
- Docker

## Sources Consulted
- Locust distributed load generation documentation: https://docs.locust.io/en/stable/running-distributed.html
- Locust configuration reference: https://docs.locust.io/en/stable/configuration.html
- Locust FastHttpUser performance documentation: https://docs.locust.io/en/stable/increase-performance.html
- Locust writing a locustfile documentation: https://docs.locust.io/en/stable/writing-a-locustfile.html
- Locust API documentation: https://docs.locust.io/en/stable/api.html
- Locust runner source documentation: https://docs.locust.io/en/stable/_modules/locust/runners.html
- Locust Docker documentation: https://docs.locust.io/en/stable/running-in-docker.html
- Docker Hub locustio/locust tags: https://hub.docker.com/r/locustio/locust/tags
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The minimal response validation example called `response.failure()` on a normal response object. Locust documents `response.failure()` for requests made with `catch_response=True` inside a `with` block, so the snippet was changed to use `with self.client.get(..., catch_response=True) as response:`.
- The streaming response example did not close the streamed response after intentionally skipping the body. The snippet now calls `response.close()` in a `finally` block so the connection can be released.
- The Kubernetes examples pinned `locustio/locust:2.20.0`, which is outdated relative to the current Locust documentation and Docker Hub stable tags. The image tag was updated to `locustio/locust:2.44.1`.
- The master deployment used `--expect-workers=50` without `--headless` or `--autostart`. Locust documents this option as only used with automatic test start modes, so the unused flag was removed from the web UI based master example.
- The monitoring example read `environment.runner.user_greenlets` directly. That internal detail is not the portable way to count users across local, master, and worker runners; the snippet now uses the documented `environment.runner.user_count` property.

## Review Notes
The Kubernetes snippets are valid as illustrative fragments, but a production manifest would also need a Service exposing the Locust master web and worker communication ports, plus the referenced ConfigMap and PVC. The article's RPS numbers remain reasonable as capacity-planning examples, but actual throughput depends heavily on hardware, request payloads, target latency, and user code.
