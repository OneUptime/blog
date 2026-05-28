# Validation Summary: How to Configure Minimum Instances on Cloud Run to Eliminate Cold Starts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Cloud Run service YAML
- Cloud Monitoring metrics
- Docker containers
- Python lazy initialization example

## Sources Consulted
- Google Cloud Run minimum instances documentation: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Cloud Run CPU limits and startup CPU boost documentation: https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run YAML reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1
- Google Cloud Run concurrency documentation: https://docs.cloud.google.com/run/docs/about-concurrency
- Google Cloud Monitoring metric descriptors for Cloud Run: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK reference for `gcloud run services update`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update

## Issues Found
- The billing section incorrectly stated that idle minimum instances under request-based billing are billed for memory only. Current Cloud Run pricing bills idle minimum instances for CPU at a lower idle rate and for memory. Updated the explanation and recalculated the idle cost for a 1 vCPU, 512 MiB minimum instance from `$0.0045/hour` to `$0.0135/hour`, and the monthly estimate from about `$3.24/month` to about `$10/month` before free tier, request charges, regional variations, and discounts.
- The startup CPU boost section said the feature doubles CPU allocation during startup. Current Cloud Run documentation shows the boost varies by configured CPU limit. Updated the wording to say it increases CPU allocation based on the configured CPU limit.

## Review Notes
The Cloud Run CLI flags, YAML fields, Docker examples, concurrency discussion, and Cloud Monitoring metric names were otherwise consistent with current official documentation. Google currently recommends service-level minimum instances for many cases, while the post's `--min-instances` and `autoscaling.knative.dev/minScale` examples configure revision-level minimum instances; these examples remain valid.
