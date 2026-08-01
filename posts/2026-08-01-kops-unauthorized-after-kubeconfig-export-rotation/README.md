# Fixing “Unauthorized” After Exporting or Rotating a kOps Kubeconfig

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Kubeconfig, Authentication, Certificates, Secret Rotation

Description: Repair kOps kubeconfig authentication by checking the selected context, credential lifetime, trusted CA set, and rotation stage without weakening TLS or RBAC.

---

A fresh-looking kubeconfig can still produce:

```text
You must be logged in to the server (Unauthorized)
```

The file may point to the wrong context, carry no usable user credential, contain an expired administrator certificate, or present a certificate issued by a CA the API server no longer trusts. During a Kubernetes CA rotation, the client credential and the server trust bundle can also be at different stages.

Diagnose the exact layer before exporting again.

## Separate Transport, Authentication, and Authorization

These failures require different fixes:

| Symptom | Layer |
| --- | --- |
| DNS failure, timeout, connection refused | Endpoint or network |
| `x509: certificate signed by unknown authority` | Client does not trust the API server certificate |
| TLS hostname mismatch | Effective TLS server name and certificate identity differ |
| `Unauthorized` / HTTP 401 | API server did not authenticate the request |
| `Forbidden` / HTTP 403 | Authorization denied the resolved identity, which may be anonymous |

Do not use `insecure-skip-tls-verify` for any of them. It hides server-identity problems and does not make an expired or untrusted client credential valid.

If the response is `Forbidden`, identify the authenticated subject and test the exact permission:

```bash
kubectl auth whoami
kubectl auth can-i get nodes
```

`kubectl auth whoami` depends on the server supporting the SelfSubjectReview API. A failed or unavailable result does not turn a 403 into a 401.

## Confirm Which Kubeconfig Is Active

`kubectl` may merge multiple files from `KUBECONFIG`. Duplicate cluster, user, or context names can make an export appear ineffective.

Inspect selection without printing embedded private keys:

```bash
printf 'KUBECONFIG=%s\n' "${KUBECONFIG:-<default>}"
kubectl config current-context
kubectl config get-contexts
kubectl config view --minify --raw=false
kubectl config view --minify \
  -o jsonpath='{.contexts[0].context.cluster}{"\n"}{.contexts[0].context.user}{"\n"}{.clusters[0].cluster.server}{"\n"}'
```

Confirm all three references:

1. the current context is the intended cluster;
2. its cluster entry points to the intended API endpoint;
3. its user entry is the credential you intended to use.

Also confirm kOps is reading the correct state:

```bash
kops get cluster prod.example.com \
  --state s3://company-kops-state \
  -o yaml
```

Exporting from the wrong state store can produce an internally consistent file for the wrong control plane.

## Check an Embedded Client Certificate’s Lifetime

kOps administrator kubeconfigs commonly contain an embedded X.509 client certificate. Examine its metadata without writing the private key:

```bash
kubectl config view --minify --raw \
  -o jsonpath='{.users[0].user.client-certificate-data}' \
  | base64 --decode \
  | openssl x509 -noout -subject -issuer -dates
```

If the kubeconfig references `client-certificate` as a file instead, run `openssl x509 -in PATH -noout -subject -issuer -dates` against that certificate file.

Kubernetes requires a client certificate to be within its X.509 `notBefore` and `notAfter` interval, include client-authentication usage, and chain to a CA trusted by the API server. The API server evaluates the validity interval, so keep control-plane clocks synchronized and compare the displayed dates with the correct current time.

The current kOps export command gives `--admin` a default credential lifetime of 18 hours. An admin kubeconfig that worked yesterday can therefore be expired today by design.

## Export a Controlled Test File

Do not overwrite the normal merged kubeconfig while diagnosing. Export the exact cluster into an isolated file with a short lifetime:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops export kubeconfig "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --admin=8h \
  --kubeconfig ./prod-admin-test.kubeconfig

chmod 600 ./prod-admin-test.kubeconfig
KUBECONFIG=./prod-admin-test.kubeconfig kubectl get --raw=/version
KUBECONFIG=./prod-admin-test.kubeconfig kubectl get nodes
```

The first request proves endpoint and TLS connectivity; some clusters expose version information without requiring a privileged identity. The second request exercises the exported credential and confirms the expected administrator access.

Treat this file as a privileged secret. Do not commit it, attach it to a ticket, or give it a needlessly long lifetime. For routine human access, use the organization’s OIDC or other configured identity and export the endpoint with `--user EXISTING_USER` instead of minting shared admin credentials.

## Understand What Export Does and Does Not Do

`kops export kubeconfig` reads cluster connection information from the state store and writes kubeconfig entries. To export authentication, current kOps requires an explicit credential choice:

- `--admin=DURATION` mints a cluster-admin client credential;
- `--user NAME` reuses an existing kubeconfig user;
- `--auth-plugin` configures the kOps authentication plugin where that workflow is supported.

Running the command without the appropriate credential flag may update cluster and context information while leaving the user unchanged. That is useful during CA distribution, but it will not refresh an expired administrator certificate by itself.

## Follow CA Rotation in the Documented Order

The graceful keypair-rotation procedure, available in kOps 1.22 and later, stages, promotes, and later distrusts CA keys. Client distribution is part of the procedure, not an afterthought.

For a rotation of `kubernetes-ca` or `all`, there are two different client updates. The kubeconfig CA-data steps apply when clients trust the kOps-managed API server certificate; the kOps procedure excludes an API load balancer with its own separate certificate from those steps.

1. **After creating and staging the new CA:** update the cluster, complete the rolling update, then export and distribute kubeconfig CA data that trusts the new certificate before promoting it.
2. **After promotion:** update the cluster, complete the rolling update, then export and distribute new administrator client credentials issued by the new primary CA.
3. **After old clients have moved:** distrust the previous CA, update the cluster, and complete the rolling update.
4. **After the distrust rollout:** export the final CA bundle without the previous CA.

The documented administrator export is equivalent to:

```bash
kops export kubeconfig "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --admin=8h \
  --kubeconfig ./prod-after-ca-promotion.kubeconfig
```

If clients become Unauthorized after the old keypair's distrust rollout, they are probably still presenting credentials issued by that previous CA. Re-export from the correct, current state and redistribute through the approved secret channel.

If clients that rely on the kOps-managed API server certificate instead report that it is signed by an unknown authority, their `certificate-authority-data` is stale. Minting another client certificate alone will not update that server trust bundle.

## Avoid Accidental Rollback During Rotation

Before changing keypair state, capture IDs and issuance dates with the documented kOps keypair commands and keep the prior distribution package available. kOps provides explicit `trust`, `distrust`, and `promote` rollback procedures.

Do not improvise by:

- copying CA data from a different cluster;
- disabling API authentication or RBAC;
- extending every admin certificate for years;
- editing embedded certificate data by hand;
- distributing kubeconfigs over an unaudited public channel;
- distrusting the previous CA before all required clients and nodes have moved.

An old credential remaining valid during the staged trust-overlap period can be expected. Kubernetes does not generally provide X.509 client-certificate revocation; after issuance, a certificate remains usable until expiry unless its issuing CA is no longer trusted.

## Finish with an Authentication Matrix

Test each supported client type rather than declaring success from one administrator shell:

| Client | Verify |
| --- | --- |
| Short-lived kOps admin | New certificate dates and expected cluster-admin read |
| OIDC or exec-plugin user | Login refresh and intended RBAC only |
| CI identity | Non-interactive refresh and least-privilege action |
| kubelet/new node | Bootstrap and Ready registration |
| Controllers/webhooks | API client trust after CA promotion and distrust |

The fix is complete when the selected context reaches the intended endpoint, its server CA is trusted, the presented user credential is current and trusted by the API server, and authorization matches that identity’s intended role.

## Official Documentation

- [kOps CLI: `kops export kubeconfig`](https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/)
- [kOps: Rotate Secrets](https://kops.sigs.k8s.io/operations/rotate-secrets/)
- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Kubernetes CLI: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: Authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
