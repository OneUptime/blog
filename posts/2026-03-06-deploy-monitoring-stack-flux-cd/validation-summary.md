# Validation Summary: How to Deploy Monitoring Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- kube-prometheus-stack Helm chart
- Prometheus and Prometheus Operator
- Alertmanager
- Grafana
- Kubernetes Secrets, Namespaces, StatefulSets, Deployments, and port-forwarding
- SOPS-encrypted GitOps workflows

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- prometheus-community kube-prometheus-stack chart values for 60.0.0: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-60.0.0/charts/kube-prometheus-stack/values.yaml
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Grafana Helm chart documentation: https://grafana.com/docs/grafana/latest/installation/helm/

## Issues Found
- The Alertmanager route examples used deprecated `match` blocks. Updated them to current `matchers` syntax, matching Alertmanager's current configuration documentation.
- The Alertmanager Slack and PagerDuty examples referenced files under `/etc/alertmanager/secrets/` without mounting a Secret through `alertmanagerSpec.secrets`. Added `alertmanager-notification-secrets`, corrected the mounted file paths, and added a Secret manifest.
- The PagerDuty receiver used `service_key_file`. Updated it to `routing_key_file`, which is the current Alertmanager field for PagerDuty Events API v2 routing keys.
- The kube-prometheus-stack `defaultRules.rules` example used outdated keys (`k8s`, `kubeScheduler`) for chart version `60.x`. Replaced them with keys present in the 60.0.0 chart values.
- The Grafana dashboard ConfigMap used a top-level `dashboard` wrapper, which is suitable for some API payloads but not for file-provisioned dashboard JSON loaded by the sidecar. Removed the wrapper and left a direct dashboard JSON object.

## Review Notes
- Local `helm`, `flux`, and `kubectl` binaries were not installed in the workspace, so CLI verification was performed against official command and API documentation rather than local `--help` output.
- The YAML snippets and embedded Grafana dashboard JSON were parser-checked after the fixes.
