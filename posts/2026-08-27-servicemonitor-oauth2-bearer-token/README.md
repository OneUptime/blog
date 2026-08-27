# Send OAuth2 or Bearer Tokens from a ServiceMonitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, OAuth2, Bearer Token, Kubernetes Secrets

Description: Use safe Secret selectors for static Bearer credentials or OAuth2 client credentials instead of deprecated and potentially forbidden token-file paths.

---

A ServiceMonitor should not point at an arbitrary file inside the Prometheus container to obtain a token. A path such as `/var/run/secrets/kubernetes.io/serviceaccount/token` can send Prometheus's own credential to every selected scrape target. Prometheus Operator provides Secret-backed `authorization` and `oauth2` fields that avoid filesystem access.

Administrators can enforce this boundary on the Prometheus resource:

```yaml
spec:
  arbitraryFSAccessThroughSMs:
    deny: true
```

With `deny: true`, file-based ServiceMonitor configuration such as `bearerTokenFile` is rejected. The field is also deprecated on a ServiceMonitor endpoint in favor of `authorization`.

## Send a Static Bearer Token with `authorization`

Create a Secret containing only the token value, without the word `Bearer`:

```bash
kubectl create secret generic metrics-bearer \
  --namespace=monitoring \
  --from-literal=token='replace-with-the-issued-token'
```

Reference it from the endpoint:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: private-api
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: private-api
  endpoints:
    - port: metrics
      scheme: https
      authorization:
        type: Bearer
        credentials:
          name: metrics-bearer
          key: token
```

`authorization` requires Prometheus 2.26 or newer. `type` is case-insensitive and defaults to `Bearer`; declaring it makes intent clear. `Basic` is not a supported value for `authorization`. Use the separate `basicAuth` field for HTTP Basic Authentication.

The Secret must be in the ServiceMonitor's namespace and readable by the Operator. A static Bearer token does not refresh itself. Its issuer, expiration, rotation mechanism, and audience must fit a continuously running scraper.

The older `bearerTokenSecret` field also selects a Secret key and avoids an arbitrary path, but the current API deprecates it in favor of `authorization`.

## Use OAuth2 Client Credentials to Fetch Access Tokens

Prometheus can obtain access tokens from an OAuth2 token endpoint using a client ID and client secret. OAuth2 endpoint support requires Prometheus 2.27 or newer.

Store the client values:

```bash
kubectl create secret generic metrics-oauth-client \
  --namespace=monitoring \
  --from-literal=client-id='prometheus-metrics' \
  --from-literal=client-secret='replace-with-client-secret'
```

Configure the ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: oauth-api
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: oauth-api
  endpoints:
    - port: metrics
      scheme: https
      oauth2:
        clientId:
          secret:
            name: metrics-oauth-client
            key: client-id
        clientSecret:
          name: metrics-oauth-client
          key: client-secret
        tokenUrl: https://identity.example.com/oauth2/token
        scopes:
          - metrics.read
```

`clientId` accepts a Secret or ConfigMap selector. `clientSecret` must use a Secret selector. `tokenUrl` is where Prometheus requests tokens, and `scopes` are sent with that request. Optional `endpointParams` can supply provider-specific token parameters.

If the OAuth2 token endpoint itself requires custom TLS trust or client TLS, `oauth2.tlsConfig` is available with Prometheus 2.43 or newer. That version requirement is separate from the base OAuth2 requirement.

The configuration shown here uses Prometheus's non-interactive OAuth 2.0 client credentials grant. It cannot complete an interactive browser login or authorization-code consent flow.

## Choose Exactly One Authentication Method

On a ServiceMonitor endpoint, these fields are mutually exclusive:

- `authorization`;
- `basicAuth`;
- `oauth2`;
- deprecated `bearerTokenSecret`.

Prometheus Operator rejects ambiguous combinations. TLS client authentication in `tlsConfig` is a transport credential and can be combined with one HTTP authentication method when the target requires both.

## Diagnose the Right Request

OAuth2 introduces two outbound requests:

```text
Prometheus -> tokenUrl        obtains access token
Prometheus -> metrics target  sends Bearer access token
```

Distinguish their failures:

| Symptom | Likely boundary |
| --- | --- |
| token endpoint `invalid_client` | client ID, client secret, or client authentication policy |
| token endpoint `invalid_scope` | unsupported or unauthorized scope |
| DNS, TLS, or timeout for `tokenUrl` | Prometheus egress or token-endpoint trust |
| metrics endpoint `401` | expired, wrong audience, malformed, or missing access token |
| metrics endpoint `403` | token accepted but lacks authorization |
| ServiceMonitor rejection Event | missing Secret/key, mutually exclusive fields, or forbidden file path |

Check the actual resource Event first:

```bash
kubectl get events -n monitoring \
  --field-selector=involvedObject.kind=ServiceMonitor,involvedObject.name=oauth-api \
  --sort-by=.metadata.creationTimestamp
```

Then inspect Prometheus logs and **Status > Targets**. Do not print access tokens in logs, shell traces, generated-configuration excerpts, or support tickets.

## Secure and Rotate the Secrets

Apply least-privilege RBAC to Secrets and enable Kubernetes encryption at rest. Scope OAuth clients and tokens to metrics read access, use the intended audience, and choose the shortest usable lifetime.

Update referenced Secrets atomically. For static Bearer tokens, coordinate overlap if the issuer can accept old and new credentials simultaneously. For OAuth2, rotate the client secret while preserving a valid credential long enough for Prometheus to fetch a new access token.

Do not reuse the Prometheus Kubernetes service-account token as an application scrape credential. The arbitrary-file restriction exists specifically to prevent monitor authors from exfiltrating credentials available inside the Prometheus container.

## Official Documentation

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator SafeAuthorization API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.SafeAuthorization)
- [Prometheus Operator OAuth2 API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.OAuth2)
- [Prometheus Operator arbitrary filesystem access policy](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ArbitraryFSAccessThroughSMsConfig)
- [Prometheus OAuth2 and authorization configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#oauth2)
- [Kubernetes Secret security guidance](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)

## Conclusion

Use `authorization.credentials` for a static Bearer token and `oauth2` to fetch access tokens with the OAuth 2.0 client credentials grant. Both read explicitly selected Secret keys and work with `arbitraryFSAccessThroughSMs.deny: true`. Avoid `bearerTokenFile`, choose one HTTP authentication method per endpoint, and diagnose the token request separately from the metrics request.
