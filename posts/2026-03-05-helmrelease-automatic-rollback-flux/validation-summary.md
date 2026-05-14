# Validation Summary: How to Configure HelmRelease Automatic Rollback on Failure in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux Notification Controller
- Kubernetes Custom Resources
- Helm
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Notification Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The remediation explanation said rollback happens only after all retries are exhausted. Flux remediates failed installs/upgrades between retry attempts, and `remediateLastFailure` controls whether the final failed attempt is also remediated. Updated the explanation to match the Helm API reference.
- The rollback flow diagram showed retry attempts happening without rollback remediation between attempts. Updated the retry path to show rollback before the next upgrade attempt.
- The install remediation explanation implied the next install attempt only happens on the next reconciliation. Flux uninstalls between retry attempts while retries remain, then bails after retries are exhausted. Updated the install behavior description.
- The upgrade remediation explanation implied `remediateLastFailure: true` alone always means rollback. Flux uses the configured upgrade remediation strategy, which defaults to rollback. Updated the wording to include that default.
- The notification examples used `apiVersion: notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation exposes `Provider` and `Alert` under `notification.toolkit.fluxcd.io/v1beta3`; `v1` is for `Receiver`. Updated both manifests to `v1beta3`.
- The test command used `flux get helmrelease my-application -n production`, but the documented Flux CLI command is `flux get helmreleases`. Updated the command to `flux get helmreleases -n production`.

## Review Notes
The HelmRelease examples use current `helm.toolkit.fluxcd.io/v2` fields, including `install.remediation`, `upgrade.remediation`, `cleanupOnFail`, and `driftDetection.mode: enabled`. The Slack provider example assumes a Secret containing the webhook address, which is supported for the legacy incoming webhook path; for Slack bot tokens, Flux recommends setting `address: https://slack.com/api/chat.postMessage` and storing the token under the `token` key.
