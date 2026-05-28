# Validation Summary: How to Connect to Memorystore Redis from a Cloud Run Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Memorystore for Redis
- Serverless VPC Access connectors
- Direct VPC egress
- Google Cloud CLI (`gcloud`)
- Cloud Build
- Artifact Registry
- Python 3.11
- Flask
- redis-py
- Gunicorn
- Docker
- Secret Manager

## Sources Consulted
- Cloud Run documentation for connecting to a VPC network and comparing Direct VPC egress with Serverless VPC Access connectors: https://docs.cloud.google.com/run/docs/configuring/connecting-vpc
- Cloud Run documentation for Serverless VPC Access connectors and `--vpc-egress`: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Memorystore for Redis documentation for connecting from Cloud Run: https://docs.cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run
- Google Cloud SDK reference for `gcloud compute networks vpc-access connectors create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud SDK reference for `gcloud run deploy`: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference for `gcloud builds submit`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry documentation for Container Registry shutdown and `gcr.io` repositories: https://docs.cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Cloud Run documentation for configuring secrets: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Memorystore for Redis AUTH overview: https://cloud.google.com/memorystore/docs/redis/about-redis-auth
- redis-py documentation for connection pools and production usage: https://github.com/redis/redis-py and https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- Flask API documentation for `Request.get_json`: https://flask.palletsprojects.com/

## Issues Found
- The post said Cloud Run needs a Serverless VPC Access connector to reach Memorystore Redis. Current Google Cloud documentation recommends Direct VPC egress for Cloud Run to Memorystore, while Serverless VPC Access connectors remain supported. Updated the wording to say VPC egress is required and that the connector approach is the supported option shown in the post.
- The prerequisites said a subnet with available IP space was required. The shown connector command uses an automatically managed connector subnet from a non-overlapping `/28` range, while a subnet is an alternative. Updated the prerequisite wording.
- The Redis AUTH command was presented as a general connection detail step. AUTH is optional for Memorystore for Redis, so the command should only be run when AUTH is enabled. Updated the command comment.
- The Flask POST handler called `request.get_json()` and then accessed `.get()` without handling a missing or invalid JSON body. Updated it to `request.get_json(silent=True) or {}` so the existing validation returns a 400 instead of raising an exception.
- The build and deploy examples used `gcr.io/my-project/cache-service`. Container Registry is shut down for writes unless `gcr.io` is backed by Artifact Registry, and current Google Cloud examples prefer Artifact Registry `pkg.dev` image paths. Updated the examples to use a regional Artifact Registry image URI.
- The troubleshooting section suggested scaling up `max-instances` on an existing VPC connector. Connector instance bounds are create-time settings in the documented command, so the text now says to recreate the connector with a higher max-instances setting if needed.
- The conclusion said Cloud Run would get the same sub-millisecond Redis performance as any compute resource in the VPC. Current docs state Direct VPC egress offers lower latency and higher throughput than connectors, so that absolute performance claim was softened to "low latency."

## Review Notes
The `gcloud run deploy` flags (`--vpc-connector`, `--vpc-egress=private-ranges-only`, `--set-env-vars`, `--set-secrets`, `--min-instances`, and `--max-instances`), the connector creation flags, the Redis host lookup, the Dockerfile structure, and the redis-py connection pool usage are otherwise consistent with current official documentation. Google recommends pinning Secret Manager environment variables to a numbered version for rotation-sensitive production services; the post's `latest` example is valid but can lead to stale values until a Cloud Run instance restarts.
