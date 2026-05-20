# Validation Summary: How to Debug ApplicationSet Generation Issues in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- kubectl
- Argo CD CLI
- JSON/YAML templating

## Sources Consulted
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- Argo CD ApplicationSet integration behavior: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Argo-CD-Integration/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Merge generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet resource deletion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet controller command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-applicationset-controller/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD cluster list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD repo command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post selector example comment referenced `env=production`, but the snippet used the `environment` key. Changed the comment to `environment=production` so it matches the YAML.
- The command for listing generated Applications used a label that ApplicationSet does not add by default. Replaced it with a `kubectl`/`jq` query that filters Applications by their `ApplicationSet` owner reference.
- The YAML formatting example described a template output problem, but unquoted `{{name}}` can make the ApplicationSet manifest invalid YAML before templating. Clarified that the manifest itself is invalid.
- The log-level instructions patched the controller Deployment args directly. Replaced this with the official `argocd-cmd-params-cm` setting for `applicationsetcontroller.log.level` and a controller rollout restart.
- The checklist counted Applications by grepping for a non-default `managed-by-applicationset` string. Replaced it with a count of `.status.resources` on the ApplicationSet.

## Review Notes
The core debugging flow is accurate: status, controller logs, events, generator inputs, and template settings are the right places to inspect. The local environment did not include `kubectl` or `argocd`, so CLI behavior was verified against official command references rather than local `--help` output.
