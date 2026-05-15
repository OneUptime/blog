# Validation Summary: How to Bootstrap Flux CD with Google Cloud Source Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Google Kubernetes Engine (GKE)
- Google Cloud Source Repositories
- Google Cloud CLI (`gcloud`)
- SSH authentication
- Kustomize

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `flux create secret git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux Google Cloud Source bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/google-cloud-source/
- Flux Google Cloud Platform integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Google Cloud Source Repositories authentication documentation: https://docs.cloud.google.com/source-repositories/docs/authentication
- Google Cloud Source Repositories cloning documentation: https://docs.cloud.google.com/source-repositories/docs/cloning-repositories
- Google Cloud SDK `gcloud source repos create` documentation: https://cloud.google.com/sdk/gcloud/reference/source/repos/create
- Google Cloud Source Repositories pricing / availability notice: https://cloud.google.com/source-repositories/pricing

## Issues Found
- Clarified the SSH host key scan step. The post scanned `source.developers.google.com` into `known_hosts_gcp.txt`, but the file was not used by the later Flux command. Flux's `flux create secret git` command automatically gathers the SSH host key and stores it in the generated Kubernetes Secret, so the text now describes the `ssh-keyscan` command as an optional verification step.

## Review Notes
- Cloud Source Repositories is unavailable to new customers as of June 17, 2024, and the post correctly limits the guide to existing CSR users.
- Flux has an official `flux bootstrap git` flow for Google Cloud Source Repositories. The manual `flux install`, `GitRepository`, and `Kustomization` setup shown in the post is still technically valid, but the official bootstrap command would be a simpler option for many future revisions.
