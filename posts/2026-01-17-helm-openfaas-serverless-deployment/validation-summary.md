# Validation Summary: Deploying OpenFaaS Serverless Functions with Helm

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- OpenFaaS
- OpenFaaS Pro
- Kubernetes
- Helm
- faas-cli
- Prometheus and Alertmanager
- Grafana dashboards
- NATS / JetStream
- Kafka connector
- Cron connector
- Python, Go, and Node.js OpenFaaS functions

## Sources Consulted
- OpenFaaS Helm chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS Pro Helm values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values-pro.yaml
- OpenFaaS Helm chart README: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/README.md
- OpenFaaS YAML reference: https://docs.openfaas.com/reference/yaml/
- OpenFaaS Function CRD reference: https://docs.openfaas.com/openfaas-pro/function-crd/
- OpenFaaS async invocation reference: https://docs.openfaas.com/reference/async/
- OpenFaaS secrets CLI reference: https://docs.openfaas.com/cli/secrets/
- OpenFaaS autoscaling reference: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS scale-to-zero reference: https://docs.openfaas.com/openfaas-pro/scale-to-zero/
- OpenFaaS retries reference: https://docs.openfaas.com/openfaas-pro/retries/
- OpenFaaS metrics reference: https://docs.openfaas.com/architecture/metrics/
- OpenFaaS Node.js language reference: https://docs.openfaas.com/languages/node/
- OpenFaaS Kafka connector chart values: https://github.com/openfaas/faas-netes/blob/master/chart/kafka-connector/values.yaml
- OpenFaaS cron connector reference: https://docs.openfaas.com/reference/cron/
- OpenFaaS of-watchdog README: https://github.com/openfaas/of-watchdog/blob/master/README.md

## Issues Found
- Updated the architecture diagram from "NATS Streaming" to "NATS/JetStream" because current OpenFaaS Pro queueing uses NATS JetStream and NATS Streaming is deprecated.
- Corrected OpenFaaS Helm values: removed unsupported `faasnetes.replicas`, moved function image pull policy to `functions.imagePullPolicy`, replaced invalid `nats.enabled` usage with `async: true`, and changed Prometheus retention to `prometheus.retention.time`.
- Corrected the ingress example to the current Kubernetes `networking.k8s.io/v1` style expected by the OpenFaaS chart, using `ingressClassName`, `http.paths`, `pathType`, and nested service backend fields.
- Clarified scale-to-zero and autoscaler examples as OpenFaaS Pro behavior, matching the official autoscaling and scale-to-zero documentation.
- Replaced invalid OpenFaaS Pro values for OIDC and connectors with chart-supported `oidcAuthPlugin.iam`, issuer, dashboard, queue worker, and NATS fields. Kafka and SNS connectors are separate components rather than OpenFaaS chart subkeys.
- Corrected queue-worker retry configuration to use `queueWorkerPro.maxRetryAttempts`, `initialRetryWait`, and `maxRetryWait`.
- Corrected the Kafka connector values snippet by removing the unsupported nested `kafka:` object and using chart-supported top-level fields such as `brokerHosts`, `topics`, and `upstreamTimeout`.
- Corrected the cron connector example: cron schedules are function annotations (`topic: cron-function` and `schedule`) consumed by the connector, not connector chart values.
- Replaced the outdated Grafana dashboard ID instruction with a current note to import the OpenFaaS dashboard JSON files from the Customer Community repository.

## Review Notes
The remaining examples are intentionally generic and may require environment-specific values such as registry names, TLS issuer names, OpenFaaS Pro license setup, dashboard signing keys, and OIDC provider configuration before use in production.
