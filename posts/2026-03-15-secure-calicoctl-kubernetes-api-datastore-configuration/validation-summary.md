# Validation Summary: How to Secure Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Kubernetes service accounts and tokens
- kubeconfig

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: calicoctl user reference and supported resource aliases, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Felix configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: The Calico datastore, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes documentation: Managing Service Accounts, https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes documentation: kubectl create token, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes documentation: kubectl config view, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/

## Issues Found
- The kubeconfig generation used `.secrets[0]` from the ServiceAccount and read an auto-generated service account Secret. This is outdated for Kubernetes v1.24 and later, where new ServiceAccounts do not normally get auto-created token Secrets. Updated the command to use `kubectl create token` and extract cluster connection details from the current kubeconfig.
- The CA certificate extraction depended on the service account Secret. Updated it to use `kubectl config view --raw --minify --flatten` so the generated kubeconfig is portable and includes `certificate-authority-data`.
- The disk protection example changed ownership to `root:root` while also setting mode `600`, which would prevent a non-root calicoctl user from reading the file. Updated the example to assign ownership to the current user.
- The troubleshooting guidance referred to deleted token Secrets. Updated it to reflect time-limited tokens created with `kubectl create token`.
- The ClusterRole description claimed to include only the permissions calicoctl needs. Narrowed the wording because calicoctl supports additional Calico resources that are not included in the example role.

## Review Notes
The RBAC example is suitable for the resources shown in the guide and common Calico policy/configuration operations, but broader calicoctl usage may require adding other Calico resources such as profiles, workload endpoints, tiers, IP reservations, or Kubernetes controllers configuration.
