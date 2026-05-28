# Validation Summary: How to Create a Release in Cloud Deploy and Promote It Through Pipeline Stages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Google Cloud CLI
- Skaffold
- Kubernetes manifests
- Google Cloud Build
- Artifact Registry

## Sources Consulted
- Google Cloud SDK reference for `gcloud deploy releases create`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK reference for `gcloud deploy releases promote`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/promote
- Google Cloud SDK reference for `gcloud deploy releases describe`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/releases/describe
- Google Cloud SDK reference for `gcloud deploy rollouts list`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Google Cloud SDK reference for `gcloud deploy targets rollback`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/targets/rollback
- Cloud Deploy guide: Promote your release and manage approvals: https://docs.cloud.google.com/deploy/docs/promote-release
- Cloud Deploy guide: Roll back a target: https://docs.cloud.google.com/deploy/docs/roll-back
- Cloud Deploy guide: Use Skaffold with Cloud Deploy: https://docs.cloud.google.com/deploy/docs/using-skaffold
- Cloud Deploy guide: Manage manifests in Cloud Deploy: https://docs.cloud.google.com/deploy/docs/using-skaffold/managing-manifests
- Cloud Deploy overview: https://docs.cloud.google.com/deploy/docs/overview

## Issues Found
- The Kubernetes manifest used the full Artifact Registry image path while the `--images` flag mapped the placeholder name `my-web-app`. Cloud Deploy/Skaffold image substitution expects the manifest image placeholder to match the `--images` key, so the manifest image was changed to `my-web-app`.
- The text said the same artifacts tested in staging are deployed to production. This was tightened to say the same release is promoted, because Cloud Deploy can render target-specific manifests from the release.
- The rollout-status explanation described rendering as a rollout phase. Cloud Deploy renders manifests during release creation; the rollout deploys the rendered manifests. The wording was corrected.
- The rollback section said Cloud Deploy does not have a traditional rollback button and recommended creating a new release pointing to the old image. Cloud Deploy supports target rollback through `gcloud deploy targets rollback` and the console. The section and command example were updated to the official rollback flow.

## Review Notes
The remaining Cloud Deploy release creation, promotion, approval, listing, labeling, annotation, Skaffold, Kubernetes, and Cloud Build examples are consistent with the official documentation reviewed on 2026-05-28. The local environment did not have `gcloud` installed, so CLI validation was performed against the current official Google Cloud SDK reference instead of local `--help` output.
