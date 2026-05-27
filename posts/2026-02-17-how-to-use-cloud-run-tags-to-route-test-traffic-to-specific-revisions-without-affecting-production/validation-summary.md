# Validation Summary: How to Use Cloud Run Tags to Route Test Traffic to Specific Revisions Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run revisions and traffic tags
- gcloud CLI
- GitHub Actions
- Cloud Build
- Artifact Registry
- Shell commands

## Sources Consulted
- Google Cloud Run documentation: Rollbacks, gradual rollouts, and traffic migration: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud SDK reference: gcloud run deploy: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: gcloud run services update-traffic: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Google Cloud SDK reference: gcloud run revisions list: https://cloud.google.com/sdk/gcloud/reference/run/revisions/list
- Google Cloud SDK reference: gcloud topic formats: https://cloud.google.com/sdk/gcloud/reference/topic/formats
- Google Cloud SDK reference: gcloud topic filters: https://cloud.google.com/sdk/gcloud/reference/topic/filters
- GitHub Actions for Google Cloud auth documentation: https://github.com/google-github-actions/auth
- GitHub Actions for setup-gcloud documentation: https://github.com/google-github-actions/setup-gcloud

## Issues Found
- The post said 100% of traffic goes to the latest revision by default for every deployment. Cloud Run keeps an established traffic split pattern for subsequent deployments after traffic has been split or assigned to a previous revision, so this was clarified.
- The CI/CD snippet used `--format='value(status.traffic[tag=canary].url)'` to extract the tagged URL. This was changed to the documented `--flatten`, `--filter`, and `--format` pattern for repeated fields.
- The cost section said tagged revisions scale to zero when not being tested. This is true with default scaling, but Cloud Run documentation notes that revision-level minimum instances are allocated for tagged revisions. The caveat was added.

## Review Notes
The Cloud Run traffic tag commands, `--tag`, `--no-traffic`, `--set-tags`, `--to-tags`, `--to-revisions`, and `--remove-tags` usage matched current Google Cloud documentation. The examples assume the service allows the relevant callers to invoke both the default and tagged URLs.
