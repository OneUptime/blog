# Validation Summary: How to Troubleshoot RBAC Access Denied Errors in GKE Clusters

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes RBAC
- Google Cloud IAM
- kubectl
- gcloud CLI
- Google Groups for RBAC
- Workload Identity Federation for GKE
- Cloud Audit Logs

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl auth whoami reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_whoami/
- kubectl command reference for auth can-i: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- GKE RBAC authorization guide: https://cloud.google.com/kubernetes-engine/docs/how-to/role-based-access-control
- GKE access control concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/access-control
- GKE IAM roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/container
- Google Groups for RBAC in GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/google-groups-rbac
- GKE audit logging information: https://cloud.google.com/kubernetes-engine/docs/how-to/audit-logging
- Workload Identity Federation for GKE concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity

## Issues Found
- The post incorrectly stated that GKE requests must pass both IAM and Kubernetes RBAC authorization. Current GKE documentation says GKE checks RBAC first, and if RBAC does not authorize the request, GKE checks IAM permissions. Updated the explanation and Mermaid flowchart to reflect that either mechanism can authorize a request.
- The namespace viewer Role granted read access to Secrets. Kubernetes' built-in `view` role intentionally excludes Secrets because reading Secrets can enable privilege escalation through service account credentials. Removed `secrets` from the sample viewer Role.
- The IAM section described `roles/container.developer` as "full access" and `roles/container.admin` as bypassing RBAC entirely. Updated this language to match Google Cloud's IAM role descriptions more precisely.
- The Google Groups for RBAC command included `--enable-managed-config-connector-identity`, which is unrelated to enabling Google Groups for RBAC. Removed the flag and changed the location flag to the documented `--location` form.

## Review Notes
- `kubectl` and `gcloud` were not installed in the local environment, so CLI behavior was verified against official Kubernetes and Google Cloud CLI documentation instead of local `--help` output.
- The examples use current Kubernetes RBAC API version `rbac.authorization.k8s.io/v1` and valid Role, ClusterRoleBinding, RoleBinding, ServiceAccount, and Pod fields.
