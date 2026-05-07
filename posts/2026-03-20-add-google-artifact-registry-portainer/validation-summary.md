# Validation Summary: How to Add Google Artifact Registry to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Google Cloud Artifact Registry
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- Docker
- Portainer HTTP API
- YAML
- `curl`

## Sources Consulted
- Google Cloud, "Configure authentication to Artifact Registry for Docker": https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud, "Repository and image names": https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud, "Access control with IAM": https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud SDK reference, `gcloud iam service-accounts create`: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK reference, `gcloud projects add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK reference, `gcloud iam service-accounts keys create`: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK reference, `gcloud auth print-access-token`: https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token
- Google Cloud, "Transition from Container Registry": https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Portainer documentation, "Add a custom registry": https://docs.portainer.io/admin/registries/add/custom
- Portainer API documentation, CE 2.39.2 `registries.yaml`: https://api-docs.portainer.io/versions/ce/2.39.2/registries.yaml

## Issues Found
- The overview described GAR image names with `<region>-docker.pkg.dev`. I changed this to `<location>-docker.pkg.dev` because Google documents Artifact Registry Docker hosts by repository location, which can be regional or multi-regional.
- The overview said Artifact Registry authentication requires a GCP service account. I corrected this because Google documents multiple auth methods, including short-lived OAuth access tokens; the post now correctly frames a service account JSON key as the practical persistent option for Portainer.
- The "Getting the Registry Password" example incorrectly described `gcloud auth print-access-token` output as a base64-encoded token. I changed this to a short-lived OAuth access token example and kept the JSON key file example for `_json_key` authentication.
- The Portainer navigation path was outdated. I changed `Settings > Registries` to `Registries` to match current Portainer documentation for adding a custom registry.
- The registry URL note said to adjust the "region" as needed. I changed that to "location" to match Artifact Registry naming.
- The Docker login example used a shorthand registry host. I updated it to the current Google-documented `https://LOCATION-docker.pkg.dev` login form.
- The short-lived token automation example was incomplete for Portainer's documented registry update API. I changed it to use the documented `PUT /api/registries/{id}` endpoint with the required registry payload fields (`Name`, `URL`, and `Authentication`) in addition to `Username` and `Password`, and I removed the hardcoded unsecured `http://localhost:9000` example in favor of a generic `PORTAINER_URL`.
- The conclusion implied the `_json_key` method is the stable long-term default in general. I narrowed that claim so it now applies specifically to Portainer's need for stored credentials.

## Review Notes
- Google recommends access tokens or credential helpers over service account keys when possible because service account keys are long-lived secrets.
- Google documents OAuth access tokens for Artifact Registry as valid for 60 minutes, so any Portainer API automation using `oauth2accesstoken` must refresh the saved registry credentials before expiry.
