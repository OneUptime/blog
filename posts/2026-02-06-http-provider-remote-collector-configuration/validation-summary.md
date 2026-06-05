# Validation Summary: How to Use the HTTP Provider for Remote Collector Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector config providers
- HTTP and HTTPS remote configuration
- Go HTTP servers
- Kubernetes Deployments, DaemonSets, Services, ConfigMaps, and Secrets
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector HTTP provider package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/confmap/provider/httpprovider
- OpenTelemetry Collector HTTPS provider package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/confmap/provider/httpsprovider
- OpenTelemetry Collector confmap package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/confmap
- OpenTelemetry Collector HTTP/HTTPS provider source: https://github.com/open-telemetry/opentelemetry-collector/tree/main/confmap/provider
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The post described a `providers:` configuration block with `enabled`, `endpoint`, `poll_interval`, custom headers, and TLS fields. OpenTelemetry Collector config providers are selected with `--config=<scheme>:<opaque_data>` URIs, so I replaced this with `--config` HTTP/HTTPS URI usage.
- The post claimed the Collector polls HTTP endpoints and applies updates automatically. The built-in HTTP/HTTPS provider retrieves configuration via GET and does not expose the documented polling settings shown in the post, so I changed the text to state that changed remote config requires restarting or rolling the Collector.
- The sample command used `--feature-gates=configprovider.Enable`, which is not required for the stable HTTP/HTTPS config providers. I removed it.
- The sample server loaded YAML configuration files but attempted to unmarshal and return JSON. I changed it to return the YAML file bytes with `application/x-yaml`.
- The sample server expected custom request headers from the Collector, but the built-in HTTP/HTTPS providers issue a GET request for the URI and do not provide the shown header configuration. I changed the examples to pass `collector_id` and `token` as URI query parameters and added a note about stronger production authentication patterns.
- The template example referenced missing helper functions and included an unused import. I added the helper functions and fixed imports.
- The Go template used whitespace-trimming delimiters that could collapse YAML keys onto invalid lines. I replaced them with non-trimming template actions.
- The versioned config handler ignored invalid `version` query values and could return an empty configuration. I added validation and a not-found response.
- The Kubernetes Collector example mounted a local base config containing the invalid `providers:` block. I changed it to pass the remote HTTP config URI directly in `args`.
- The Kubernetes example referenced `$(NODE_NAME)` before defining it and mounted config files at paths that did not match the server. I reordered the environment variables and added ConfigMap item paths matching `/configs/<env>/config.yaml`.

## Review Notes
The corrected examples still use query-string tokens for simplicity because the built-in providers do not support custom request headers. For production deployments, prefer HTTPS plus a trusted internal network boundary, service-mesh/proxy authentication, or signed short-lived config URLs.
