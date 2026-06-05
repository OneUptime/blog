# Validation Summary: How to Configure the Webhook Event Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Webhook Event Receiver
- Transform processor and OTTL
- Filter processor
- Collector HTTP server configuration
- Bearer token and basic authentication extensions
- GitHub webhooks
- OTLP and debug exporters

## Sources Consulted
- OpenTelemetry Collector Contrib Webhook Event Receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/webhookeventreceiver
- Webhook Event Receiver config implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/webhookeventreceiver/config.go
- Webhook Event Receiver request-to-log implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/webhookeventreceiver/req_to_log.go
- OpenTelemetry Collector HTTP server configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- Transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OTTL functions docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL log context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- Filter processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Bearer token authenticator extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/bearertokenauthextension
- Basic auth authenticator extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/basicauthextension
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- GitHub webhook signature validation docs: https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks

## Issues Found
- The receiver type used `webhookevent`, which is now a deprecated alias. Changed examples to use the current `webhook_event` component type.
- Several transform examples treated the receiver body as a parsed JSON map. The receiver emits the request body as a string log body, so examples now parse `log.body` with `ParseJSON` into `log.cache` before accessing fields.
- Header extraction used `include_metadata` and `http.request.header.*` attributes that the receiver does not create. Updated examples to use `header_attribute_regex` and the receiver's `header.<Header-Name>` log attributes.
- The endpoint example used `read_timeout` and `write_timeout` values above the receiver's 10 second validation limit. Changed them to `10s`.
- The default body-size description and `req_body_max_bytes` field were incorrect. Updated the field to `max_request_body_size` and clarified the receiver's default behavior.
- Authentication examples referenced the `debug` exporter without defining it. Added the missing exporter definitions.
- The GitHub webhook example used the GitHub webhook secret as a bearer token. GitHub sends HMAC signatures via `X-Hub-Signature-256`; the receiver does not validate that signature. Removed the bearer-token auth example there and added the signature-verification caveat.
- Multiple receiver examples bound several receiver instances to the same port. Since each receiver starts an HTTP server, updated multi-endpoint examples to use distinct ports.
- Filter processor examples used older `logs.log_record` syntax and inverted keep/drop behavior. Updated them to current `log_conditions` syntax and drop conditions.
- The production example used deprecated `service.telemetry.metrics.address`. Replaced it with current `metrics.readers.pull.exporter.prometheus` configuration.
- The error-handling example described `response_headers` as custom error responses. Corrected it to say the setting adds custom HTTP response headers.

## Review Notes
Could not run `otelcol validate` locally because no Collector binary was available on PATH. The review was performed against current official documentation and receiver source code.
