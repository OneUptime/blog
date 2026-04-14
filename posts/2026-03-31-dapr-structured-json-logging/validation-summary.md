# Validation Summary: How to Configure Structured JSON Logging in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar runtime, Configuration CRD, pod annotations)
- Kubernetes (Deployment manifests, pod annotations)
- Node.js with pino logger
- Python with structlog
- JSON structured logging

## Sources Consulted
- Dapr annotations reference (dapr.io/enable-api-logging, dapr.io/log-as-json, dapr.io/log-level)
- Dapr Configuration CRD spec (apiLogging fields: enabled, obfuscateURLs, omitHealthChecks)
- Dapr source code: github.com/dapr/dapr/pkg/injector/annotations/annotations.go (annotation key definitions)
- Dapr source code: github.com/dapr/kit/logger/logger.go (JSON log field names, log level constants)
- Dapr CLI reference (`dapr run` log-level flag documentation)
- pino logger documentation (base, timestamp, formatters options)
- structlog documentation (processors, TimeStamper, JSONRenderer)

## Issues Found
1. **Incorrect API logging annotation** (line 120): The post used `dapr.io/api-logging: "true"` which is not a valid Dapr annotation. The correct annotation is `dapr.io/enable-api-logging: "true"`, matching the `--enable-api-logging` CLI flag. Fixed in-place.

## Review Notes
- The post lists `fatal` as a valid log level. This is technically correct per the Dapr runtime source code (`toLogLevel()` explicitly handles "fatal"), but the Kubernetes annotations reference documentation only lists four levels: `debug`, `info`, `warn`, `error`. The inclusion of `fatal` is defensible but readers should be aware it is not prominently documented for the annotation context.
- The example JSON log output omits the `scope` and `type` fields that Dapr actually includes in its JSON output (e.g., `"scope":"dapr.runtime"`, `"type":"log"`). This is a simplification for illustration purposes and not incorrect, but readers may see additional fields in real Dapr log output.
- The pino and structlog code examples are syntactically correct and demonstrate reasonable approaches for aligning application logs with Dapr's JSON format.
- The Configuration CRD structure, field names, and casing (notably `obfuscateURLs` with capital "URLs") are all correct.
