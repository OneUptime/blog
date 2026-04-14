# Validation Summary: How to Send Dapr Logs to Datadog

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar logging, Kubernetes annotations)
- Datadog (Agent, Helm chart, log pipelines, Logs Explorer, Monitors API)
- Kubernetes (pod annotations, DaemonSets, Helm)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Datadog Kubernetes log collection: https://docs.datadoghq.com/containers/kubernetes/log/
- Datadog log pipeline processors reference: https://docs.datadoghq.com/logs/log_configuration/processors/
- Datadog log pipelines overview: https://docs.datadoghq.com/logs/log_configuration/pipelines/
- Datadog Logs Pipelines API: https://docs.datadoghq.com/api/latest/logs-pipelines/
- Datadog Monitors API: https://docs.datadoghq.com/api/latest/monitors/

## Issues Found

### 1. Invalid `json-parser` processor type in pipeline configuration
**What was wrong:** The pipeline used a processor with `"type": "json-parser"`, which is not a valid Datadog log processor type. Datadog automatically parses JSON-formatted logs during preprocessing — there is no separate JSON parser processor.
**What was changed:** Removed the `json-parser` processor entirely and updated the introductory text to explain that Datadog handles JSON parsing automatically during preprocessing.

### 2. Incorrect use of `attribute-remapper` for status field
**What was wrong:** The pipeline used `"type": "attribute-remapper"` with `"target": "status"` to remap the log level. The `attribute-remapper` creates a regular attribute — it does not set Datadog's reserved `status` field. The correct processor type is `status-remapper`.
**What was changed:** Replaced with `"type": "status-remapper"` and removed the `target` and `preserve_source` fields (not applicable to status-remapper).

### 3. Incorrect use of `attribute-remapper` for service field
**What was wrong:** Same issue as above — used `attribute-remapper` to remap `app_id` to the service field. The correct processor is `service-remapper`.
**What was changed:** Replaced with `"type": "service-remapper"` and removed the `target` and `preserve_source` fields.

### 4. Incorrect source attribute paths (`parsed.level`, `parsed.app_id`)
**What was wrong:** The remapper sources referenced `parsed.level` and `parsed.app_id`, which assumed the non-existent `json-parser` had extracted fields under a `parsed` prefix. Since Datadog auto-parses JSON, the attributes are at the root level.
**What was changed:** Updated sources to `level` and `app_id` respectively.

### 5. Incorrect query attribute path (`@parsed.app_id`)
**What was wrong:** The Logs Explorer query used `@parsed.app_id:payment-service`, referencing the non-existent `parsed` prefix.
**What was changed:** Updated to `@app_id:payment-service`.

## Review Notes
- The Dapr annotations (`dapr.io/log-as-json`, `dapr.io/log-level`, `dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all valid and correctly documented.
- The Datadog Helm chart installation command uses correct values (`datadog.apiKey`, `datadog.logs.enabled`, `datadog.logs.containerCollectAll`).
- The Datadog autodiscovery annotations (`ad.datadoghq.com/daprd.logs`) use the correct container name (`daprd` for the Dapr sidecar).
- The Datadog Monitors API call uses the correct endpoint, headers, and log alert query syntax.
- The `agents.image.tag=7` pins to the Datadog Agent 7 major version, which is current. This may need updating if Datadog releases Agent 8 in the future.
