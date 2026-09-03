# Kubernetes API Server Returns 401 Unauthorized: Trace Token Issuer, Audience, and Clock Skew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Authentication, HTTP 401, Bearer Token, JSON Web Token, OIDC, Clock Skew

Description: Trace Kubernetes 401 responses through token selection, JWT issuer and audience validation, signing keys, and clocks without weakening authentication.

---

An API server `401 Unauthorized` response means the request did not establish an acceptable identity. For bearer-token authentication, the important evidence is the token that the client actually sent, the API server authenticator configuration, and the clocks used to evaluate time claims.

Do not start by adding RBAC permissions. Authorization follows authentication, so a new RoleBinding cannot make an invalid token authenticate. Also do not disable TLS or issuer validation: those changes turn an availability incident into an identity-security incident.

## Prove Which Endpoint and Credential Path Failed

Record a redacted view of the active context:

```bash
kubectl config current-context
kubectl config view --minify
kubectl --v=6 get --raw=/version
```

The view should identify the expected HTTPS server and user without revealing secret data. Check whether the user entry uses a token, client certificate, `exec` credential plugin, or legacy auth provider. An `exec` plugin can fail, return an expired credential, or choose the wrong cloud account even when the kubeconfig names look correct.

Compare through and around the load balancer only when you can preserve both TLS name verification and the intended hostname. A proxy-generated 401 is not an API server authentication verdict. Response timing, load-balancer logs, API server audit records, and a request ID can establish which hop produced it.

Never paste a bearer token into a ticket or put it directly on a command line. Command arguments, shell history, process listings, and CI logs can retain it.

## Validate the JWT Contract

A Kubernetes JWT authenticator validates more than the signature. For an externally issued token, check these fields locally with trusted tooling:

| Field | What must be true |
| --- | --- |
| `iss` | Exactly matches the configured issuer URL, including scheme, path, and trailing-slash semantics |
| `aud` | Contains at least one audience accepted by that authenticator |
| `exp` | Is later than the verifier's current time |
| `nbf` | If present, does not place the token in the future |
| username claim | Exists and maps to a valid Kubernetes username |
| JWT header `kid` | Selects a signing key available through the issuer's current JWKS |

Decoding the header and payload is not signature verification. It is only a way to inspect claims, and the token remains secret after decoding. Compare the full issuer string with `--oidc-issuer-url` or the `issuer.url` in the API server's `AuthenticationConfiguration`. For command-line OIDC configuration, `--oidc-client-id` is the audience the token must target. Structured authentication can accept a configured set of audiences and can add claim-validation expressions.

On a kubeadm control-plane node, inspect the static Pod arguments without editing them:

```bash
sudo grep -E -- \
  '--authentication-config|--oidc-|--service-account-issuer|--api-audiences' \
  /etc/kubernetes/manifests/kube-apiserver.yaml
```

If `--authentication-config` names a file, verify that the file is mounted into the container and read the active copy. Current Kubernetes rejects combining that file with `--oidc-*` flags; an API server restart loop is therefore a configuration problem, not a token problem.

## Trace Issuer Discovery and Signing Keys

For external JWT/OIDC authentication, the API server obtains signing keys through issuer discovery. From the control-plane network, verify:

- the issuer's HTTPS name resolves and is reachable;
- its certificate chains to the CA trusted by the API server;
- `/.well-known/openid-configuration` advertises the expected issuer and JWKS URI; and
- the JWKS contains the token header's `kid` and supported signing algorithm.

A key-rotation race often has a distinctive shape: tokens signed with an old key work while newly issued tokens fail, or only some API server replicas reject the same token. Compare authenticator configuration, mounted CA files, reachability, and logs on every replica. Do not copy a private signing key into Kubernetes; the API server needs the issuer's public verification keys.

## Check Audience at the Point of Issuance

An ID token for a dashboard, another API, or a cloud management endpoint is not automatically a Kubernetes API token. Obtain a token whose audience matches the target cluster's authenticator.

For a Kubernetes ServiceAccount, request a short-lived TokenRequest token rather than creating a long-lived token Secret:

```bash
kubectl -n operations create token api-reader --duration=15m
```

If `--audience` is omitted, `kubectl create token` requests a token for the Kubernetes API server. When an explicit audience is required, use the exact value accepted by that API server rather than copying an example from another cluster. The server may return a different lifetime from the requested duration. Workloads using projected ServiceAccount volumes should read the token file for each request or reload it before expiry; caching its initial contents forever eventually causes 401 responses.

For ServiceAccount token validation, compare the token's issuer with `--service-account-issuer` and its audience with `--api-audiences`. Also confirm that the ServiceAccount and any object to which the token is bound still exist. Deleting a bound object invalidates the bound credential.

## Eliminate Clock Skew

`exp` and `nbf` are evaluated against time. A token can appear valid on the operator's laptop yet be expired on one control-plane node, or be “not valid yet” because the issuer is ahead.

Compare UTC time and synchronization state on:

- the identity provider or token issuer;
- every API server host; and
- the client when an exec plugin decides whether to refresh a credential.

On systemd-based Linux hosts, useful read-only checks are:

```bash
date -u
timedatectl show -p NTP -p NTPSynchronized -p TimeUSec
```

Do not compensate by issuing excessively long-lived tokens or widening claim rules. Repair NTP reachability and the host clock. If only one API server replica rejects tokens, its time or authenticator state is especially suspect.

## Use Logs Without Leaking Credentials

API server logs can distinguish expired tokens, audience mismatch, issuer mismatch, signature failure, missing keys, invalid claim mapping, and webhook-authenticator errors. Kubernetes audit events can correlate the source address, request path, response code, and any established username, depending on the configured audit policy.

Collect the smallest useful interval and redact authorization headers and token-shaped strings. Do not enable request-body logging broadly during an incident. If a webhook authenticator is involved, inspect both the API server's call and the webhook's response and TLS health.

After correcting the issuer, audience, key publication, clock, or client refresh path, request a **new** short-lived token and repeat a narrow API call. Reusing the old token cannot prove that issuance was fixed.

## Conclusion

A Kubernetes 401 is solved by tracing the exact credential contract: correct endpoint, correct token, exact issuer, accepted audience, available signing key, valid claims, and synchronized clocks. Preserve TLS and authentication controls, fix the failing link, and verify with a freshly issued credential before investigating RBAC.

## Official References

- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Managing Service Accounts](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: kubectl create token](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [systemd: timedatectl manual source](https://github.com/systemd/systemd/blob/main/man/timedatectl.xml)
