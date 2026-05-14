# Validation Summary: How to Configure Flux CD with Google Cloud Source Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD GitRepository and Receiver resources
- Flux CLI bootstrap for generic Git servers and Google Cloud Source
- Google Cloud Source Repositories
- Google Cloud CLI
- Kubernetes Secrets
- GKE Workload Identity
- Cloud Pub/Sub notifications
- Cloud Functions for Python
- Kustomize
- SSH and HTTPS Git authentication

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux bootstrap for Google Cloud Source: https://fluxcd.io/flux/installation/bootstrap/google-cloud-source/
- Flux generic Git bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Google Cloud Source Repositories documentation: https://cloud.google.com/source-repositories/docs
- Google Cloud Source Repositories authentication documentation: https://cloud.google.com/source-repositories/docs/authentication
- Google Cloud Source Repositories cloning documentation: https://cloud.google.com/source-repositories/docs/cloning-repositories
- Google Cloud Source Repositories Pub/Sub notifications documentation: https://cloud.google.com/source-repositories/docs/pubsub-notifications
- Google Cloud Source Repositories notification configuration documentation: https://cloud.google.com/source-repositories/docs/configuring-notifications
- gcloud source repos create reference: https://cloud.google.com/sdk/gcloud/reference/source/repos/create
- gcloud source repos update reference: https://cloud.google.com/sdk/gcloud/reference/source/repos/update

## Issues Found
- Cloud Source Repositories is no longer available to new customers as of June 17, 2024. Added that caveat to the introduction and prerequisites.
- SSH URLs were missing the Google account username required by Cloud Source Repositories. Updated SSH examples to include `USER_EMAIL@source.developers.google.com:2022`.
- The SSH `known_hosts` command scanned the default SSH port instead of CSR's port 2022. Updated it to use `ssh-keyscan -p 2022`.
- The repository initialization pushed `master` without ensuring the local branch was named `master`. Added `git checkout -B master` before the first commit.
- HTTPS authentication incorrectly used a service account JSON key as a basic-auth password. Replaced it with Cloud Source Repositories manually generated HTTPS credentials.
- Workload Identity was presented as a keyless Git authentication method for CSR. Replaced that section with a limitation note because Flux GitRepository does not support GCP Workload Identity for CSR Git authentication.
- Flux bootstrap examples inherited the invalid SSH and HTTPS credentials. Updated them to use the corrected SSH URL and generated HTTPS username/password.
- The SSH key cleanup command deleted the private key before the later bootstrap example reused it. Changed cleanup to an explicit post-bootstrap step.
- Multi-repository and mirrored repository SSH examples also omitted the CSR username. Updated those URLs.
- The Pub/Sub webhook section created a topic but did not associate the CSR repository with the topic or grant publish permission. Added the service account, Pub/Sub publisher grant, and `gcloud source repos update --add-topic` command.
- The Cloud Function example used external dependencies but did not create `requirements.txt`. Added `functions-framework` and `requests` dependencies.
- The Flux receiver webhook URL already includes the generated token in the path, so the Cloud Function should call that URL directly. Removed the extra query-token handling.
- The mirroring CLI command used unsupported `gcloud source repos create --mirror-config-*` flags. Replaced it with the documented Cloud Console mirroring flow.
- Troubleshooting steps referenced the removed service account reader role and omitted the SSH username. Updated those checks.

## Review Notes
- The post is valid for existing Cloud Source Repositories customers only. New Google Cloud customers should use another Git host or Google Cloud Secure Source Manager instead.
- The HTTPS option depends on manually generated CSR credentials from the Google Cloud console. SSH remains the more fully documented Flux bootstrap path for Google Cloud Source.
