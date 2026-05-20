# Validation Summary: How to Create Golden Paths for App Deployment with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Helm
- Kubernetes Deployments and scheduling constraints
- KEDA
- GitHub Actions
- yq
- Prometheus annotations
- OneUptime

## Sources Consulted
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Helm `helm template` command documentation: https://helm.sh/docs/v3/helm/helm_template/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate

## Issues Found
- The ApplicationSet example used `{{values.*}}` placeholders and a `toYaml | nindent` pipeline without enabling Go templates. Argo CD's Git file generator exposes YAML/JSON file fields as template parameters, while the `values.` prefix is reserved for values supplied through `generators.git.values`; Go-template functions such as `toYaml` require `goTemplate: true`. I added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and changed the placeholders to the Go-template form such as `{{.team}}`, `{{.goldenPath}}`, and `{{ .helmValues | toYaml | nindent 12 }}`.
- The introduction said the guide covered Kustomize overlays, but the post does not include a Kustomize example. I removed that reference so the scope matches the actual implementation.
- The CI schema validation used `yq '.field'`, which can print `null` and still exit successfully for missing fields in common yq usage. I changed the required-field checks to `yq -e`, which sets a failing exit status when the result is null or false.

## Review Notes
- The examples are intentionally partial platform-chart snippets. The values mention autoscaling, ingress, PDBs, monitoring, and security defaults, but the post only shows the Deployment template; a future expansion could add the matching HPA/KEDA, Ingress, PDB, ServiceMonitor/alerts, NetworkPolicy, and RBAC templates.
- The pull request workflow uses `git diff --name-only HEAD~1`, which is acceptable as a simplified example but may not cover every changed file across a multi-commit pull request without additional base SHA handling.
