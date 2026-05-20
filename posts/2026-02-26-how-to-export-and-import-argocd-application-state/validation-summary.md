# Validation Summary: How to Export and Import ArgoCD Application State

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD
- Kubernetes custom resources, Secrets, ConfigMaps, RBAC, and CronJobs
- kubectl
- Argo CD CLI
- yq
- jq
- age
- AWS CLI / Amazon S3 server-side encryption

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD User Management / SSO sensitive data: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl reference / quick reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/ and https://kubernetes.io/docs/reference/kubectl/quick-reference
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- age README / command usage: https://github.com/FiloSottile/age
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The inventory claimed to be complete but omitted `argocd-secret`. Official Argo CD documentation lists `argocd-secret` as the Secret used for user passwords, signing keys, Dex secrets, webhook secrets, and other sensitive data. Added it to the inventory and export script, and updated the import wording because the config directory now includes core Secrets as well as ConfigMaps.
- The table described `argocd-cm` as possibly containing OIDC secrets. Official Argo CD SSO documentation shows OIDC/Dex client secrets should be referenced from `argocd-secret` or another labeled Secret. Updated the table to say `argocd-cm` may reference secrets.
- Exported manifests kept `metadata.namespace`, which would make imports ignore the target namespace in many migration scenarios. Updated the cleanup logic and selective export examples to remove namespace metadata so `kubectl apply -n "$NAMESPACE"` controls the target namespace.
- The export warning only called out repository credentials and cluster tokens. Updated it to include SSO and webhook secrets because `argocd-secret` is now exported.

## Review Notes
The reviewed kubectl, Argo CD CLI, CronJob, yq, age, and AWS CLI examples use current command forms and resource names. The CronJob example is suitable as a simple backup pattern, but future improvements could add encryption in the job itself and avoid `latest` image tags for reproducibility.
