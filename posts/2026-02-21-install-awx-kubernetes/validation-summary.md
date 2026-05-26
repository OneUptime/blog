# Validation Summary: How to Install AWX on Kubernetes

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- AWX
- AWX Operator
- Kubernetes
- kubectl
- Kustomize
- PostgreSQL
- Kubernetes Ingress
- Kubernetes PersistentVolumeClaims

## Sources Consulted
- AWX Operator official repository and release tags: https://github.com/ansible/awx-operator
- AWX Operator 2.19.1 release notes: https://github.com/ansible/awx-operator/releases/tag/2.19.1
- AWX Operator 2.12.2 release notes: https://github.com/ansible/awx-operator/releases/tag/2.12.2
- AWX Operator database configuration documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator network and TLS configuration documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/network-and-tls-configuration.html
- AWX Operator persisting projects directory documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/persisting-projects-directory.html
- AWX Operator backup role documentation: https://github.com/ansible/awx-operator/tree/2.19.1/roles/backup
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post pinned AWX Operator `2.12.2`, which is valid but outdated. Updated the install and kustomization examples to `2.19.1`, the latest tagged AWX Operator release checked during review.
- The managed PostgreSQL examples used the PostgreSQL 13 service and pod names from AWX Operator `2.12.2`. Updated them to PostgreSQL 15 names used by current AWX Operator defaults.
- The managed PostgreSQL secret included `sslmode`, which the AWX Operator docs describe as valid for external databases. Removed it from the managed database secret.
- The operator-managed Ingress example used deprecated `ingress_tls_secret`. Replaced it with `ingress_hosts[].tls_secret` and added `ingress_class_name`.
- The Ingress section implied both a manually created Ingress and an operator-created Ingress at the same time. Clarified that the AWX custom resource example is an alternative operator-managed approach.
- The project persistence examples used `ReadWriteOnce`, while the AWX Operator default is `ReadWriteMany` and the projects PVC is mounted by AWX web and task deployments. Updated the examples and prerequisite wording.
- The backup example combined `backup_pvc` with `backup_storage_class`, but `backup_pvc` is for a pre-created PVC. Removed the pre-created PVC fields and left the operator-created PVC configuration.
- The backup example used a Kubernetes resource requests object for `backup_storage_requirements`, but the AWXBackup CRD expects a string size. Changed it to `10Gi`.
- The `kubectl top nodes` command was shown as a general resource check, but it requires Metrics Server. Added that caveat in the command comment.

## Review Notes
The examples are now aligned with the current AWX Operator release and CRD fields. I could not execute `kubectl` locally because it is not installed in this environment, so command behavior was checked against official documentation and upstream manifests instead.
