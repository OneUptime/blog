# Validation Summary: How to Set Up Automated E2E Tests After Flux Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Notification Controller
- Flux Provider and Alert custom resources
- GitHub Actions
- GitHub repository dispatch events
- Kubernetes Secrets
- Playwright
- Slack GitHub Action

## Sources Consulted
- Flux Notification Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- GitHub REST API documentation for repository dispatch events: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-dispatch-event
- GitHub Actions repository_dispatch event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST API documentation for workflow dispatch events: https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event

## Issues Found
- The original Flux examples used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`, but current Flux documentation defines those resources under `notification.toolkit.fluxcd.io/v1beta3`. Updated all `Provider` and `Alert` snippets accordingly.
- The original GitHub provider used `spec.type: github` and described calling the GitHub Actions `workflow_dispatch` endpoint. Flux's `github` provider updates commit statuses; the provider that emits GitHub dispatch events is `githubdispatch`, and it emits `repository_dispatch` events. Updated the Flux provider and GitHub Actions workflow trigger to use `repository_dispatch`.
- The original workflow expected `workflow_dispatch` inputs. Flux `githubdispatch` sends the Flux event in `client_payload`, so the workflow now reads metadata from `github.event.client_payload`.
- The generic webhook example referenced an HMAC secret while using `type: generic`. Updated it to `type: generic-hmac`, which is the Flux provider type that signs requests with `X-Signature`.
- The original article claimed Flux could use a custom webhook body template to pass deployment metadata to GitHub's workflow dispatch API. Flux generic webhooks send the Flux Event object; metadata should be added through `Alert.spec.eventMetadata`. Replaced the example with an `Alert` metadata example.
- The health-check loop in the GitHub Actions workflow would continue to the test step even if the application never became healthy. Updated it to exit successfully when the health check passes and fail after all retries are exhausted.

## Review Notes
- The rollback example is syntactically valid, but in a production setup it should target the specific fleet commit associated with the failed deployment rather than assuming `HEAD` is always the deployment to revert.
