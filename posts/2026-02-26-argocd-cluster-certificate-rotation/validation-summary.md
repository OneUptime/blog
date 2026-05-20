# Validation Summary: How to Handle Cluster Certificate Rotation in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD cluster credentials and cluster Secrets
- Kubernetes Secrets, RBAC, CronJobs, service accounts, and API health endpoints
- Kubernetes TLS certificates and kubeconfig CA data
- Argo CD CLI cluster management commands
- Service account token authentication
- EKS IAM / IRSA authentication for Argo CD
- Bash, curl, jq, and OpenSSL command-line usage

## Sources Consulted
- Argo CD Declarative Setup: cluster Secret fields, `tlsClientConfig.caData`, bearer token config, `awsAuthConfig`, GKE/Azure external auth examples: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD `argocd cluster rm` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_rm/
- Kubernetes `kubectl config view` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes RBAC authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API health endpoints reference: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes service account token documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes service account administration reference: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes certificate management with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/

## Issues Found
- The introduction implied any Kubernetes API server certificate rotation would break Argo CD. Updated it to distinguish API server identity certificates, client certificates, and cluster CA rotation. A serving certificate renewed under the same CA should not require `caData` changes.
- The Argo CD `config` explanation implied `caData` always becomes invalid when the cluster certificate rotates. Updated it to specify that `caData` becomes invalid when the cluster CA changes.
- The sequence diagram referred generically to certificate rotation. Updated it to identify cluster CA rotation, which is the scenario that invalidates Argo CD's stored CA bundle.
- The manual kubeconfig command selected `.clusters[0]` without narrowing to the intended context. Added `--minify` and `--context target-cluster-context` so the command extracts the CA data for the target cluster context.
- The CronJob attempted to fetch the live server certificate with `openssl s_client` and store it as `caData`. That is not a reliable or correct way to obtain the Kubernetes cluster CA, and it can replace a CA bundle with a leaf certificate. Reworked the example to load updated CA data from trusted kubeconfigs mounted into the job.
- The CronJob used `/healthz`, which Kubernetes has deprecated since v1.16. Updated the check to `/readyz`.
- The CronJob image was `bitnami/kubectl:latest` even though the script also requires bash, curl, jq, and OpenSSL. Updated the manifest to call for a custom image containing the required tools and mounted kubeconfigs.
- The RBAC example included `resourceNames: []` with a comment implying that it was required to allow all Secrets. Removed it; omitting `resourceNames` is the clearer way to allow the listed verbs across matching Secrets.
- The token-based auth section claimed it avoided the certificate rotation problem entirely. Updated it to clarify that it avoids client certificate rotation, but still needs CA data and token refresh handling.
- The cloud IAM section overgeneralized EKS, GKE, and AKS behavior and claimed the credentials never expire in the same way. Updated it to refer to provider-backed temporary credentials and removed the unsupported exact EKS CA validity claim.
- The monitoring script passed the full `host:port` value as SNI and did not strip URL paths. Updated it to derive `HOSTPORT` and `HOST`, then pass only the hostname to `-servername`.

## Review Notes
The remaining CronJob is an illustrative pattern, not a complete production controller. In production, the trusted source for updated CA data should be your cluster provisioning system, cloud provider API, or a securely managed kubeconfig Secret, and the updater image should be pinned rather than using a floating tag.
