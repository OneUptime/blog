# Validation Summary: How to Deploy OpenFaaS on Kubernetes with Auto-Scaling

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- OpenFaaS Community Edition
- OpenFaaS Standard / OpenFaaS for Enterprises
- OpenFaaS CLI
- Helm
- arkade
- Prometheus
- NATS / NATS JetStream
- Python
- Grafana

## Sources Consulted
- OpenFaaS Kubernetes deployment documentation: https://docs.openfaas.com/deployment/kubernetes/
- OpenFaaS Pro deployment documentation: https://docs.openfaas.com/deployment/pro/
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS async invocation documentation: https://docs.openfaas.com/reference/async/
- OpenFaaS invocation documentation: https://docs.openfaas.com/architecture/invocations/
- OpenFaaS metrics documentation: https://docs.openfaas.com/architecture/metrics/
- OpenFaaS CLI installation documentation: https://docs.openfaas.com/cli/install/
- OpenFaaS function template documentation: https://docs.openfaas.com/cli/templates/
- OpenFaaS Helm chart values: https://raw.githubusercontent.com/openfaas/faas-netes/master/chart/openfaas/values.yaml
- OpenFaaS Pro retries documentation: https://docs.openfaas.com/openfaas-pro/retries/

## Issues Found
- The post presented production autoscaling generically, but the advanced autoscaler labels such as `com.openfaas.scale.target`, `com.openfaas.scale.type`, `com.openfaas.scale.target-proportion`, and scale-to-zero are documented for OpenFaaS Standard / OpenFaaS for Enterprises. Updated the introduction and autoscaling section to make the edition requirement explicit.
- The arkade install command used `arkade install openfaas`; current CE documentation uses `arkade install openfaas-ce`. Updated the command.
- The OpenFaaS CLI install command omitted `sudo -E`, which the official documentation recommends for preserving proxy environment variables. Updated the command.
- The first function used the legacy CE `com.openfaas.scale.factor` label alongside scale-to-zero. Replaced it with the documented OpenFaaS Standard / Enterprise autoscaler labels.
- The autoscaling example mixed `com.openfaas.scale.factor` with the newer target/type/target-proportion labels. Removed `com.openfaas.scale.factor` from that example and clarified that `target-proportion` is a fractional value.
- The async function configuration used `async_invocation`, but OpenFaaS selects async execution through `/async-function/NAME` or CLI async invocation, not a function environment variable. Removed `async_invocation` and clarified that `max_inflight` is a hard concurrency limit.
- The queue-worker section referred to "NATS Streaming" and showed an arbitrary `queue-worker-config` ConfigMap. Current OpenFaaS docs describe tuning queue-worker settings through Helm values, with NATS JetStream used by OpenFaaS Standard / Enterprise and NATS Streaming only retained for CE. Replaced the ConfigMap with Helm values for `queueWorker` and `queueWorkerPro`.
- The Grafana dashboard block was labeled as YAML and included a non-JSON comment despite being named `grafana-dashboard.json`. Changed the fence to JSON and removed the invalid comment.
- The P99 Prometheus expression used `histogram_quantile` without aggregating histogram buckets. Updated it to aggregate by `le` and `function_name`.
- The "Circuit Breakers" section implemented retries and timeouts, not a circuit breaker. Renamed the section and updated the function docstring.
- The retry example imported `Retry` through `requests.packages.urllib3`, which is not the preferred modern import path. Updated it to `from urllib3.util.retry import Retry`.

## Review Notes
- The tutorial remains a concise guide rather than a complete production runbook. A future revision could add explicit OpenFaaS Standard / Enterprise license-secret and values-file setup steps, but the post now avoids presenting Pro-only autoscaling as a generic CE capability.
