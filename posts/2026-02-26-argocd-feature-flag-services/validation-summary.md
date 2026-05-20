# Validation Summary: How to Deploy Feature Flag Services with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- ArgoCD Applications
- Kubernetes Deployments, Services, CronJobs, Ingress, and Secrets
- Helm charts
- Flagsmith
- Unleash
- OpenFeature Operator and flagd
- PostgreSQL backups
- PrometheusRule alerting

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Flagsmith Helm chart repository and chart values: https://github.com/Flagsmith/flagsmith-charts
- Flagsmith chart templates for API environment, ingress, and database URL generation: https://github.com/Flagsmith/flagsmith-charts/tree/main/charts/flagsmith/templates
- Unleash configuration documentation: https://docs.getunleash.io/using-unleash/deploy/configuring-unleash
- Unleash source configuration for environment variables: https://github.com/Unleash/unleash/blob/main/src/lib/create-config.ts
- OpenFeature Operator installation documentation: https://open-feature.github.io/open-feature-operator/docs/installation.html
- OpenFeature Operator Helm chart values: https://github.com/open-feature/open-feature-operator/blob/main/chart/open-feature-operator/values.yaml
- OpenFeature Operator FeatureFlagSource documentation: https://open-feature.github.io/open-feature-operator/docs/feature_flag_source.html
- OpenFeature Operator FeatureFlag documentation: https://open-feature.github.io/open-feature-operator/docs/feature_flag.html
- flagd flag definition reference: https://flagd.dev/reference/flag-definitions/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Flagsmith Helm values used `api.replicaCount` and `frontend.replicaCount`, but the official chart uses `replicacount` for those workloads. Updated both keys.
- The Flagsmith example used `api.env` as a Kubernetes-style environment variable list. The official chart expects `api.extraEnv` as a map for additional API environment variables, and it already renders `DJANGO_ALLOWED_HOSTS` and `DATABASE_URL`. Updated the example to use `extraEnv`.
- The Flagsmith example configured `postgresql`, but the chart dependency is aliased as `devPostgresql`. Updated the key to match the chart values.
- The Flagsmith example used a top-level `ingress.enabled`, `className`, and Kubernetes Ingress-style `hosts` structure. The chart expects `ingress.frontend` and `ingress.api` with `ingressClassName` and host lists. Updated the ingress values.
- The Flagsmith example enabled a top-level `redis` value that is not part of the official Flagsmith chart values. Removed it.
- The OpenFeature Operator example omitted the cert-manager prerequisite documented by the project. Added a short prerequisite note.
- The OpenFeature Operator chart version was outdated at `0.6.0`; the current documented release is `0.9.1`. Updated the ArgoCD `targetRevision`.
- The OpenFeature Operator destination namespace did not match the chart's documented/default namespace. Updated it to `open-feature-operator-system`.
- The OpenFeature Operator Helm values placed resources under `controllerManager.resources`; the chart expects `controllerManager.manager.resources`. Updated the nesting.
- The `FeatureFlagSource` example used `provider: flagd`, which is not a supported provider type. Updated it to `provider: kubernetes` and pointed the source at the `FeatureFlag` resource.
- The backup CronJob referenced a `flagsmith-db` secret through `envFrom`, but the chart-generated database URL is exposed as `DATABASE_URL` in the `flagsmith` secret when using the bundled database path. Updated the CronJob to read that key explicitly.
- The Flagsmith latency alert used a generic HTTP histogram metric and did not aggregate buckets before `histogram_quantile`. Updated it to the Flagsmith HTTP server histogram bucket metric and summed by `le`.

## Review Notes
The Unleash manifest uses an older pinned server image (`unleashorg/unleash-server:5.9`), but the referenced environment variables and health endpoint are still valid. For production use, the post could later pin Helm chart/application versions more consistently and add the missing PVC manifest for backup storage.
