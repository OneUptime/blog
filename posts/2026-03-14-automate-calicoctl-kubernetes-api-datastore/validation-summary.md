# Validation Summary: How to Automate Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Kubernetes ServiceAccount token Secrets
- kubeconfig
- Bash
- Ansible

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: Configure calicoctl overview - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: End user RBAC - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Calico documentation: Enable native v3 CRDs - https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Kubernetes documentation: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The RBAC example only granted access to `projectcalico.org`. Calico documentation shows `calicoctl` commonly needs access to Kubernetes datastore backing resources in `crd.projectcalico.org`, while newer API-server/native-v3 modes use `projectcalico.org`. I updated the ClusterRole to grant both API groups.
- The kubeconfig generation script read the service account token Secret immediately after creating it. Kubernetes populates `kubernetes.io/service-account-token` Secrets asynchronously through the control plane. I added a wait loop before reading `ca.crt` and `token`.
- The multi-cluster switching script created a cluster-specific `calicoctl.cfg` but did not pass it to `calicoctl`, so the default `/etc/calico/calicoctl.cfg` could take precedence. I changed the verification command to pass the cluster-specific file with `--config`.
- The troubleshooting notes said to verify only `projectcalico.org` RBAC and implied `KUBECONFIG` is never used. I updated the notes to reflect both Calico API groups and calicoctl's documented default config file behavior.

## Review Notes
The long-lived ServiceAccount token approach is technically supported by Kubernetes, but the Kubernetes documentation recommends TokenRequest-based short-lived tokens when suitable. For CI/CD systems, future revisions could discuss short-lived token generation as a safer alternative.
