# Validation Summary: How to Configure Flux Notification Provider for Bitbucket Commit Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Kubernetes custom resources
- Kubernetes Secrets
- Bitbucket Cloud commit build statuses
- Bitbucket Server/Data Center commit build statuses
- Flux CLI

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux `reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Bitbucket Cloud commit statuses REST API documentation: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-commit-statuses/
- Bitbucket Server/Data Center build status REST API documentation: https://docs.atlassian.com/bitbucket-server/rest/7.14.0/bitbucket-build-rest.html

## Issues Found
- The post used `notification.toolkit.fluxcd.io/v1` for Alert and Provider examples. Current Flux documentation exposes Alert and Provider in `notification.toolkit.fluxcd.io/v1beta3`; the current `v1` reference is for Receiver. Updated all Alert and Provider manifests to `v1beta3`.
- The Bitbucket Cloud examples used `type: bitbucketserver`. Flux distinguishes Bitbucket Cloud (`bitbucket`) from Bitbucket Server/Data Center (`bitbucketserver`). Updated Cloud examples to `type: bitbucket`.
- The app password permission guidance listed repository read and pull request read/write permissions. Flux documentation requires Bitbucket Cloud app passwords to have repository read/write permission for commit status updates. Updated the prerequisite and troubleshooting text.
- The Alert example included `HelmRelease` event sources. Flux's git commit status documentation states commit status updates are posted from Flux `Kustomization` events. Removed `HelmRelease` from the commit status Alert example.
- The Bitbucket Server/Data Center example used a repository browser-style URL. Flux documentation requires the repository HTTPS clone URL for the `bitbucketserver` provider. Updated the example address to an HTTPS clone URL format.
- The flow diagram referenced the Helm controller for commit status events. Updated it to refer to the Kustomize controller.

## Review Notes
The Flux CLI reconciliation command and Bitbucket build status state names were consistent with the official documentation. The pull request branch restriction wording is directionally correct, but teams should confirm the exact available merge checks in their Bitbucket plan and workspace settings.
