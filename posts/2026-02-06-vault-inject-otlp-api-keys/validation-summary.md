# Validation Summary: How to Use HashiCorp Vault to Inject OTLP Exporter API Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP exporter
- HashiCorp Vault
- Vault Agent templates
- Vault Agent Injector for Kubernetes
- Vault KV v2
- Kubernetes Deployments

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector registry: https://opentelemetry.io/ecosystem/registry/?language=collector
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault KV command documentation: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault kv put command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/put

## Issues Found
- The post listed a "Direct Vault config source" as a Collector contrib feature, but the current official Collector configuration docs list file, env, yaml, http, and https providers, and the Collector registry does not show a HashiCorp Vault provider. Changed this to "Custom Collector config providers" to avoid implying a built-in Vault provider exists.
- The Vault Agent template example used the deprecated `command` option. Replaced it with the documented `exec` block while keeping the same reload-hook intent.
- The Kubernetes injector example mixed Vault Agent annotations, a ConfigMap-mounted Collector config, and a Kubernetes Secret environment variable that the Vault injector would not create. Reworked the snippet so the Vault injector renders `/vault/secrets/collector-config.yaml` and the Collector starts with that file.
- The secret rotation section implied immediate detection of static KV secret changes and described only the deprecated `command` option. Updated it to mention Vault Agent's `static_secret_render_interval` behavior for KV v2 and to reference `exec` or `agent-inject-command` hooks.

## Review Notes
The examples assume the Vault `secret` mount is KV v2, which matches the use of `secret/data/...` in policies and Vault Agent templates. The `otel/opentelemetry-collector-contrib:0.96.0` image is older than current releases but remains plausible for the shown configuration.
