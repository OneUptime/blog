# Validation Summary: How to Automate Docker Registry Cleanup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Registry / CNCF Distribution
- Docker Registry HTTP API V2
- Bash scripting
- Docker CLI
- AWS ECR lifecycle policies and AWS CLI
- Google Artifact Registry and gcloud CLI
- gcr-cleaner
- Harbor registry API, garbage collection, and retention policies
- Cron

## Sources Consulted
- CNCF Distribution garbage collection docs: https://distribution.github.io/distribution/about/garbage-collection/
- CNCF Distribution Registry HTTP API V2: https://distribution.github.io/distribution/spec/api/
- CNCF Distribution registry configuration docs: https://distribution.github.io/distribution/about/configuration/
- Local `registry:3` Docker image metadata and `garbage-collect --help`
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- AWS CLI `ecr put-lifecycle-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-lifecycle-policy.html
- Google Artifact Registry image management docs: https://docs.cloud.google.com/artifact-registry/docs/docker/manage-images
- GoogleCloudPlatform gcr-cleaner project: https://github.com/GoogleCloudPlatform/gcr-cleaner
- Harbor garbage collection docs: https://goharbor.io/docs/2.4.0/administration/garbage-collection/
- Harbor OpenAPI schema: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml

## Issues Found
- The self-hosted registry section did not mention that manifest deletion must be enabled with `delete.enabled: true`. Added this requirement because CNCF Distribution disables delete support by default.
- The script that fetches a config blob used `curl` without following redirects. Added `-L` because the Registry API can redirect blob downloads.
- The "Keeping Only N Latest Tags" script used `sort -V`, which keeps the highest version-like tags, not the most recently pushed tags. Updated the script comments and output text to describe the actual behavior.
- The garbage collection comment said `--delete-untagged` removes blobs not referenced by any manifest. Corrected it to say the flag deletes manifests not referenced by any tag; garbage collection then removes unreferenced blobs.
- The garbage collection command examples had flags after the config path. Reordered them to match the documented CNCF Distribution synopsis.
- The read-only garbage collection script edited config in place and sent `SIGHUP`, but Distribution docs say the registry should be restarted with read-only mode enabled, or stopped, before garbage collection. Replaced that example with a stop, garbage-collect, and start flow.
- The stopped-container garbage collection example invoked `bin/registry` through `docker run`, which conflicts with the current official image entrypoint. Updated it to call `garbage-collect` directly with the current default config path for `registry:3`.
- The Google Artifact Registry comment claimed the command deletes images older than 30 days, but the command only lists image versions and tags. Updated the comment to match the command.
- The gcr-cleaner Docker image path was outdated. Replaced it with the current Artifact Registry image path.

## Review Notes
- The self-hosted registry scripts do not handle catalog or tag pagination, authentication, multi-architecture manifest lists, or non-GNU `date`. They are still plausible examples for a basic Linux-hosted registry, but production automation should account for those cases.
- The `registry:3` garbage collection example assumes the registry uses the official image defaults and has its storage mounted as a Docker volume. Custom deployments should pass the actual mounted config path and storage volume.
- Google Artifact Registry now supports native cleanup policies; gcr-cleaner remains a useful third-party tool but is not an official Google product.
