# Validation Summary: ArgoCD Best Practices for Disaster Recovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes CronJob and RBAC
- AWS S3
- Terraform
- Bash
- YAML

## Sources Consulted
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster rm` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rm/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Terraform AWS provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration

## Issues Found
- `argocd admin import` examples omitted the required `SOURCE` argument. Updated restore commands to use `argocd admin import - < file`, matching the documented stdin form.
- `argocd admin export` and import examples did not pass the Argo CD namespace. Added `-n argocd` or `-n argocd-dr-test` so the commands target the intended control-plane namespace.
- The backup CronJob used the stock `argoproj/argocd` image while also running `kubectl` and `aws`. Updated the example to use a custom backup tools image that includes all required CLIs.
- The backup job uploaded timestamped backups by date, while later recovery examples downloaded from `latest/argocd-export.yaml`. Added an `aws s3 cp` command to maintain that latest backup object.
- Redis cache state was listed as Argo CD state requiring explicit backup. Moved it to an ephemeral category because Redis cache is normally rebuilt rather than restored from backup.
- The backup verification script did not force PyYAML to iterate over all YAML documents, so invalid YAML could pass. Updated it to wrap `yaml.safe_load_all` in `list(...)`.
- The DR test script used `argocd app list --namespace`, which is not the documented app namespace flag and would not compare separate Argo CD control-plane namespaces. Updated the count check to use `kubectl get applications.argoproj.io -n ...`.

## Review Notes
The examples are technically valid as DR patterns, but real environments should pin Argo CD install manifests to the same tested version used for backups instead of relying on the moving `stable` manifest URL.
