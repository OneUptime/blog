# Validation Summary: How to Deploy Sentry Error Tracking with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sentry self-hosted
- Sentry Kubernetes Helm chart
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes Secrets, namespaces, Jobs, pods, and Ingress
- PostgreSQL, Redis, Kafka, ClickHouse, Snuba, and Relay

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository v1 API reference: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://github.com/fluxcd/helm-controller/blob/main/docs/spec/v2/helmreleases.md
- Flux HelmRepository documentation: https://github.com/fluxcd/source-controller/blob/main/docs/spec/v1/helmrepositories.md
- sentry-kubernetes/charts repository and chart README: https://github.com/sentry-kubernetes/charts
- sentry-kubernetes Sentry chart values.yaml and Chart.yaml for chart 31.2.0: https://github.com/sentry-kubernetes/charts/tree/develop/charts/sentry
- Sentry self-hosted repository: https://github.com/getsentry/self-hosted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described the chart as the official Sentry Helm chart. The reviewed chart is the community-maintained `sentry-kubernetes` chart, so the wording was corrected.
- The component list included Celery beat and Zookeeper. Current chart 31.x uses task worker/task scheduler terminology and Kafka KRaft, so the component list was updated.
- The prerequisites did not mention external ClickHouse. Current chart documentation says bundled ClickHouse is deprecated and external ClickHouse is required, so the prerequisite and values were updated.
- The HelmRelease pinned chart `>=23.0.0 <24.0.0`, which is outdated relative to the current chart line. It was updated to `>=31.0.0 <32.0.0`.
- The Sentry secret key values were placed at top-level `existingSecret` and `existingSecretKey`, but the chart expects them under `sentry.existingSecret` and `sentry.existingSecretKey`. The values block was corrected.
- The admin user secret fields used unsupported keys for the current chart. The post now uses `user.email`, `user.existingSecret`, and `user.existingSecretKey`.
- The example configured bundled ClickHouse with values that no longer apply to current chart 31.x. It now shows `externalClickhouse` configuration and stores the password in the Kubernetes Secret.
- The resource limits were under unsupported top-level `web` and `worker` keys. They were moved to `sentry.web.resources` and `sentry.taskWorker.resources`.
- The log selector `app=sentry-web` did not match the current chart labels. It now uses `app.kubernetes.io/component=web`.
- The expected pod list included old worker/cron names and bundled ClickHouse pods. It was updated for the current chart layout.
- The SMTP best-practice values used `email.from` and `email.host`; the chart uses `mail.from` and `mail.host`.

## Review Notes
The local workspace did not have `helm`, `kubectl`, or `flux` installed, so CLI validation was performed against official documentation and upstream chart sources instead of local command help output. The example still uses bundled PostgreSQL, Redis, and Kafka for tutorial simplicity; production deployments should evaluate external managed services and secrets management before use.
