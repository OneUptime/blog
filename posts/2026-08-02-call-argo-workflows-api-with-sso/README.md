# How to Call the Argo Workflows API When SSO Authentication Is Enabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, REST API, SSO, OIDC, Authentication, Kubernetes RBAC, Service Accounts

Description: Call the Argo Workflows REST API safely alongside SSO by enabling client auth for automation, issuing a least-privilege service account token, and using the correct endpoint and Bearer header.

---

Argo Server's SSO mode is designed for interactive users. A browser completes the OIDC authorization flow, and Argo Server issues its own opaque session token. That is different from a Kubernetes service account token used by a CI job, webhook, or backend service.

The reliable pattern is to enable two Argo Server authentication modes:

- `sso` for people using the UI;
- `client` for API and CLI automation using Kubernetes credentials.

Argo Server supports multiple `--auth-mode` flags, so enabling client authentication does not require removing SSO:

```yaml
containers:
  - name: argo-server
    args:
      - server
      - --auth-mode=sso
      - --auth-mode=client
```

Then create one least-privilege Kubernetes service account per API client, request a short-lived token, and send it in the standard `Authorization: Bearer ...` header.

## Why an Identity-Provider Token Usually Fails

Argo Server auth modes answer two questions: how the request is authenticated, and which Kubernetes identity Argo ultimately uses for authorization.

In SSO mode, the browser starts at Argo Server, follows the configured OAuth2/OIDC flow, and returns to Argo's `/oauth2/callback`. Argo's SSO documentation explains that Argo issues an opaque JWE session token rather than simply forwarding the identity provider's ID token. If SSO RBAC is enabled, Argo evaluates the token's claims against service account annotations and performs the request as the selected service account.

Therefore, these values are not interchangeable:

- an identity provider access token;
- an identity provider ID token;
- an Argo SSO session token;
- a Kubernetes service account token.

Copying an arbitrary OIDC token into an `Authorization` header can produce `401` or `token not valid`; depending on the ingress or authentication proxy, it may also produce an SSO redirect because it did not pass through Argo's SSO exchange.

For non-interactive automation, Argo's REST API documentation points to client auth and an access token. Use that path instead of scripting the browser flow or storing a human session cookie in CI.

## Enable SSO and Client Auth Together

With the official manifests, patch the Argo Server Deployment so both flags are present:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argo-server
  namespace: argo
spec:
  template:
    spec:
      containers:
        - name: argo-server
          args:
            - server
            - --auth-mode=sso
            - --auth-mode=client
```

If you install with Helm, express the equivalent values through the chart's server auth-mode configuration rather than manually editing the generated Deployment.

Verify the rendered Deployment arguments and startup logs, not only the source values:

```bash
kubectl get deployment -n argo argo-server \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="argo-server")].args}{"\n"}'

kubectl logs -n argo deployment/argo-server | grep -i 'auth'
```

The exact Deployment name can differ in Helm installations. Use `kubectl get deployment -n argo` to find it.

Enabling two modes expands the accepted credential types, so keep the server behind TLS, apply ingress/network restrictions where appropriate, and make every client token narrowly scoped.

## Create a Least-Privilege API Identity

The following identity can create and inspect Workflows in one namespace. It cannot delete Workflows, edit templates, read Secrets, or access other namespaces:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: report-api-client
  namespace: workflows
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: report-api-client
  namespace: workflows
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: report-api-client
  namespace: workflows
subjects:
  - kind: ServiceAccount
    name: report-api-client
    namespace: workflows
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: report-api-client
```

Apply it and confirm authorization before issuing a token:

```bash
kubectl apply -f api-client-rbac.yaml

kubectl auth can-i create workflows.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:report-api-client

kubectl auth can-i delete workflows.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:report-api-client
```

The expected answers are `yes` and `no`. Add verbs only for operations the client really performs:

| API operation | Typical permission |
| --- | --- |
| Submit | `create` on `workflows` |
| Get/list/watch | matching read verbs on `workflows` |
| Retry | `get` and `update` on `workflows`, plus `delete` on Pods that the retry removes |
| Stop, resume, or update | `get` plus `update` and/or `patch` on `workflows`; test the exact endpoint |
| Delete | `delete` on `workflows` |
| Read live Pod logs | `get` on `workflows`, `list` and `watch` on `pods`, and `get` on `pods/log` |

The service account authenticating the API request is not necessarily the service account that Workflow Pods run as. A submitted Workflow selects its runtime identity through `spec.serviceAccountName`. Define and restrict that runtime account separately.

## Prefer a Short-Lived Token

Kubernetes recommends the TokenRequest API over a long-lived `kubernetes.io/service-account-token` Secret. `kubectl create token` is a convenient TokenRequest client:

```bash
RAW_TOKEN="$(kubectl create token report-api-client \
  -n workflows \
  --duration=15m)"

ARGO_TOKEN="Bearer ${RAW_TOKEN}"
```

The API server can grant a different lifetime from the requested duration. Build automation so it requests a fresh token rather than assuming the string remains valid forever.

Argo's access-token documentation also describes manually creating a service account token Secret. That produces a persistent credential and can be necessary for older integrations, but Kubernetes documentation explicitly recommends short-lived TokenRequest tokens where possible. If a static token is unavoidable:

- create a unique service account and Secret for this client;
- store the token in a secret manager, not in Git;
- rotate it deliberately;
- delete the Secret to revoke the token;
- monitor its use.

Do not use the Workflow namespace's shared `default` service account as an API identity.

## Test Authentication with a Read Request

Assume Argo Server is available at `https://argo.example.com`. Test user information and a namespace-scoped list:

```bash
curl --fail-with-body --show-error \
  --header "Authorization: ${ARGO_TOKEN}" \
  --header 'Accept: application/json' \
  https://argo.example.com/api/v1/userinfo

curl --fail-with-body --show-error \
  --header "Authorization: ${ARGO_TOKEN}" \
  --header 'Accept: application/json' \
  https://argo.example.com/api/v1/workflows/workflows
```

Notice the header is exactly:

```text
Authorization: Bearer <token>
```

In these examples `ARGO_TOKEN` already includes the `Bearer ` prefix. Do not produce `Bearer Bearer ...`, and do not omit the prefix.

For an internal service with a private CA, trust that CA explicitly:

```bash
curl --cacert /etc/company-pki/argo-ca.pem \
  --header "Authorization: ${ARGO_TOKEN}" \
  https://argo.example.com/api/v1/workflows/workflows
```

Avoid `--insecure` outside a disposable local test. It hides hostname and trust-chain errors and exposes bearer credentials to interception.

## Submit a Workflow Through the REST API

The submission endpoint is `POST /api/v1/workflows/{namespace}`. The request body wraps the Workflow object:

```bash
curl --fail-with-body --show-error \
  --request POST \
  --header "Authorization: ${ARGO_TOKEN}" \
  --header 'Content-Type: application/json' \
  --data-binary @- \
  https://argo.example.com/api/v1/workflows/workflows <<'JSON'
{
  "namespace": "workflows",
  "serverDryRun": false,
  "workflow": {
    "apiVersion": "argoproj.io/v1alpha1",
    "kind": "Workflow",
    "metadata": {
      "generateName": "api-smoke-",
      "namespace": "workflows"
    },
    "spec": {
      "serviceAccountName": "workflow-runner",
      "entrypoint": "hello",
      "templates": [
        {
          "name": "hello",
          "container": {
            "image": "alpine:3.23",
            "command": ["echo"],
            "args": ["submitted through Argo Server"]
          }
        }
      ]
    }
  }
}
JSON
```

The namespace appears both in the URL/request wrapper and in the Workflow metadata. Keep them consistent. `workflow-runner` must exist and have the executor permissions needed by the Workflow; it should not be the API client's identity by accident.

For client libraries, use the same base URL, Bearer header, JSON model, TLS trust, timeout, and token-refresh behavior. The interactive Swagger page exposed by Argo Server is useful for confirming the exact endpoint and request model for the installed release.

## Handle an Ingress Base Path Correctly

If Argo is served below `/argo/`, the UI base href and ingress rewrite determine the externally visible API URL. One installation may expose:

```text
https://platform.example.com/argo/api/v1/workflows/workflows
```

while another rewrites `/argo/` and exposes the backend's `/api/v1/...` path directly. Confirm the effective route in the browser's network panel or ingress configuration rather than appending paths until one returns a non-404 response.

For the Argo CLI, configure the corresponding values:

```bash
export ARGO_SERVER=platform.example.com:443
export ARGO_SECURE=true
export ARGO_HTTP1=true
export ARGO_BASE_HREF=/argo
export ARGO_NAMESPACE=workflows
export ARGO_TOKEN

argo list
```

`ARGO_TOKEN` must include the form expected by the CLI, which Argo's access-token guide shows as `Bearer <token>`.

## What If the Server Is SSO-Only?

If Argo Server runs only with `--auth-mode=sso`, a Kubernetes service account bearer token is not accepted as a client-mode credential. You have three realistic choices:

1. Add `--auth-mode=client` to the same server, with least-privilege Kubernetes RBAC.
2. Operate a separately exposed Argo Server path for automation with client auth and strict network controls, while keeping the human endpoint SSO-only.
3. For a genuinely interactive tool, let the browser complete SSO and use the Argo-issued session as a user session.

The third choice is not a good CI credential. Argo's SSO token has a configured session lifetime, is associated with a human login, and can be revoked globally by replacing Argo Server's SSO encryption key and restarting every Argo Server Pod. A raw identity-provider token is not a supported substitute for that exchanged Argo session.

Do not solve an SSO-only automation failure by changing the request from an Authorization header to a copied browser cookie and keeping it indefinitely. That turns a personal session into an unmanaged machine secret.

## Distinguish Authentication from Authorization Errors

The HTTP status and Argo Server logs narrow the problem:

| Symptom | Likely cause |
| --- | --- |
| `401` / unauthenticated | Missing, expired, malformed, or unsupported token; wrong auth mode |
| `403` / forbidden | Token is valid but Kubernetes/SSO-mapped service account lacks permission |
| `404` | Base path, ingress rewrite, endpoint, namespace, or object name is wrong |
| `EOF` or protocol error | HTTP sent to an HTTPS listener, or proxy/backend protocol mismatch |
| Browser redirect or HTML | Request hit the UI/SSO route rather than an authenticated API route |
| SSO works but one namespace fails | SSO RBAC mapping or RoleBinding does not cover that namespace |

Useful checks:

```bash
# Verify server modes and request failures.
kubectl logs -n argo deployment/argo-server --tail=200

# Verify the client identity's effective Kubernetes permission.
kubectl auth can-i list workflows.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:report-api-client

# Include response headers and a TLS verification result without printing request headers.
curl --silent --show-error --output /dev/null \
  --dump-header - \
  --write-out '\nHTTP %{response_code}; remote %{remote_ip}; TLS verify %{ssl_verify_result}\n' \
  --header "Authorization: ${ARGO_TOKEN}" \
  https://argo.example.com/api/v1/userinfo
```

Be careful with `set -x`, verbose HTTP client logging, exception dumps, and CI artifacts: all can leak the Bearer token.

## Production Checklist

Before enabling an integration:

1. Keep SSO for humans and enable client auth only where automation needs it.
2. Create a unique namespaced service account per client.
3. Grant only the exact Workflow verbs and supporting reads the client uses.
4. Request short-lived TokenRequest credentials and refresh them automatically.
5. Keep the server behind verified TLS and configure the correct base path.
6. Test both an allowed request and an intentionally denied request.
7. Separate the API caller identity from the Workflow runtime identity.
8. Prevent token values from entering logs, command traces, and source control.
9. Monitor authentication failures and API rate-limit responses.
10. Document token rotation and revocation before an incident.

SSO being enabled does not mean every API client must impersonate a browser. Argo's multi-mode server is the intended bridge: SSO maps human claims to service accounts, while client mode validates purpose-built Kubernetes credentials for automation.

## Official Documentation

- [Argo Workflows: Argo Server Auth Mode](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)
- [Argo Workflows: Argo Server SSO](https://argo-workflows.readthedocs.io/en/latest/argo-server-sso/)
- [Argo Workflows: Access Token](https://argo-workflows.readthedocs.io/en/latest/access-token/)
- [Argo Workflows: REST API](https://argo-workflows.readthedocs.io/en/latest/rest-api/)
- [Argo Workflows: API Reference](https://argo-workflows.readthedocs.io/en/latest/swagger/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: `kubectl create token`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/)
