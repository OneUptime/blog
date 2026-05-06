# Validation Summary: How to Configure GCR/Artifact Registry Access over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Artifact Registry
- `gcr.io` repositories in Artifact Registry
- Google Cloud CLI (`gcloud`)
- Docker
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- IPv6 and dual-stack networking
- DNS and network troubleshooting tools

## Sources Consulted
- Google Cloud: Configure Docker authentication to Artifact Registry - https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud: Transition from Container Registry - https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud: Integrate Google Kubernetes Engine with Artifact Registry - https://cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud: Configure alias IP ranges and dual-stack networking in GKE - https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Google Cloud: Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud SDK reference: `gcloud auth activate-service-account` - https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account
- Google Cloud SDK reference: `gcloud artifacts docker images list` - https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- Google Cloud SDK installation guide - https://cloud.google.com/sdk/docs/install

## Issues Found
- The description and introduction treated Container Registry/GCR as an active service. I corrected this to reflect the March 18, 2025 Container Registry shutdown and clarified that `gcr.io` hostnames remain valid when they are backed by Artifact Registry `gcr.io` repositories.
- The Google Cloud CLI install snippet used the old `curl https://sdk.cloud.google.com | bash` bootstrap flow. I replaced it with the official installation guide reference because the current docs no longer present that as the canonical install path.
- Several Artifact Registry authentication and pull examples hard-coded `us-docker.pkg.dev`. I changed those to `LOCATION-docker.pkg.dev` so the commands match the documented hostname format for regional and multi-regional repositories.
- The GKE dual-stack example used incorrect or undocumented flags, including `--cluster-ipv6-cidr`, `--services-ipv6-cidr`, and `--stack-type="IPV4_IPV6"`, and it targeted the auto-mode `default` VPC. I replaced it with the current documented dual-stack Standard cluster command using `--stack-type=ipv4-ipv6`, `--ipv6-access-type`, a custom-mode VPC, and `--create-subnetwork`.
- The Workload Identity section was incomplete and slightly misleading. It omitted the required `roles/iam.workloadIdentityUser` binding and implied that Workload Identity controls image pulls. I updated it to enable Workload Identity Federation for GKE, add the impersonation binding, and clarify that GKE image pulls use the node service account while pod API access can use Workload Identity.
- The external host example used `gcloud auth activate-service-account` without an explicit service account identifier. I made the command explicit with `SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com` to match the documented syntax.

## Review Notes
- IPv6 reachability for `us-docker.pkg.dev`, `gcr.io`, `us.gcr.io`, and `eu.gcr.io` was also confirmed during review with live `AAAA` lookups and IPv6 HTTP requests on 2026-05-06.
- The title and tags still use the legacy term `GCR`. The body now makes the current Artifact Registry-backed `gcr.io` model explicit, so the post is technically accurate as written.
- The external-host example uses a service account key, which is still technically valid, but Google generally recommends keyless or short-lived authentication where possible.
