# Validation Summary: How to Handle ArgoCD Application Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (ApplicationSet controller, Application controller)
- ArgoCD ApplicationSet generators (List, Cluster, Git, Matrix, Merge)
- ArgoCD progressive sync strategy (RollingSync)
- Kubernetes (kubectl, manifests, ServiceMonitor)
- GitOps workflows
- Helm (parameters, valueFiles)
- Go templates / fasttemplate templating
- Prometheus / Grafana / Alertmanager (monitoring stack)
- External Secrets Operator (referenced)
- argocd-notifications (annotation reference)

## Sources Consulted
- ApplicationSet Getting Started: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Getting-Started/
- Controlling Resource Modification (syncPolicy): https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Git Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- ApplicationSet controller deployment manifest: https://github.com/argoproj/argo-cd/blob/master/manifests/base/applicationset-controller/argocd-applicationset-controller-deployment.yaml
- Stable install.yaml: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- **Misleading install command framing (fixed)**: The "Installing the ApplicationSet Controller" section described its `kubectl apply` command as installing the controller "for ArgoCD versions prior to 2.3", but the URL it used (`argoproj/argo-cd/stable/manifests/install.yaml`) is the full current ArgoCD install manifest, which installs ArgoCD 2.3+ with the ApplicationSet controller already bundled. The legacy pre-2.3 separate controller lived in the `argoproj/applicationset` repo, which was archived in July 2024. Reworded the prose and the bash comment to accurately describe the command as installing ArgoCD (with the bundled ApplicationSet controller) and dropped the misleading "prior to 2.3" framing.

## Review Notes
- All ApplicationSet API fields used in the YAML examples were verified against current ArgoCD docs: `goTemplate`, `goTemplateOptions: ["missingkey=error"]`, `syncPolicy.preserveResourcesOnDeletion`, `syncPolicy.applicationsSync` (with values `create-only`/`create-update`/`create-delete`/`sync`), `strategy.type: RollingSync` with `rollingSync.steps[].matchExpressions`, and the Cluster generator's `{{name}}`, `{{server}}`, `{{values.<key>}}`, `{{metadata.labels.<key>}}` parameters.
- Progressive Syncs is documented as a beta feature in current ArgoCD docs (still beta as of v3.3.0). The post does not explicitly claim GA stability, but readers using `strategy.type: RollingSync` in production should be aware of the beta status.
- The Git generator examples use the legacy fasttemplate syntax (`{{path}}`, `{{path.basename}}`, `{{path[1]}}`). This is correct when `goTemplate: false` (the historical default). The section "Implementing Conditional Logic with Go Templates" correctly switches to Go template syntax (`{{ .name }}`, `{{ .env }}`) once `goTemplate: true` is set. The two syntaxes are not mixed within a single ApplicationSet in the examples, which is correct.
- The ServiceMonitor port name `metrics` matches the upstream `argocd-applicationset-controller` Service (port 8080, name `metrics`).
- The env var `ARGOCD_APPLICATIONSET_CONTROLLER_LOGLEVEL` is the correct mechanism to set the controller log level (debug/info/warn/error), populated from the `argocd-cmd-params-cm` ConfigMap key `applicationsetcontroller.log.level` in the upstream deployment.
