# Validation Summary: How to Deploy OneUptime with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OneUptime
- Argo CD / GitOps
- Kubernetes
- Helm
- PostgreSQL
- Redis
- ClickHouse
- OpenTelemetry Collector
- Sealed Secrets
- Velero

## Sources Consulted
- OneUptime Helm chart documentation: https://helm-chart.oneuptime.com/oneuptime/
- OneUptime Helm chart repository index: https://helm-chart.oneuptime.com/index.yaml
- OneUptime chart package `oneuptime-10.4.10.tgz`: https://helm-chart.oneuptime.com/oneuptime-10.4.10.tgz
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/

## Issues Found
- The wrapper chart referenced `oneuptime` chart version `7.0.0`, but the official chart repository does not publish a literal `7.0.0` package. Updated the dependency to the current published chart version `10.4.10`.
- The Helm values placed `host` and `httpProtocol` under `global`, but the current OneUptime chart expects them as top-level chart values. Moved them to the correct location and kept `global.storageClass` for storage class configuration.
- The post configured a Kubernetes `ingress` block with cert-manager annotations, but OneUptime chart 10.4.10 intentionally renders no Kubernetes Ingress resources and exposes the bundled nginx gateway through `nginx.service`. Replaced the Ingress example with `nginx.service.type: LoadBalancer` and `ssl.provision: true`.
- The PostgreSQL and Redis secret value keys did not match the current chart. Removed the unsupported built-in PostgreSQL `existingSecret` configuration and corrected Redis to use `redis.auth.existingSecret.name` and `redis.auth.existingSecret.passwordKey`.
- The ClickHouse example lacked secret wiring. Added `clickhouse.auth.existingSecret.name` and `clickhouse.auth.existingSecret.passwordKey`, which are supported by the current chart.
- The Sealed Secret examples no longer matched the corrected values. Replaced the PostgreSQL secret example with Redis and ClickHouse sealed secret examples that correspond to supported `existingSecret` fields.
- The OpenTelemetry Collector exporter pointed to `oneuptime.oneuptime.svc.cluster.local:4317`, but the Helm chart creates the app service as `<release>-app`; with the Argo CD Application name/release this is `oneuptime-app.oneuptime.svc.cluster.local:4317`. Updated the endpoint.
- The OpenTelemetry header used `x-oneuptime-service-token`; OneUptime documentation uses `x-oneuptime-token` for telemetry ingestion. Updated the header name and placeholder.
- The verification command used a PostgreSQL label that is not emitted by the current chart and checked for Ingress resources that the chart no longer creates. Updated the commands to check `app=oneuptime-postgresql` and the `oneuptime-nginx` service.
- Updated surrounding text that referred to ingress setup or cert-manager-based provisioning so it matches the current chart behavior.

## Review Notes
- `helm` and `kubectl` were not installed in the local environment, so command behavior could not be checked locally with `helm template` or `kubectl --dry-run`. Chart values and rendered resource names were verified by downloading and inspecting the official `oneuptime-10.4.10.tgz` chart package.
- The Argo CD Application, AppProject, OpenTelemetryCollector, SealedSecret, and Velero Schedule manifests use valid API shapes according to their official documentation.
- For production GitOps deployments, OneUptime's own chart documentation recommends pinning image versions and setting stable secrets such as `oneuptimeSecret`, `encryptionSecret`, probe keys, and database passwords. The post now avoids unsupported PostgreSQL `existingSecret` keys, but future improvements could show a complete SOPS or external-secret workflow for all chart-consumed secrets.
