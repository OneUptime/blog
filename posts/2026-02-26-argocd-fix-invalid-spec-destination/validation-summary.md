# Validation Summary: How to Fix 'invalid spec.destination' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD CLI
- Kubernetes Custom Resources
- YAML configuration

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_list/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet list generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-List/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD source code for destination validation and CLI application option handling: https://github.com/argoproj/argo-cd

## Issues Found
- The post used `argocd app create ... --dry-run`, but the current Argo CD `argocd app create` command reference does not include a general `--dry-run` flag. I removed the flag and changed the wording to say that creation through the Argo CD API validates repo and cluster settings by default.
- The post said `argocd app set my-app --dest-name production-cluster` automatically removes the `server` field. The Argo CD CLI option handling sets the destination name when that flag is provided, but does not document or implement automatic removal of an existing server field in the client-side spec construction. I changed the note to tell readers to remove the old field from the manifest or otherwise ensure only one destination identifier remains.

## Review Notes
The core destination rules are correct: Argo CD supports either `spec.destination.server` or `spec.destination.name`, but not both, and it resolves the server from the cluster name when name is used. The ApplicationSet examples are technically valid for the non-Go-template placeholder style shown in the post; current Argo CD documentation increasingly uses `goTemplate: true` examples with dot-prefixed variables such as `{{.server}}`, which could be noted in a future style update.
