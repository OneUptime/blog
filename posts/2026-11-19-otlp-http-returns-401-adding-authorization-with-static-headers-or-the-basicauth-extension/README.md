# Fix OTLP/HTTP 401 Errors with Static Headers or the `basicauth` Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Authentication, Troubleshooting

Description: Trace OTLP HTTP 401 responses to the rejecting hop and configure static authorization headers or a Basic Auth client extension without exposing credentials.

A Collector can receive spans successfully while every export to the backend fails with HTTP 401. Authentication happens separately on each connection. Credentials accepted by the Collector receiver are not automatically forwarded to the next server.

Start by identifying which request failed: application to Collector, Collector to gateway, or gateway to backend. Then configure the client making that request with the authentication scheme the receiving service expects.

## Find the hop returning 401

Record the exporter name, target hostname, signal, and response status from the Collector logs. Compare that timestamp with gateway and backend access logs. A branded HTML response often points to an ingress authentication layer; a structured backend response may identify a missing tenant or invalid credential. These are clues, not proof of who rejected the request.

Check the effective URL, including any signal-specific override. A valid credential for one endpoint can fail against another environment or tenant. The [OTLP HTTP exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md) describes the base endpoint and explicit signal endpoints.

Use a small controlled request with the intended identity. For a Basic Auth endpoint, curl can prompt for the password instead of putting it directly in the command:

```bash
curl --include --user collector-user \
  --header 'Content-Type: application/json' \
  --data '{"resourceSpans":[]}' \
  https://telemetry.example.com/v1/traces
```

An empty request tests transport, routing, and authentication. It does not prove that a real span was stored. Keep certificate verification enabled and provide your private CA through `--cacert` if necessary.

## Option 1: set the outbound header explicitly

For a backend that expects a bearer token, this complete trace pipeline reads the token from the Collector process environment:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318

exporters:
  otlp_http/backend:
    endpoint: https://telemetry.example.com
    headers:
      Authorization: "Bearer ${env:OTLP_BACKEND_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp_http/backend]
```

The loopback receiver is appropriate for an application on the same host or in the same Pod network namespace. Change it deliberately when receiving traffic from elsewhere and configure access controls for that listener.

Use the exact header name and scheme documented by your backend. An API key might belong in a custom header rather than `Authorization`. A token with the word `Bearer` already included must not receive that prefix twice. The Collector's [HTTP client configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md) supports explicit outbound headers.

Environment expansion is configuration loading, not a live token refresh mechanism. Arrange a controlled restart when rotating environment-supplied credentials, and keep the credential itself in a secret manager or Kubernetes Secret.

## Option 2: let Basic Auth construct the header

If the endpoint expects a username and password, replace the exporter configuration above and add an extension:

```yaml
extensions:
  basic_auth/backend:
    client_auth:
      username: "${env:OTLP_BACKEND_USERNAME}"
      password: "${env:OTLP_BACKEND_PASSWORD}"

exporters:
  otlp_http/backend:
    endpoint: https://telemetry.example.com
    auth:
      authenticator: basic_auth/backend

service:
  extensions: [basic_auth/backend]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp_http/backend]
```

Keep the receiver from the first example. Use a Collector distribution containing this extension. Current upstream documentation calls the component `basic_auth`; `basicauth` is a deprecated alias. Older distributions may require their documented spelling. Likewise, current `otlp_http` replaces the deprecated `otlphttp` alias. Match component names to the binary you deploy.

Supply ordinary username and password values, not pre-encoded credentials. The [Basic Auth extension](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/basicauthextension/README.md) generates the authorization header. Do not also configure a conflicting static `Authorization` header on this exporter.

## Verify the actual configuration

Confirm the extension is both enabled in `service.extensions` and referenced by the failing exporter. An extension definition alone does not activate authentication. Check that the secret is present in the running container, that the correct Secret key was referenced, and that mounted credential files have no unintended formatting. Report presence and provenance without printing secret values.

Next send one identifiable test span, find it in the intended tenant, and watch the exporter error rate. Repeat after a controlled credential rotation. If curl succeeds but the Collector fails, compare the destination, proxy route, authentication scheme, and loaded credential version before changing retry settings.

A 401 is a configuration or identity problem. The OTLP HTTP exporter treats HTTP 401 as a permanent error and drops the failed batch instead of retrying it. Continued exports with the same invalid credentials will lose more telemetry. Repair the credential or route, then verify successful export and the amount of telemetry lost during the interruption.
