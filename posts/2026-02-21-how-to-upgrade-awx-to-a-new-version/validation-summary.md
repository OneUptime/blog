# Validation Summary: How to Upgrade AWX to a New Version

## Status
validated

## Post Type
Tutorial / operational upgrade guide

## Technologies Covered
- AWX
- AWX Operator
- Kubernetes
- Kustomize
- Helm
- AWX REST API
- Execution environments

## Sources Consulted
- AWX Operator upgrade documentation: https://docs.ansible.com/projects/awx-operator/en/latest/upgrade/upgrading.html
- AWX Operator basic install documentation: https://docs.ansible.com/projects/awx-operator/en/latest/installation/basic-install.html
- AWX Operator Helm chart documentation: https://docs.ansible.com/projects/awx-operator-helm/helm-install-on-existing-cluster.html
- AWX Operator backup role documentation: https://github.com/ansible/awx-operator/tree/devel/roles/backup
- AWX Operator restore role documentation: https://github.com/ansible/awx-operator/tree/devel/roles/restore
- AWX Operator release notes: https://github.com/ansible/awx-operator/releases
- AWX project README and release status: https://github.com/ansible/awx
- AWX REST API filtering documentation: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/filtering.html
- AWX REST API authentication documentation: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/authentication.html
- AWX execution environment documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/execution_environments.html
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The introduction said AWX releases new versions frequently. Current official AWX project information says releases are paused during a large refactoring, with the last AWX release on July 2, 2024. Changed the wording to "When new AWX releases are available."
- The versioning section referred to a compatibility matrix. The official AWX Operator upgrade guidance points users to the operator release notes and `DEFAULT_AWX_VERSION`. Updated the wording accordingly.
- The examples used AWX Operator `2.12.0` with AWX `24.2.0`, but official release notes show AWX `24.2.0` was released with AWX Operator `2.15.0`. Updated the Kustomize and Helm examples to `2.15.0`.
- The backup wait command used `condition=complete`, which is not the AWXBackup success condition used by the operator. Updated it to wait for `condition=Successful`.
- The rollback restore example omitted the documented restore prerequisites to delete the existing AWX custom resource and old PostgreSQL PVC. Added those commands before the AWXRestore example.
- The schedule maintenance snippet claimed to disable schedules but only printed them. Updated it to PATCH each schedule's `enabled` field to `false`.
- The migration wording implied migrations only run during pod startup. Adjusted it to say migrations run as part of the operator-managed upgrade.

## Review Notes
- The commands assume default resource names such as `awx`, `awx-web`, and `postgres-15-awx-postgres-15-0`; deployments with custom names may need adjusted names.
- Some AWX API list calls are paginated. The examples are suitable for small installations, but large installations should handle pagination explicitly in production automation.
