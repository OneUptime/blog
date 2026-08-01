# Validation Summary: Fixing “Unauthorized” After Exporting or Rotating a kOps Kubeconfig

## Status

validated

## Post Type

Technical troubleshooting guide and operational runbook

## Technologies Covered

- kOps and the kOps state store
- Kubernetes and `kubectl`
- Kubeconfig contexts, users, clusters, and merge behavior
- Kubernetes X.509 client-certificate authentication
- Kubernetes authorization and RBAC
- Certificate-authority and keypair rotation
- OpenSSL and Base64 certificate inspection
- OIDC and kubeconfig exec-plugin authentication

## Sources Consulted

- [kOps CLI: `kops export kubeconfig`](https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/)
- [kOps: kubectl cluster admin configuration](https://kops.sigs.k8s.io/getting_started/kubectl/)
- [kOps: Rotate Secrets](https://kops.sigs.k8s.io/operations/rotate-secrets/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops get keypairs`](https://kops.sigs.k8s.io/cli/kops_get_keypairs/)
- [kOps kubeconfig export implementation at the reviewed revision](https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/cmd/kops/export_kubeconfig.go)
- [kOps kubeconfig builder at the reviewed revision](https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/pkg/kubeconfig/kubecfg_builder.go)
- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubernetes kubeconfig v1 API](https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/)
- [Kubernetes CLI: `kubectl config`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/)
- [Kubernetes CLI: `kubectl config view`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/)
- [Kubernetes CLI: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes CLI: `kubectl auth whoami`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_whoami/)
- [Kubernetes CLI: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: Troubleshooting kubectl](https://kubernetes.io/docs/tasks/debug/debug-cluster/troubleshoot-kubectl/)
- [OpenSSL 3.6: `openssl x509`](https://docs.openssl.org/3.6/man1/openssl-x509/)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate and CRL Profile](https://datatracker.ietf.org/doc/html/rfc5280)

## Issues Found

- The symptom table described a TLS hostname mismatch only in terms of the kubeconfig `server`. Kubernetes uses `tls-server-name` when that field is set and otherwise uses the server URL's hostname. The table now refers to the effective TLS server name.
- The HTTP 401 description assumed that a credential was presented, even though a missing credential can also leave the request unauthenticated. It now says that the API server did not authenticate the request.
- The symptom table said every HTTP 403 means authentication succeeded. When no credential is presented and anonymous authentication is enabled, Kubernetes can instead process the request as an anonymous identity before authorization denies it. The table now states that authorization denied the resolved identity, which may be anonymous.
- The certificate-lifetime guidance told readers only to compare dates with the workstation clock. The Kubernetes API server evaluates the client certificate's validity interval, so the post now calls out synchronized control-plane clocks and comparison with the correct current time.
- The kubeconfig export explanation said current kOps requires a credential choice whenever a suitable user is unavailable. Current kOps can still write cluster and context information without a credential flag. The text now correctly limits that requirement to exporting authentication and retains the explanation that a no-credential export does not refresh an existing user credential.
- The graceful keypair-rotation discussion lacked its version boundary. The post now states that this procedure is available in kOps 1.22 and later; older kOps releases use the separate legacy procedure documented by kOps.
- The CA-distribution checklist applied the kubeconfig `certificate-authority-data` steps to every `kubernetes-ca` rotation. The official kOps procedure excludes API endpoints fronted by a load balancer with its own separate certificate. The post now scopes those steps to clients that trust the kOps-managed API server certificate.
- The rotation checklist did not explicitly include `kops update cluster` and a completed rolling update after staging, promotion, and distrust. These rollouts are required to propagate each trust-state transition. The checklist now includes them, and the post's post-distrust troubleshooting language is scoped to the completed distrust rollout.
- The unknown-authority diagnosis in the rotation section was categorical even for clients using an independently certificated load balancer. It now applies specifically to clients relying on the kOps-managed API server certificate.

## Review Notes

- The `kops export kubeconfig` syntax and the `--state`, `--admin`, `--kubeconfig`, `--user`, and `--auth-plugin` flags are current. `kubecfg` remains an alias, which is why the rotate-secrets documentation's `kops export kubecfg` examples are equivalent.
- The default lifetime for `--admin` remains 18 hours, and explicit values such as `--admin=8h` are valid Go duration values accepted by the current CLI.
- The `kops get cluster ... --state ... -o yaml`, `kubectl config`, JSONPath, `kubectl get --raw=/version`, `kubectl auth`, Base64, and OpenSSL examples are syntactically valid. All fenced Bash snippets passed a syntax-only check.
- `kubectl auth whoami` uses SelfSubjectReview; the post correctly warns that unavailable API support or a denied SelfSubjectReview prevents that command from identifying the subject.
- Kubernetes documentation for the current release states that client certificates must be within their validity interval, chain to a configured client CA, include the `ClientAuth` extended key usage, and are not revocable through Kubernetes before expiry. The post's authentication and revocation explanations now match those constraints.
- All external links in the post returned successful HTTP responses and resolve to the intended official documentation.
- No live kOps state store or Kubernetes cluster was available, so cluster-dependent commands were verified against current official documentation, the kOps source revision dated 2026-08-01, and local CLI help rather than executed against a real control plane.
