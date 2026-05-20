# Validation Summary: How to Use argocd app resources to List Resources

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Kubernetes resources and API groups
- GitOps application resource inventory
- Bash scripting
- jq JSON processing

## Sources Consulted
- Argo CD official `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD official `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD official `argocd app delete-resource` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_app_delete-resource/
- Argo CD official `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD official `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Argo CD official resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD official v2.14 to 3.0 upgrade notes for resource health storage: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.14-3.0/

## Issues Found
- `argocd app resources -o json` is not a supported command form. The official command reference only documents `--output tree`, `--output tree=detailed`, and `--orphaned` for `argocd app resources`. Replaced JSON examples with `argocd app get -o json | jq '.status.resources...'`.
- `argocd app resources --kind`, `--group`, and `--namespace` are not supported filters. Rewrote filtering examples to use `jq` against `.status.resources`.
- Several scripts used unsupported `argocd app resources -o json` pipelines. Updated inventory, issue-finding, owner lookup, monitoring, and CSV export examples to use `argocd app get -o json`.
- The environment comparison jq expression `.[].kind + "/" + .[].name` would generate incorrect combinations. Replaced it with a per-resource identifier built from group, kind, namespace, and name.
- `argocd app actions run` was shown with `--action restart`, but the action is a positional argument. Changed it to `argocd app actions run my-app restart ...`.
- Added the `apps` API group to the `argocd app delete-resource` Deployment example for precision.
- Corrected resource terminology in examples: `networking.k8s.io` is the Ingress API group and `PersistentVolumeClaim` is the Kubernetes kind name.

## Review Notes
The post is now technically valid for the documented Argo CD CLI behavior. One version-specific caveat remains for future maintenance: Argo CD 3.x changed how resource health is stored, so automation depending on `.status.resources[].health` should be tested against the target Argo CD server version and configuration.
