# Validation Summary: How to Integrate Portainer API with Datadog for Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Datadog API
- Python
- Docker Compose

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Engine API reference (`/containers/json`, `/containers/{id}/stats`): https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Engine API version history (`online_cpus` fallback guidance): https://docs.docker.com/reference/api/engine/version-history/
- Datadog Metrics API: https://docs.datadoghq.com/api/latest/metrics/
- Datadog Events API: https://docs.datadoghq.com/api/latest/events/
- Datadog Monitors API: https://docs.datadoghq.com/api/latest/monitors/
- Datadog monitor notification variables: https://docs.datadoghq.com/monitors/notify/variables/
- Datadog tagging rules: https://docs.datadoghq.com/getting_started/tagging/

## Issues Found
- The prerequisites and install command listed `datadog-api-client`, but the sample code actually used the `datadog` Python package. I corrected the dependency list to match the code so the installation step is accurate.
- The Python sample hardcoded Portainer and Datadog settings, while the Docker Compose example passed them as environment variables. I updated the script to read configuration from environment variables so the Compose deployment works as shown.
- The CPU calculation used `online_cpus` with a fallback of `1`. Docker’s API documentation notes that when `online_cpus` is absent, the compatible fallback is the length of `cpu_usage.percpu_usage`. I updated the calculation accordingly.
- The Datadog monitor creation example used `"type": "metric alert"`. Current Datadog Monitors API documentation specifies metric monitors are created with `"type": "query alert"`, so I corrected that field.
- The Compose example did not expose all runtime settings used by the corrected script. I added `PORTAINER_ENDPOINT_ID`, `DATADOG_SITE`, and `COLLECT_INTERVAL` so the deployment snippet matches the implementation.

## Review Notes
- The Portainer Docker gateway paths used in the post are valid because Portainer exposes `/api/endpoints/<ENVIRONMENT_ID>/docker` as a reverse proxy to the Docker Engine API.
- The Datadog monitor message template `{{container_name.name}}` is valid for a multi-alert monitor grouped by the `container_name` tag.
- The Compose file still uses the top-level `version` field, which current Docker Compose treats as obsolete but still accepts. It is not a functional error, so it was left unchanged.
