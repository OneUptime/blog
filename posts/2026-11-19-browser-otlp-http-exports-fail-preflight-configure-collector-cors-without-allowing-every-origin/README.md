# Browser OTLP/HTTP Exports Fail Preflight: Configure Collector CORS Without Allowing Every Origin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, CORS, Troubleshooting

Description: Fix browser OTLP HTTP preflight failures with explicit Collector origins and headers, then verify the proxy, CSP, and actual export request separately.

A browser sends an `OPTIONS` request to your telemetry endpoint, receives a response, and still refuses to send traces. Meanwhile, the same export works from curl. That difference usually points to a browser policy check rather than an OTLP serialization problem.

CORS controls which web origins may read responses from a different origin. The policy needs to match the application's scheme, hostname, and port, plus the headers its exporter actually sends.

## Inspect the browser request first

Open the browser Network panel and select the failed preflight. Record the request URL and these headers:

```text
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type,x-client-version
```

Do not copy a guessed header list from another application. A custom authentication header, SDK version header, or changed content type can alter the preflight requirements.

If there is no network request at all, inspect the console for Content Security Policy or mixed-content failures. An HTTPS page exporting to an HTTP endpoint can fail before Collector CORS becomes relevant. The OpenTelemetry [JavaScript exporter guide](https://opentelemetry.io/docs/languages/js/exporters/) explains the browser's HTTP exporter, CSP, and CORS constraints.

## Configure the HTTP receiver

This minimal Collector configuration accepts browser trace exports from two specific application origins:

```yaml
receivers:
  otlp/browser:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - https://app.example.com
            - https://staging.example.com
          allowed_headers:
            - Content-Type
            - X-Client-Version
          max_age: 600

exporters:
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp/browser]
      exporters: [debug]
```

This is a diagnostic pipeline behind a trusted HTTPS reverse proxy. It prints a basic summary instead of exporting to a production backend. The public proxy needs a valid certificate, and the receiver should only be reachable through the intended network path.

An origin is not a page URL. Do not append `/checkout` or another application path. `https://app.example.com` and `http://app.example.com` are different origins; so are `http://localhost:3000` and `http://localhost:5173`.

The Collector's [HTTP server configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md) defines `cors.allowed_origins`, `allowed_headers`, and `max_age`. Use explicit origins for production. A broad wildcard removes the boundary you are trying to establish, and wildcard handling has additional restrictions for credentialed browser requests.

## Reproduce the preflight at each hop

Send the same origin and requested headers shown in the browser:

```bash
curl --include --request OPTIONS \
  --header 'Origin: https://app.example.com' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: content-type,x-client-version' \
  https://telemetry.example.com/v1/traces
```

Inspect the response's `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`. A 200 or 204 alone is insufficient. The browser must be allowed to use its origin, `POST`, and requested headers.

Repeat with an unapproved origin. It must not receive a CORS authorization granting that origin access. Curl itself does not enforce CORS; it is only showing the response the browser would evaluate.

If the Collector response is correct but the public response is wrong, inspect the proxy. It may intercept `OPTIONS`, redirect to a login page, strip CORS headers, or add a second conflicting `Access-Control-Allow-Origin`. Choose one layer to own the policy and ensure the actual `POST` response follows the same policy.

## Separate CORS from authentication

A successful preflight does not authenticate the sender. CORS also does not prevent a server-side client from sending requests, since that client is not bound by browser enforcement.

Do not embed a privileged backend API key in browser JavaScript. Anyone loading the page can recover it. Use a browser ingestion endpoint with appropriate authentication, input limits, and abuse controls, or a server-side telemetry proxy with credentials held on the server. If authentication is required for actual exports, arrange the edge so preflight can be evaluated without an interactive login redirect.

## Confirm a real export

After changing the configuration, inspect both `OPTIONS` and `POST` in the browser. Preflight results can be cached, so allow the old policy to expire or clear the relevant browser state during testing.

Send one test interaction, then verify its span reaches the intended backend after replacing the diagnostic exporter. Also test the staging origin, an unapproved origin, a missing credential, and the application's actual CSP. This catches the common situation where CORS is fixed but a second policy still prevents delivery.
