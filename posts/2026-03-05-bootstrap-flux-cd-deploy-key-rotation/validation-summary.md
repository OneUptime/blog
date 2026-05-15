# Validation Summary: How to Bootstrap Flux CD with Deploy Key Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets, RBAC, Deployments, and CronJobs
- GitHub deploy keys and REST API
- GitHub CLI
- SSH key generation and host key scanning

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux deploy key rotation: https://fluxcd.io/flux/installation/configuration/deploy-key-rotation/
- Flux `bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitRepository SSH authentication docs: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Alert docs: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- GitHub REST API deploy keys documentation: https://docs.github.com/en/rest/deploy-keys/deploy-keys
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- GitHub CLI `gh repo deploy-key` help output from the local CLI

## Issues Found
- The `flux bootstrap github` examples used `--personal` while the placeholder owner was `your-org`. Flux documents `--personal` for GitHub user-owned repositories; organization-owned examples omit it. Removed `--personal` from those examples.
- The manual GitHub deploy key step said it used the API, but the example used `gh repo deploy-key add`. Changed the wording to GitHub CLI.
- The cleanup command was described as securely removing local key files, but `rm -f` only unlinks files and does not securely wipe storage. Changed the wording to "Remove the local key files."
- The Flux Alert manifest used `notification.toolkit.fluxcd.io/v1` for an Alert. Current Flux documentation shows Alert under `notification.toolkit.fluxcd.io/v1beta3`, while `v1` is currently documented for Receiver. Updated the Alert example to `v1beta3`.
- The monitoring section implied the Flux Alert would report CronJob key rotation failures directly. The shown Alert watches GitRepository events, so the text now says it monitors Flux reconciliation after key rotation.

## Review Notes
- The key rotation flow aligns with Flux documentation: the `flux-system` Secret is not overwritten by repeated bootstrap, so deleting it before re-running bootstrap is the documented rotation path.
- The post correctly notes that GitHub deploy keys created by Flux default to read-only and need `--read-write-key=true` for image automation write-back use cases.
- The automated CronJob is a reasonable illustrative pattern, but production implementations should also monitor the Kubernetes CronJob/Job itself and handle old deploy key cleanup explicitly.
