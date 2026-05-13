# Validation Summary: How to Deploy API Gateway with Backend Services in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes
- Helm
- Kong Gateway
- Kong DB-less declarative configuration

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm Controller documentation: https://fluxcd.io/flux/components/helm/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI `flux get` documentation: https://fluxcd.io/flux/cmd/flux_get/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kong Gateway DB-less mode documentation: https://developer.konghq.com/gateway/db-less-mode/
- Kong Helm chart values: https://github.com/Kong/charts/blob/main/charts/kong/values.yaml
- Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/

## Issues Found
- The Kong HelmRelease manually mounted the declarative ConfigMap with `volumes` and `volumeMounts`. The Kong chart documents DB-less Helm configuration through `dblessConfig.configMap` or `dblessConfig.config`, and its custom volume values are named differently. Updated the example to use `dblessConfig.configMap`.
- The Kong DB-less example did not disable the Kong Ingress Controller. Kong's DB-less Helm documentation says that when deploying DB-less without the ingress controller, `ingressController.enabled` should be `false`. Added that setting.
- The ConfigMap key was `kong.yaml`, but the Kong Helm chart's external DB-less ConfigMap support expects a key named `kong.yml`. Renamed the key.
- The later verification commands used `kong-proxy` and `deployment/kong`, but a Flux HelmRelease named `api-gateway` would default to a different Helm release name. Added `releaseName: kong` so the generated resource names match the commands.
- The ConfigMap was created in the `gateway` namespace, but only the HelmRelease target namespace creation was shown. Added a `Namespace` manifest so applying the ConfigMap directly does not fail when the namespace does not already exist.
- The LoadBalancer lookup only read `.status.loadBalancer.ingress[0].ip`, which is empty on providers that publish a hostname. Updated the variable to read either IP or hostname and renamed it from `GATEWAY_IP` to `GATEWAY_HOST`.

## Review Notes
- The Flux `dependsOn` usage is valid for HelmRelease resources and waits for referenced HelmReleases to be Ready before reconciliation.
- The `flux get helmreleases --watch` and `flux reconcile kustomization all-apps --with-source` commands match the documented Flux CLI syntax, assuming a Kustomization named `all-apps` exists.
- The backend chart values are illustrative and depend on the internal Helm charts exposing matching `replicaCount`, `image`, `service`, `readinessProbe`, and `resources` values.
