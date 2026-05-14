# Validation Summary: How to Deploy Neuvector with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- NeuVector / SUSE Security
- Flux CD HelmRelease, HelmRepository, and Kustomization APIs
- Kubernetes namespaces, Secrets, ConfigMaps, CRDs, and admission webhooks
- Helm charts
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- NeuVector Helm chart repository and core chart documentation: https://github.com/neuvector/neuvector-helm
- NeuVector core chart values and schema: https://github.com/neuvector/neuvector-helm/tree/master/charts/core
- NeuVector monitor chart values and ServiceMonitor template: https://github.com/neuvector/neuvector-helm/tree/master/charts/monitor
- NeuVector Kubernetes deployment documentation: https://open-docs.neuvector.com/deploying/kubernetes/
- NeuVector ConfigMap/init configuration documentation: https://open-docs.neuvector.com/5.3/deploying/production/configmap/
- NeuVector CRD documentation: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector admission control documentation: https://open-docs.neuvector.com/policy/admission/
- NeuVector Prometheus exporter repository and metrics list: https://github.com/neuvector/prometheus-exporter
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The admin initialization secret used lowercase user fields (`username`, `password`, `role`, `email`) that do not match NeuVector's documented `userinitcfg.yaml` format. Updated them to `Fullname`, `Password`, `Role`, and `EMail`.
- The HelmRelease used older chart/image versions and deprecated container runtime keys (`containerd.enabled` and `containerd.path`). Updated the example to the current 2.8 chart family, image tag `5.5.1`, and `runtimePath`.
- The Helm values used unsupported top-level `scanner` and `scanner.autoscaling` keys. Replaced them with the chart-supported `cve.scanner`, `cve.updater`, and `cve.adapter` values.
- The controller `configmap.data` example used unsupported setting names. Moved the supported system settings into a `neuvector-init` ConfigMap with `sysinitcfg.yaml`.
- The `NvSecurityRule` example omitted required rule `name` fields and used selector criteria that did not match NeuVector's exported CRD examples. Added rule names and changed selectors to `service` and `domain` criteria.
- The `NvAdmissionControlSecurityRule` example used incorrect fields (`disable`, `rule_type`) and included a namespace on a cluster-scoped CRD. Updated it to `disabled`, `action`, `rule_mode`, added `spec.config`, and removed `metadata.namespace`.
- The monitoring example scraped a non-documented controller metrics endpoint and used non-existent metric names. Replaced it with the official NeuVector monitor Helm chart exporter and updated alert expressions to use `nv_log_events`.

## Review Notes
All YAML snippets parse successfully. Helm is not installed in this workspace, so `helm template` could not be run; chart validation was performed statically against the upstream chart values, templates, and CRD schemas.
