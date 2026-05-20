# Validation Summary: How to Deploy to All Clusters with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- ApplicationSet cluster generator
- ApplicationSet Go templates
- ApplicationSet Progressive Syncs / RollingSync
- Kubernetes cluster Secrets and labels
- Helm chart sources in Argo CD Applications

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cluster_set/

## Issues Found
- The cluster labeling commands used `argocd cluster set --label`, but the documented `argocd cluster set` command does not support a `--label` option. I changed the examples to use `argocd cluster add ... --label`, which is supported when registering clusters.
- The remote-only cluster selector attempted to filter on `name`, but the cluster generator selector matches labels on Argo CD cluster Secrets, not generated template parameters. I changed it to match `argocd.argoproj.io/secret-type: cluster`, the documented way to exclude the default local cluster because it does not have a cluster Secret by default.
- The Progressive Syncs section did not mention that `RollingSync` must be enabled on the ApplicationSet controller. I added that caveat.
- The Progressive Syncs example included automated sync. The official documentation states that RollingSync forces generated Applications to have autosync disabled and logs warnings for automated sync policies. I replaced the automated sync block with a retry policy so the example reflects RollingSync behavior.

## Review Notes
- The non-Go-template examples use the default fasttemplate syntax, which still works but is documented as soon to be deprecated in favor of Go templates.
- For production use, consider `{{nameNormalized}}` or `{{.nameNormalized}}` in generated Application names if cluster names may contain underscores or other characters that are invalid in Kubernetes resource names.
