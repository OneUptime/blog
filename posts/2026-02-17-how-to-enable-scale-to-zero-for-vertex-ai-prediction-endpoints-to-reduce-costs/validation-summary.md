# Validation Summary: How to Enable Scale-to-Zero for Vertex AI Prediction Endpoints to Reduce Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Prediction endpoints
- Vertex AI scale-to-zero
- Google Cloud CLI (`gcloud`)
- Vertex AI Python SDK
- Cloud Scheduler
- Cloud Monitoring

## Sources Consulted
- Vertex AI autoscaling and Scale To Zero documentation: https://docs.cloud.google.com/vertex-ai/docs/predictions/autoscaling
- `gcloud ai endpoints deploy-model` reference: https://docs.cloud.google.com/sdk/gcloud/reference/ai/endpoints/deploy-model
- `gcloud beta ai endpoints deploy-model` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/ai/endpoints/deploy-model
- Vertex AI Python SDK `Model.deploy` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Cloud Scheduler `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Vertex AI monitoring metrics documentation: https://docs.cloud.google.com/vertex-ai/docs/general/monitoring-metrics

## Issues Found
- The post said the first request after a scale-to-zero event starts a replica and is served. Official Vertex AI documentation says the triggering request receives a 429 response, is dropped, and sends the scale-up signal. Updated the explanation and cold-start sequence to require client retry handling.
- The gcloud example used the stable `gcloud ai endpoints deploy-model` form while discussing configurable scale-to-zero periods. Official scale-to-zero documentation uses `gcloud beta ai endpoints deploy-model` for `--min-scaleup-period` and `--idle-scaledown-period`. Updated the command accordingly.
- The Cloud Scheduler example used `--body`, but the current `gcloud scheduler jobs create http` reference uses `--message-body` or `--message-body-from-file`. Updated the command to `--message-body`.
- The traffic-splitting section recommended a scale-to-zero deployment alongside another deployment on the same endpoint. Official Vertex AI documentation states scale-to-zero is only compatible with single-model deployments and one model per endpoint. Updated the guidance and example to use separate endpoints.

## Review Notes
- The Python SDK was not installed locally, so Python examples were checked against official SDK reference documentation rather than executed.
- The `gcloud` CLI was not installed locally, so CLI examples were checked against official Google Cloud CLI reference documentation rather than local `--help` output.
