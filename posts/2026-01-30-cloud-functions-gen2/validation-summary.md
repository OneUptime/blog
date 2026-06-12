# Validation Summary: How to Create Cloud Functions Gen2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions Gen2
- Cloud Run revisions, traffic splitting, concurrency, logging, environment variables, and secrets
- Eventarc triggers for Cloud Storage and Pub/Sub
- Google Cloud CLI (`gcloud`)
- Node.js Functions Framework
- Python Functions Framework
- PostgreSQL connection pooling with `pg`
- Cloud Storage client library for Node.js

## Sources Consulted
- Google Cloud Run functions quotas and limits: https://docs.cloud.google.com/functions/quotas
- Google Cloud Run functions comparison and naming behavior: https://docs.cloud.google.com/run/docs/functions/comparison
- Google Cloud Run maximum concurrent requests documentation: https://docs.cloud.google.com/run/docs/about-concurrency
- Google Cloud Run concurrency configuration documentation: https://docs.cloud.google.com/run/docs/configuring/concurrency
- Google Cloud Run traffic splitting and rollbacks documentation: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud Run Cloud Storage trigger documentation: https://docs.cloud.google.com/run/docs/triggering/storage-triggers
- Google Cloud Run functions writing guide and Functions Framework examples: https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud CLI `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI `gcloud functions logs read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud Logging live tail documentation: https://docs.cloud.google.com/logging/docs/reference/tools/gcloud-logging

## Issues Found
- The Cloud Storage trigger deployment mixed `--trigger-bucket` with `--trigger-event-filters`. The `gcloud functions deploy` trigger flags are mutually exclusive, and Eventarc Storage triggers should filter on both the event type and bucket. Changed the command to use repeated `--trigger-event-filters` flags for `type` and `bucket`.
- The Cloud Storage JavaScript example called `file.contentType.startsWith(...)` without checking whether `contentType` exists. Added a guard so metadata-less objects do not throw.
- The traffic splitting examples used a camelCase Cloud Run service and revision names. Cloud Run service names are lowercase; Cloud Functions names with uppercase characters are converted for the generated Cloud Run service. Changed the traffic examples to use `myfunction` service and revision names.
- The real-time log streaming command used `gcloud beta functions logs read --follow`, but the documented `functions logs read` command does not support `--follow`. Replaced it with `gcloud alpha logging tail` using a Cloud Run revision resource filter.
- The database connection-pooling example required the `pg` package but did not tell readers to install it. Added the install command before the example.
- The Cloud Storage example required `@google-cloud/storage` but did not tell readers to install it. Added the install command before the example.
- The Python high-concurrency deployment did not configure the Functions Framework thread count. Google Cloud documentation recommends setting `THREADS` for Python functions when using higher concurrency, so the deploy command now sets `THREADS=50`.
- The secret-access comment said secrets were "mounted as environment variables," which conflated environment variable injection with volume mounts. Updated the wording to "exposed as environment variables."

## Review Notes
The post remains accurate as a Gen2 / Cloud Run functions guide. Google documentation now brands this product area as Cloud Run functions while continuing to support Cloud Functions Gen2 terminology and `gcloud functions` commands. The examples use supported runtimes (`nodejs20`, `python311`), though future updates could consider Node.js 22 and newer Python runtimes where appropriate.
