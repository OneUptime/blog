# Validation Summary: How to Implement Event-Driven Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Events
- Kubernetes
- GitOps
- Kustomize
- AWS SQS / EventBridge
- Prometheus Operator / PrometheusRule

## Sources Consulted
- Argo Events Webhook EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/webhook/
- Argo Events GitHub EventSource documentation and examples: https://argoproj.github.io/argo-events/eventsources/setup/github/
- Argo Events AWS SQS EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/aws-sqs/
- Argo Events Sensor parameterization documentation: https://argoproj.github.io/argo-events/tutorials/02-parameterization/
- Argo Events HTTP trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/
- Argo Events API reference: https://argoproj.github.io/argo-events/APIs/
- Argo Events service account documentation: https://argoproj.github.io/argo-events/service-accounts/
- Argo Events Prometheus metrics documentation: https://argoproj.github.io/argo-events/metrics/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD CLI command documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Alpine Linux package index for `kustomize`: https://pkgs.alpinelinux.org/package/v3.20/community/x86_64/kustomize

## Issues Found
- The config-repo update Job used `alpine/git:latest` but then ran `kustomize edit`; that image is not guaranteed to include `kustomize`. Changed the Job to use `alpine:3.20` and install `git` and `kustomize` before running the update.
- The Kubernetes object trigger examples created Jobs but did not specify a Sensor service account. Argo Events requires appropriate Sensor RBAC for Kubernetes resource triggers, so the relevant Sensor snippets now set `spec.template.serviceAccountName: create-job-sa`.
- The direct Argo CD API trigger used `Authorization: "Bearer ${ARGOCD_TOKEN}"` in static headers while also defining `secureHeaders`. Argo Events does not expand that placeholder in static headers. The example now keeps `Content-Type` in regular headers and reads the full Authorization value from `secureHeaders`.
- The SQS EventBridge example filtered paths under `body.detail-type` and `body.detail.message`, but SQS message bodies are strings unless `jsonBody: true` is configured. Added `jsonBody: true` to make those filters work with JSON EventBridge messages.
- The Prometheus alert used `argo_events_sensor_trigger_failed_total`, which is not one of the documented Argo Events Sensor metrics. Replaced it with the documented `argo_events_action_failed_total`.

## Review Notes
The examples remain illustrative and assume supporting resources exist, such as EventBus configuration, Secrets, externally reachable webhook URLs, RBAC for `create-job-sa`, and Argo CD API tokens with the required permissions. The Argo Events Helm chart version range `2.4.x` is current as of this review.
