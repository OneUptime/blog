# Validation Summary: How to Configure Git Webhook for GitHub in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitHub webhooks
- GitHub CLI
- Kubernetes Secrets, ConfigMaps, and Ingress
- ingress-nginx annotations
- OpenSSL HMAC signing

## Sources Consulted
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD FAQ on reconciliation polling: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD webhook handler source: https://github.com/argoproj/argo-cd/blob/master/util/webhook/webhook.go
- Argo CD webhook SCM parser source: https://github.com/argoproj/argo-cd/blob/master/util/webhook/scm.go
- GitHub REST API for repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- GitHub REST API for organization webhooks: https://docs.github.com/en/rest/orgs/webhooks
- GitHub webhook signature validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub IP address documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The OpenSSL command comment said it generated a 32-character hex secret, but `openssl rand -hex 32` outputs 32 bytes as 64 hex characters. Updated the comment.
- The declarative Secret example implied a partial Secret manifest by itself would preserve existing keys. Clarified that the key should be added to the existing `argocd-secret` rather than replacing the whole Secret.
- The `gh api` examples used `-f active=true`, which sends a string. GitHub's API expects `active` as a boolean, and the GitHub CLI documents `-F` for typed boolean conversion. Changed those flags to `-F active=true`.
- The sample Argo CD log line included fields that do not match current Argo CD webhook handler logging. Updated it to match the current log format.
- The GitHub Enterprise custom CA note implied the CA was needed for incoming webhook delivery. Clarified that it applies when Argo CD connects to GitHub Enterprise with a custom CA.
- The ingress allowlist example used an incomplete hard-coded set of GitHub hook ranges. Updated it to the current GitHub Meta API `hooks` output and added a comment to verify the CIDRs regularly.
- The webhook reachability check said `curl -I` should return 405. Current Argo CD can return 400 for missing webhook headers, while the important diagnostic is that it is not 404. Updated the guidance.
- The troubleshooting section labeled secret mismatch as `403 Forbidden`. Current Argo CD returns a bad-request style webhook processing failure for GitHub HMAC mismatch, so the heading was changed to `400 Bad Request`.
- The repository URL troubleshooting note said GitHub sends `clone_url` and that exact `.git` matching is required. Current Argo CD uses the GitHub `html_url` from the payload and matches common URL forms with an optional `.git` suffix. Updated the note.

## Review Notes
The core setup is technically sound: Argo CD documents `/api/webhook`, GitHub requires `application/json` for Argo CD's webhook library, `webhook.github.secret` is the correct key, and `timeout.reconciliation` is the documented setting for reducing polling frequency when webhooks are reliable. GitHub notes that IP allowlists require ongoing monitoring because GitHub IP ranges change.
