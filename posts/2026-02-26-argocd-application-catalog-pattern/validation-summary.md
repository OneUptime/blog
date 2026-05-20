# Validation Summary: How to Implement the Application Catalog Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects
- Helm charts and values schemas
- Kubernetes Deployments and topology spread constraints
- kubeval
- GitOps repository structure

## Sources Consulted
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/applicationset/Generators-Git/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Helm values files documentation: https://v3.helm.sh/el/docs/v3/chart_template_guide/values_files/
- Helm lint command documentation: https://helm.sh/el/docs/helm/helm_lint/
- Helm chart template guide: https://docs.helm.sh/docs/chart_template_guide/
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The `values.schema.json` `name` pattern allowed names ending in `-`, which are not valid for Kubernetes DNS label-style object names. Changed the pattern to require a final lowercase alphanumeric character while keeping the 3-63 character length range.
- The AppProject governance section claimed that allowing only the catalog and team config repositories ensures teams cannot bypass the catalog. Argo CD AppProjects restrict allowed source repositories and destinations, but they do not by themselves prevent an allowed team repository from being used as a direct manifest source. Updated the wording to state that AppProject restrictions should be combined with RBAC, repository review, or admission policy for full enforcement.

## Review Notes
- The Argo CD multi-source examples follow the documented `$values`/`ref` pattern, where `$values` must appear at the beginning of the Helm `valueFiles` path and resolves relative to the referenced repository root.
- The ApplicationSet example uses the default fasttemplate-style `{{path}}` and `{{path[1]}}` parameters, which are still documented for non-Go-template ApplicationSets. Argo CD also supports Go templates, where equivalent fields use forms such as `{{.path.path}}` and `{{index .path.segments 1}}`.
- The Helm commands use documented `helm template`, `--values`, `helm lint`, and `--strict` flags. `kubeval` is commonly used for rendered manifest validation, but teams may prefer a currently maintained validator such as kubeconform in future updates.
