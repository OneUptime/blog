# Validation Summary: How to Implement Grafana Dashboard Provisioning from ConfigMaps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard provisioning
- Grafana dashboard JSON and HTTP API
- Kubernetes ConfigMaps, Deployments, volumes, and projected volumes
- kubectl
- Kustomize
- Flux Kustomization resources
- Prometheus queries and Grafana template variables

## Sources Consulted
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana API key migration documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes
- kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post said Grafana "watches" provisioning files and implied ConfigMap updates are immediately reloaded. Updated the wording to say Grafana checks files and reloads on the next provisioning scan after the mounted ConfigMap volume updates, matching Grafana provisioning behavior and Kubernetes ConfigMap volume update semantics.
- Several dashboard examples used the legacy `graph` panel type. Replaced these with the current `timeseries` panel type and removed the old `yaxes` option from the example panel.
- The multiple-dashboard ConfigMap examples used `panels: [...]`, which is not valid JSON inside the ConfigMap data. Replaced those placeholders with empty arrays.
- The multiple-ConfigMap mounting example used an init container and copied from `/tmp/dashboards/*/*.json`, but Kubernetes projected ConfigMap sources are projected into the same volume directory unless item paths create subdirectories. Replaced the script-based example with a direct projected volume mounted at Grafana's dashboard path.
- The multi-dashboard Deployment example was missing required Deployment selector and template labels. Added them so the manifest shape is valid.
- The Grafana API examples used `API_KEY`, but Grafana service account tokens are now the primary supported authentication method and API keys are deprecated. Updated the examples to use `SERVICE_ACCOUNT_TOKEN`.
- The GitOps section introduced a Flux manifest as "Flux or ArgoCD." Changed the label to "Deploy with Flux" because the example is specifically a Flux `Kustomization` resource.

## Review Notes
The examples are technically valid tutorial snippets after correction. The post still uses Grafana 10.2.0 as its example image; that version is older than current Grafana releases, but the provisioning concepts and shown fields remain valid for the documented workflow.
