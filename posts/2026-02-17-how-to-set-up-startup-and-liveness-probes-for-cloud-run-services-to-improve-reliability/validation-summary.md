# Validation Summary: Set Up Startup and Liveness Probes for Cloud Run Services to Improve Reliability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run startup probes
- Cloud Run liveness probes
- Google Cloud CLI
- Cloud Run service YAML
- HTTP, TCP, and gRPC health checks
- Python Flask health check endpoints
- PostgreSQL connectivity with psycopg2
- Redis connectivity with redis-py
- Cloud Logging

## Sources Consulted
- Google Cloud Run documentation: Configure container health checks for services: https://cloud.google.com/run/docs/configuring/healthchecks
- Google Cloud SDK reference: gcloud run deploy: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run Admin API reference: Container and Probe fields: https://cloud.google.com/run/docs/reference/rest/v1/Container#Probe
- gRPC Health Checking Protocol: https://github.com/grpc/grpc/blob/master/doc/health-checking.md

## Issues Found
- The `gcloud run deploy` example used non-existent individual probe flags such as `--startup-probe-path` and `--liveness-probe-timeout`. Updated it to the documented `--startup-probe` and `--liveness-probe` comma-separated key-value syntax.
- The post said Cloud Run supports three probe types without distinguishing startup and liveness support. Updated it to state that startup probes support HTTP, TCP, and gRPC, while liveness probes support HTTP and gRPC.
- The HTTP probe description said only 200-299 responses count as healthy. Updated it to 2xx or 3xx responses, matching Cloud Run documentation.
- The TCP probe subsection implied TCP probes apply generally. Updated it to "TCP startup probes" because Cloud Run liveness probes do not support TCP.
- The Python Flask snippet referenced `DATABASE_URL` and `REDIS_URL` without defining them. Added `os.environ` assignments so the example is self-contained about where those values come from.

## Review Notes
The post is technically relevant and current after the fixes. `gcloud` was not installed in the local environment, so CLI validation was performed against the current official Google Cloud SDK reference instead of local `--help` output.
