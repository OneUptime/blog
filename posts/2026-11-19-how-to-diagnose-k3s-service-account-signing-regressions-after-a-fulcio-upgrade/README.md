# How to Diagnose K3s Service Account Signing Regressions After a Fulcio Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Kubernetes, Troubleshooting

Description: Diagnose the K3s issuer regression introduced in Fulcio 1.8.6, separate discovery credentials from signing tokens, and test a corrected upgrade.

---

If K3s service-account signing stopped immediately after a Fulcio upgrade, compare the issuer handling before rotating keys or changing Kubernetes RBAC. Fulcio 1.8.6 introduced a specific compatibility regression while fixing an OIDC security problem. Fulcio 1.8.7 restored the in-cluster authentication path for directly configured Kubernetes issuers.

That historical boundary helps identify the failure. It is not a recommendation to deploy an old release: qualify a supported patched version that includes subsequent security fixes. [Fulcio's release notes](https://github.com/sigstore/fulcio/releases) document both changes.

## Understand which credential is failing

There are two separate tokens in this workflow:

| Credential | Consumer | Purpose |
| --- | --- | --- |
| Workload token with Fulcio's configured audience | Fulcio | Authenticate the certificate requester |
| Fulcio pod's Kubernetes API token | Kubernetes API server | Authenticate discovery or JWKS requests when that endpoint requires authentication |

A valid signing token does not help if Fulcio cannot initialize the issuer verifier. Likewise, granting a workload more Kubernetes permissions does not repair Fulcio's missing CA trust.

Kubernetes supports projected, audience-bound tokens through the TokenRequest API. The token used for signing and the token accepted by the Kubernetes API can have different audiences. [Kubernetes service-account documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) explains this separation.

## Match the known regression

The reported K3s deployment used issuer `https://kubernetes.default.svc.cluster.local`. Fulcio 1.8.6 restricted its automatic in-cluster setup to the literal `https://kubernetes.default.svc`, so the alternative issuer lost its cluster CA and bearer-token handling. Discovery could then fail with TLS or authentication errors. [Issue 2355](https://github.com/sigstore/fulcio/issues/2355) records the reproducer and its fix.

Collect the deployed images, arguments, and the first server-side discovery error:

```bash
kubectl -n sigstore get deploy fulcio -o json |
  jq '.spec.template.spec.containers[] | {name, image, args}'

kubectl -n sigstore logs deploy/fulcio -c fulcio --since=30m

kubectl get --raw /.well-known/openid-configuration |
  jq '{issuer, jwks_uri}'
```

The last command uses your kubeconfig credentials and network path. It establishes what the API server advertises, but does not prove that the Fulcio pod can reach it.

Compare that issuer byte for byte with the signing token's `iss` and the active Fulcio configuration. A short Kubernetes service name and its fully qualified name can resolve to the same server while still being different OIDC identifiers. Do not rewrite the JWT or bypass issuer validation.

## Inspect the actual Fulcio inputs

Review the ConfigMap or mounted configuration selected by `--config-path`. Check that the concrete K3s issuer is directly configured as `type: kubernetes`, with the intended `client-id`. Also inspect the mounted CA and token paths expected by the exact release.

Current upstream code distinguishes directly configured Kubernetes issuers from wildcard meta-issuers. Its in-cluster path also depends on the default Kubernetes issuer configuration, and its cluster-CA path is `/var/run/fulcio/ca.crt`. The pod API-token path is the standard service-account mount. Read the implementation matching your version before assuming that a general OIDC `ca-cert` setting or a different filesystem path activates the same behavior. [Fulcio's configuration source](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go) shows these conditions.

For a pod image with a shell, these checks establish whether the expected paths are readable; they do not prove that the files come from volume mounts:

```bash
kubectl -n sigstore exec deploy/fulcio -c fulcio -- sh -c '
  test -r /var/run/fulcio/ca.crt &&
  test -r /var/run/secrets/kubernetes.io/serviceaccount/token
'
```

Do not print the bearer token to diagnose a missing mount. A successful file check still does not establish that its audience, lifetime, or RBAC permissions are appropriate.

## Upgrade without undoing the security fix

The regression followed protections against cross-host redirects and credential leakage. Downgrading to 1.8.5 would restore an unsafe behavior. The [original security advisory](https://github.com/sigstore/fulcio/security/advisories/GHSA-f5mr-q85p-6hh6) explains why those boundaries matter.

Test a corrected release with the existing issuer string and a narrow, explicit configuration. Do not turn a local Kubernetes issuer into a broad wildcard simply to make matching easier. External Kubernetes issuers must not receive your local cluster's service-account credential.

Use a canary instance and fresh workload token. Confirm discovery, JWKS retrieval, issuance, and verification of a test artifact. Inspect the issued Kubernetes SAN and pin it together with the exact cluster issuer. Test a wrong audience and an unconfigured issuer as rejection cases.

Finally, preserve the image digest and test result with the upgrade record. That turns a vague signing regression into a repeatable compatibility check covering both successful local discovery and refusal to send local credentials to another issuer.
