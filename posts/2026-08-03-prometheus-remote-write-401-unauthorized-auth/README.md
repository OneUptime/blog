# Prometheus Remote Write 401: Basic Auth, Bearer Tokens, and OAuth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, HTTP 401, Basic Auth, Bearer Token, OAuth 2.0, Security

Description: Configure supported Remote Write authentication methods, protect secrets, and diagnose credentials, redirects, token scopes, and proxy failures.

---

An HTTP 401 response from a Remote Write endpoint means the request reached an authentication boundary but did not present credentials that boundary accepts. The boundary may be the metrics service, Prometheus web authentication, an ingress, or an identity-aware proxy.

Prometheus supports Basic authentication, a static `Authorization` credential such as a bearer token, and OAuth 2.0 token acquisition in each `remote_write` entry. These mechanisms are mutually exclusive for one HTTP client. Choose the method required by the receiver instead of trying to configure all three.

## Basic Authentication

Use `basic_auth` when the receiver expects an HTTP Basic username and password:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    basic_auth:
      username: remote-writer
      password_file: /etc/prometheus/secrets/remote-write-password
```

The password file should contain only the password. Mount it read-only, ensure it is owned by the account that runs Prometheus, and restrict its mode:

```bash
chmod 0400 /etc/prometheus/secrets/remote-write-password
```

Current Prometheus also supports `username_file`; each username field is mutually exclusive with its file form, as is each password field. File-backed secrets avoid placing the password directly in `prometheus.yml` or rendered Helm values. Prometheus redacts fields marked as secrets from its HTTP API, but the configuration file on disk still needs protection.

If you operate the receiving Prometheus, its official web configuration can enable Basic authentication:

```yaml
# web-config.yml on the destination
basic_auth_users:
  remote-writer: <bcrypt-password-hash>
```

Start that destination with `--web.config.file=/etc/prometheus/web-config.yml` as well as `--web.enable-remote-write-receiver`. Prometheus's web Basic-auth file stores a bcrypt hash, whereas the sender's `password_file` contains the plaintext password used for the HTTP exchange.

## Static Bearer Tokens

Use the current `authorization` syntax for a pre-issued bearer token:

```yaml
remote_write:
  - name: managed-metrics
    url: https://metrics.example.net/api/v1/write
    authorization:
      type: Bearer
      credentials_file: /var/run/secrets/metrics/token
```

`Bearer` is the default type, so `type` may be omitted. Being explicit can make an operational review clearer. The file contains the token value, not the `Bearer ` prefix.

For another HTTP authorization scheme supported by the service, set its type exactly as documented by that service:

```yaml
authorization:
  type: Token
  credentials_file: /var/run/secrets/metrics/token
```

Do not put an `Authorization` entry under `headers`. Prometheus owns protocol and authentication headers, and its configuration intentionally provides structured authentication fields.

For a Kubernetes projected service-account token, ensure the token audience matches what the receiver validates. A valid token for the Kubernetes API is not automatically valid for a metrics gateway.

## OAuth 2.0 Client Credentials

Use `oauth2` when Prometheus must obtain and refresh access tokens from an authorization server:

```yaml
remote_write:
  - name: oauth-metrics
    url: https://metrics.example.net/api/v1/write
    oauth2:
      client_id: prometheus-edge
      client_secret_file: /etc/prometheus/secrets/oauth-client-secret
      token_url: https://identity.example.net/oauth2/token
      scopes:
        - metrics.write
    tls_config:
      ca_file: /etc/prometheus/pki/metrics-ca.pem
```

Prometheus uses the client-credentials grant by default. The authorization server returns an access token, and Prometheus presents it to the Remote Write endpoint.

There are two separate TLS connections here:

```text
Prometheus -> identity.example.net token endpoint
Prometheus -> metrics.example.net Remote Write endpoint
```

If the identity server uses a private CA, configure the nested OAuth TLS settings as well:

```yaml
oauth2:
  client_id: prometheus-edge
  client_secret_file: /etc/prometheus/secrets/oauth-client-secret
  token_url: https://identity.example.net/oauth2/token
  scopes:
    - metrics.write
  tls_config:
    ca_file: /etc/prometheus/pki/identity-ca.pem

tls_config:
  ca_file: /etc/prometheus/pki/metrics-ca.pem
```

Current Prometheus also documents a JWT bearer grant. Use it only when the identity provider requires RFC 7523 and configure its signing key and claims according to that provider. Do not confuse OAuth client credentials with a static bearer token: OAuth requires a token endpoint, client identity, and usually scopes.

## Authentication Methods Cannot Be Combined

This is invalid:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
    basic_auth:
      username: remote-writer
      password_file: /run/secrets/password
    authorization:
      credentials_file: /run/secrets/token
```

`basic_auth`, `authorization`, and `oauth2` all control the same HTTP authorization behavior. Prometheus rejects conflicting configuration during validation.

Validate before reload:

```bash
promtool check config /etc/prometheus/prometheus.yml
```

## Separate Authentication from Tenant Routing

Some multi-tenant receivers require both authorization and a tenant header. They solve different problems:

```yaml
remote_write:
  - name: tenant-a
    url: https://metrics.example.net/api/v1/push
    authorization:
      credentials_file: /etc/prometheus/secrets/tenant-a-token
    headers:
      X-Scope-OrgID: tenant-a
```

Use only headers documented by the receiver. A correct bearer token with the wrong tenant can produce 401 or 403 depending on gateway policy. A tenant header without authentication may be spoofable, so do not treat it as a credential unless the service explicitly does.

## A Reliable 401 Diagnostic Sequence

### 1. Identify the Responder

Capture headers and the short response body:

```bash
curl --silent --show-error \
  --request POST \
  --dump-header - \
  --output /tmp/remote-write-auth-response.txt \
  https://metrics.example.net/api/v1/write
```

The empty request is intentionally not valid Remote Write. A 401 shows that the responder rejected it for lack of acceptable credentials; it does not by itself identify which component did so. After valid credentials, a 400 decode error is a useful sign that authentication passed, but only the actual Prometheus sender can prove successful ingestion.

Inspect `WWW-Authenticate`, proxy headers, and whether the body came from Prometheus, an ingress, or an identity provider.

### 2. Test the Chosen Credential Without Printing It

For Basic auth:

```bash
curl --silent --show-error \
  --user "remote-writer:$(< /etc/prometheus/secrets/remote-write-password)" \
  --request POST \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  https://metrics.example.net/api/v1/write
```

For a bearer token:

```bash
curl --silent --show-error \
  --header "Authorization: Bearer $(< /var/run/secrets/metrics/token)" \
  --request POST \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  https://metrics.example.net/api/v1/write
```

These commands can expose secrets through process inspection on some systems. Run them only in a controlled diagnostic environment, prefer a `.netrc` or protected temporary config where appropriate, and do not paste their expanded command lines into tickets.

### 3. Check the Final URL

Use the final Remote Write URL directly. Prometheus follows redirects by default, but starting with Prometheus 3.13 it does not forward credentials after a redirect leaves the original host's domain. This protects secrets from cross-host leakage and means a redirect from `metrics.example.net` to `ingest.vendor.example` can turn a configured credential into a 401 at the second host.

Also watch for HTTP-to-HTTPS redirects, missing path prefixes, and login redirects that return HTML.

### 4. Check Secret Shape and Access

Confirm that:

- the mounted file exists in the Prometheus container;
- the Prometheus user can read it;
- the secret is not expired or revoked;
- a copied token does not include unintended surrounding text;
- the OAuth client is allowed the required audience and scope;
- clocks are synchronized for time-bound tokens.

Avoid logging the credential. Compare issuer, audience, expiry, and scope metadata through approved tooling if the token format and security policy allow it.

### 5. Distinguish 401 from 403

An identity layer generally uses 401 when authentication is absent or invalid and 403 when an authenticated identity lacks permission, although implementations vary. If a newly valid token changes the result from 401 to 403, investigate write permission, tenant binding, and policy rather than changing the token transport again.

## Verify the Real Remote Write Queue

After correcting auth and reloading Prometheus, use the sender's metrics:

```promql
rate(prometheus_remote_storage_samples_failed_total{remote_name="managed-metrics"}[5m])
```

```promql
rate(prometheus_remote_storage_samples_total{remote_name="managed-metrics"}[5m])
```

```promql
prometheus_remote_storage_samples_pending{remote_name="managed-metrics"}
```

Authentication failures are non-recoverable HTTP 4xx responses, so failed samples can be lost while the credentials remain wrong. A successful manual credential check does not recover those past samples. Confirm that new sends succeed, the queue drains, and the receiver shows current source-labeled data.

## Official Documentation

- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus HTTP client authentication configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_config)
- [Prometheus OAuth 2.0 configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#oauth2)
- [Prometheus TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config)
- [Prometheus HTTPS and authentication guide](https://prometheus.io/docs/guides/basic-auth/)
- [Prometheus web configuration schema](https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md)
- [Prometheus Remote Write 2.0 error semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#response)
- [Prometheus 3.13 credential redirect change](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#3130--2026-07-01)
