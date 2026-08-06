# Secure Argo Events Webhooks with Signatures, Tokens, and TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, GitHub Webhooks, Kubernetes Secrets, TLS, HMAC, Bearer Token, Security

Description: Secure Argo Events webhook ingestion with GitHub HMAC validation, generic bearer authentication, HTTPS, least privilege, and tested rotation.

---

A webhook endpoint needs more than an unguessable URL. Protect three different properties independently:

1. **Origin and integrity:** prove who produced the exact request body.
2. **Transport confidentiality:** protect the body and credentials in transit.
3. **Authorization and containment:** limit who can reach the endpoint and what a valid event can trigger.

Argo Events exposes different controls for different EventSource types. A GitHub EventSource has `webhookSecret`, which validates GitHub's signed delivery. A generic webhook has `authSecret`, which expects an HTTP bearer token. `WebhookContext` can serve TLS directly with certificate and key Secret selectors, or an Ingress can terminate TLS. These mechanisms are complementary, not interchangeable.

## Prefer GitHub Signature Validation for GitHub

GitHub signs the raw request body with a shared webhook secret and sends the HMAC in `X-Hub-Signature-256`. Signature validation proves both possession of the secret and integrity of the bytes that were signed. GitHub recommends a high-entropy secret, HMAC-SHA256, and constant-time comparison.

The Argo Events GitHub EventSource implements provider-specific validation when `webhookSecret` is set. This example assumes a repository administrator creates the GitHub hook manually:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook-v1
  namespace: argo-events
type: Opaque
stringData:
  secret: replace-with-random-high-entropy-material
---
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: github
  namespace: argo-events
spec:
  github:
    repository-events:
      repositories:
        - owner: example-org
          names:
            - payments
      webhook:
        endpoint: /github
        port: "12000"
        method: POST
      webhookSecret:
        name: github-webhook-v1
        key: secret
```

In GitHub's webhook settings, set the payload URL to `https://events.example.com/github`, select `application/json`, subscribe only to `push` and `pull_request`, leave the hook active and SSL verification enabled, and configure exactly the same plaintext secret. `stringData` is convenient input to the Kubernetes API; the stored Secret `data` is base64-encoded, not automatically encrypted. Enable Kubernetes encryption at rest, restrict Secret RBAC, and avoid printing the Secret in CI logs.

Do not confuse these fields:

- `webhookSecret` verifies incoming GitHub deliveries.
- `apiToken` authorizes Argo Events to call GitHub's API to create or manage repository hooks.
- `githubApp` is an alternative API authentication method using an app private key, app ID, and installation ID.
- `webhook.url`, `events`, `contentType`, `active`, and `insecure` configure a hook that Argo creates through GitHub's API. `insecure: false` tells GitHub to verify the delivery endpoint's TLS certificate; it does not control Argo's GitHub API client.

If a repository administrator creates the hook manually, the EventSource does not need `apiToken`, but it still needs `webhookSecret` to validate deliveries. The provider-side fields above do not configure or filter a manually created hook, and `events` is not an incoming authorization policy. Local route activation is handled by the EventSource process; enforce repository, event, action, and branch authorization in Sensor filters or downstream code.

## Use Bearer Authentication for a Generic Webhook

For a producer that can attach an `Authorization` header but has no supported signature scheme, configure `authSecret` on a `webhook` entry:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: deploy-hook-token-v1
  namespace: argo-events
type: Opaque
stringData:
  token: replace-with-random-token
---
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: deploy-hook
  namespace: argo-events
spec:
  webhook:
    requests:
      endpoint: /deploy
      port: "12000"
      method: POST
      authSecret:
        name: deploy-hook-token-v1
        key: token
```

After routing this EventSource through a Service and HTTPS Ingress, the client sends the configured token as a bearer credential:

```bash
curl https://events.example.com/deploy \
  -H 'Authorization: Bearer replace-with-random-token' \
  -H 'Content-Type: application/json' \
  -d '{"service":"payments","revision":"8b65f2a"}'
```

Bearer authentication proves possession of a reusable token. It does not bind the credential cryptographically to the request body. TLS is therefore mandatory: without HTTPS, anyone who observes the token can replay or alter requests. Even with TLS, record a producer event ID and reject duplicate or stale actions in the downstream workflow.

Do not put the word `Bearer` in the Secret value unless you have tested that behavior against your installed Argo Events version. The official example stores the token itself and sends an `Authorization: Bearer <token>` header.

## Terminate TLS Deliberately

The most common topology uses a Service to select the EventSource pods, terminates a publicly trusted certificate at an Ingress, and forwards HTTP over a protected cluster network:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: github-eventsource-svc
  namespace: argo-events
spec:
  selector:
    eventsource-name: github
  ports:
    - name: webhook
      port: 12000
      targetPort: 12000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: event-hooks
  namespace: argo-events
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - events.example.com
      secretName: events-example-com-tls
  rules:
    - host: events.example.com
      http:
        paths:
          - path: /github
            pathType: Exact
            backend:
              service:
                name: github-eventsource-svc
                port:
                  number: 12000
```

Ingress TLS behavior is controller-specific. Configure HTTP-to-HTTPS redirection, modern protocols, request-size limits, and timeouts using the documentation for the installed controller. Preserve the raw request body. GitHub warns that a proxy modifying payload bytes before signature verification can make valid signatures fail.

If policy requires TLS to the EventSource container, `WebhookContext` supports `serverCertSecret` and `serverKeySecret`:

```yaml
spec:
  webhook:
    requests:
      endpoint: /deploy
      port: "12000"
      method: POST
      serverCertSecret:
        name: deploy-hook-tls
        key: tls.crt
      serverKeySecret:
        name: deploy-hook-tls
        key: tls.key
      authSecret:
        name: deploy-hook-token-v1
        key: token
```

Configure the Service and Ingress upstream protocol to match HTTPS when using this mode. Merely adding the certificate fields while an Ingress sends plain HTTP to the backend will break the route.

## Add Network and Trigger Boundaries

Authentication is not an authorization policy for the resulting automation. Reduce the blast radius at every layer:

- expose only exact webhook paths, not metrics, health, or unrelated ports;
- use provider source-address restrictions only as an additional signal, because address ranges change and proxies affect observed addresses;
- apply a NetworkPolicy that admits traffic only from the ingress controller namespace and allows EventSource egress only where required;
- subscribe to explicit GitHub event types instead of `"*"`;
- add Sensor data or expression filters for repository, branch, action, and allowed environment;
- give each Sensor a dedicated service account with permissions only for its trigger;
- keep production and nonproduction EventSources, Secrets, Sensors, and target namespaces separate.

For GitHub, validate the signature before trusting `X-GitHub-Event`, `X-GitHub-Delivery`, or any body field. Signature verification should occur in the EventSource, while business authorization remains a Sensor or workflow decision.

## Design Secret Rotation as a Deployment

Secret rotation fails when one side changes before the other. Loading behavior differs by field in Argo Events v1.9.11: the GitHub listener reads `webhookSecret` at startup, direct TLS loads its certificate and key when the server starts, and the generic webhook authentication handler reads `authSecret` from the mounted file for each request. Kubernetes updates mounted Secret volumes with eventual consistency. Verify the behavior of your installed release instead of assuming one reload model for every field.

Use a tested sequence:

1. Create a new, versioned Secret instead of overwriting an unknown live value.
2. Update the provider and EventSource through a planned cutover.
3. Restart or roll the EventSource pods for a GitHub webhook secret or direct TLS certificate. For generic `authSecret`, verify that the projected value is in use, or roll the pods for a deterministic cutover.
4. Send a signed canary delivery and verify EventSource acceptance and Sensor receipt.
5. Test that the old credential is rejected.
6. Remove the old Secret only after provider redelivery windows and rollback needs are understood.

A GitHub hook normally has one active webhook secret. There is no portable promise of dual-secret validation in the Argo Events `webhookSecret` field. If uninterrupted rotation is mandatory, create a second webhook/EventSource endpoint temporarily, or put a controlled signature-verifying gateway in front that explicitly supports overlapping keys. Test duplicate deliveries during overlap because two hooks can emit the same logical event.

For a generic bearer token, a parallel endpoint is also clearer than relying on an eventually projected in-place update or assuming two `Authorization` values can be accepted. Give the new endpoint a distinct path and EventSource event name, route both dependencies to an idempotent handler during the overlap, then retire the old one.

TLS certificate rotation depends on where TLS terminates. Ingress controllers and certificate operators often reload updated Secrets, while Argo Events v1.9.11 passes the direct-TLS certificate paths to Go's server at startup, which loads the key pair once. Restart the EventSource for direct-TLS renewal and verify the behavior in the installed release. Observe a real TLS handshake after renewal:

```bash
openssl s_client -connect events.example.com:443 \
  -servername events.example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -fingerprint
```

## Verify Negative Cases

A security test is incomplete if it only sends a valid event. In a nonproduction endpoint, verify:

- missing signature or bearer header is rejected;
- a signature generated with the wrong secret is rejected;
- changing one byte of a correctly signed body is rejected;
- HTTP is redirected or unavailable;
- an expired or wrong-host certificate is rejected by a normal client;
- a validly authenticated but unauthorized repository or branch is filtered;
- a replayed delivery ID does not repeat an irreversible action;
- the Sensor service account cannot create resources outside its intended scope;
- rotation accepts the new credential and rejects the retired credential.

Do not log bearer tokens, webhook secrets, complete authorization headers, or sensitive payloads. Log a safe delivery ID, EventSource name, event name, Sensor dependency, and trigger result instead.

## Official Documentation

- [Argo Events GitHub EventSource](https://argoproj.github.io/argo-events/eventsources/setup/github/)
- [Argo Events webhook authentication](https://argoproj.github.io/argo-events/eventsources/webhook-authentication/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [GitHub validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Ingress TLS](https://kubernetes.io/docs/concepts/services-networking/ingress/#tls)

## Conclusion

Use GitHub's HMAC validation for GitHub, bearer authentication only for producers that need it, and HTTPS for every public route. Then constrain accepted events and Sensor permissions. Treat every secret or certificate rotation as a tested multi-system deployment, not as a blind Secret update.
