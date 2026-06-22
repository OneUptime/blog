# Validation Summary: How to Create Helm Starter Templates for Standardized Charts

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Helm charts and starter scaffolds
- Helm CLI
- Kubernetes Deployments, CronJobs, StatefulSets, Services, PodDisruptionBudgets, probes, and security contexts
- Prometheus Operator ServiceMonitor custom resources
- YAML and Helm Go templates

## Sources Consulted
- Helm `helm create` command documentation: https://helm.sh/docs/helm/helm_create/
- Helm chart file structure documentation: https://helm.sh/docs/topics/charts/
- Helm `helm env` command documentation: https://helm.sh/docs/helm/helm_env/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/
- Helm chart creation source constants and starter transformation behavior: https://raw.githubusercontent.com/helm/helm/main/pkg/chart/v2/util/create.go
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The starter directory tree showed `NOTES.txt` at the chart root. Helm documents `templates/NOTES.txt` as the notes file location, and Helm's own chart scaffold writes it there. Moved `NOTES.txt` under `templates/` in the example structure.
- The PodDisruptionBudget template could render both `minAvailable` and `maxUnavailable` if users enabled `maxUnavailable` while leaving the default `minAvailable`. Kubernetes allows only one of those fields in a single PDB. Changed the template to render `maxUnavailable` when set, otherwise `minAvailable`.
- The microservice starter put `{{ .Chart.Name }}` inside `values.yaml` for pod anti-affinity. Helm does not evaluate template expressions in values files unless a template explicitly calls `tpl`, and this chart renders affinity with `toYaml`. Replaced it with the starter placeholder `<CHARTNAME>` so Helm's starter transformation can substitute the generated chart name.
- The troubleshooting command for listing starters used `cut` on `helm env` output, which leaves Helm's quoted value in the shell argument on typical Helm output. Replaced it with a `sed` extraction and a quoted `ls "$HELM_DATA_HOME/starters/"`.

## Review Notes
The examples are scaffold-oriented and omit some companion templates such as `service.yaml`, `hpa.yaml`, `serviceaccount.yaml`, `configmap.yaml`, and `secret.yaml`; the referenced values are consistent with standard Helm chart patterns, but a production starter should keep those companion templates in sync with the values file.
