# Validation Summary: How to Deploy a Next.js Application to Cloud Run with Server-Side Rendering

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Next.js
- React server-side rendering
- Node.js
- Docker
- Google Cloud Run
- Google Cloud Artifact Registry
- Google Cloud Build
- Google Secret Manager
- Google Cloud SDK (`gcloud`)

## Sources Consulted
- Next.js `output: "standalone"` documentation: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output
- Next.js environment variables guide: https://nextjs.org/docs/pages/guides/environment-variables
- Next.js Image Component configuration: https://nextjs.org/docs/app/api-reference/components/image
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run container port configuration: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Cloud Run billing settings / CPU allocation: https://docs.cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud run services update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Cloud Run secrets configuration: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud SDK `gcloud secrets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud SDK `gcloud run domain-mappings create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/domain-mappings/create
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/building/context/

## Issues Found
- The post said Cloud Run handles HTTPS and custom domains "out of the box." Cloud Run provides HTTPS for the default `run.app` URL, but current custom-domain setup requires a mapping, Firebase Hosting, or a load balancer. Updated the wording to say Cloud Run supports custom domains.
- The cold-start reduction command used `--cpu-always-allocated`, which is not the current Cloud Run CLI flag. Updated it to `--no-cpu-throttling`, which sets instance-based billing / CPU allocated for the full instance lifecycle.
- The custom-domain command used `gcloud run domain-mappings create`. Google Cloud documentation says fully managed Cloud Run domain mappings use `gcloud beta run domain-mappings create`, and the feature is currently preview / limited availability and not recommended for production services. Updated the command and wording, and removed the overly specific CNAME-only instruction because Cloud Run returns the required DNS records.

## Review Notes
- The Dockerfile, standalone Next.js setup, Cloud Run port usage, Secret Manager example, public environment variable caveat, and Cloud Build deployment flow are technically sound for a typical npm-based Next.js app with a lockfile.
- The local workspace does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference pages rather than local `--help` output.
