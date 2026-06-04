# Validation Summary: How to Manage Multi-Cluster Configuration with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- kubectl
- Argo CD CLI
- Helm parameter overrides
- Prometheus metrics and PromQL
- Sealed Secrets and external secret operators

## Sources Consulted
- Argo CD ApplicationSet installation documentation: https://argo-cd.readthedocs.io/en/release-2.6/operator-manual/applicationset/Getting-Started/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet merge generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD CLI `argocd cluster add` reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD CLI `argocd cluster set` reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_set/
- Argo CD CLI `argocd appset generate` reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_generate/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD 2.14 to 3.0 upgrade notes for removed metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.14-3.0/

## Issues Found
- The post said the ApplicationSet controller is included in ArgoCD 2.6+. Updated this to 2.3+, which matches the official ApplicationSet installation documentation.
- The cluster registration examples added clusters without labels, while later examples depended on `environment` labels. Updated the `argocd cluster add` commands to use the supported `--label` flag.
- The post used `argocd cluster set --label`, but the official `argocd cluster set` command does not support a `--label` option. Replaced those examples with `kubectl label secret` commands against the generated Argo CD cluster Secrets.
- The progressive rollout example used a merge generator incorrectly: the cluster generator does not emit a `cluster` merge key, and the merge generator discards non-matching parameter sets. Replaced it with two cluster generators selected by rollout labels.
- The health check example placed a `health` field under the Application template, which is not part of the Argo CD Application spec. Replaced it with a custom health check configured in the `argocd-cm` ConfigMap.
- The PromQL example used `argocd_app_sync_status`, which has been removed in current Argo CD. Replaced it with `argocd_app_info{sync_status!="Synced"} == 1`.
- The best-practice testing command used `kubectl apply --dry-run=client`, which validates resource shape but does not render generated Applications. Replaced it with the official `argocd appset generate appset.yaml -o yaml` command.

## Review Notes
The remaining examples are illustrative and use placeholder repositories, cluster endpoints, Helm values files, and cluster Secret names. Those placeholders need to be replaced in a real environment, but the Argo CD API fields, generator syntax, CLI options, and Prometheus metric usage are now aligned with current official documentation.
