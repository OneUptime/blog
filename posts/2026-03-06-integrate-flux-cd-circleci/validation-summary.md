# Validation Summary: How to Integrate Flux CD with CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller and image-automation-controller
- Flux notification-controller
- CircleCI
- CircleCI AWS ECR orb
- Docker container images
- Kubernetes Deployments
- GitOps

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI docs for `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux CLI docs for `flux reconcile image update`: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Flux CLI docs for `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- CircleCI configuration reference: https://circleci.com/docs/reference/configuration-reference/
- CircleCI AWS deployment guide: https://circleci.com/docs/guides/deploy/deploy-to-aws/
- CircleCI AWS ECR orb tutorial: https://circleci.com/blog/orbs-aws-ecr/

## Issues Found
- The initial CircleCI build used short Git SHA image tags, but the Flux `ImagePolicy` used a semver policy. Flux semver policies select semver-compatible tags, so short SHA tags would not match the documented policy. Changed the main CircleCI example to tag images as `1.0.${CIRCLE_BUILD_NUM}` so it is compatible with the Flux semver policy.
- The AWS ECR orb example used an older orb version, omitted the AWS CLI auth setup used by current CircleCI examples, and used `extra-build-args`. Updated the example to include `circleci/aws-cli@5.1.2`, use `circleci/aws-ecr@9.6.0`, pass `auth: - aws-cli/setup`, use a semver-compatible tag, and use `extra_build_args`.
- The Flux notification manifests used `notification.toolkit.fluxcd.io/v1`, but current Flux notification `Provider` and `Alert` examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests to `v1beta3`.
- The Slack provider example used a webhook-style secret name with a `channel` field. Current Flux docs show Slack incoming webhook providers using a Secret with an `address` key and no Provider `channel`, while Bot API providers set `address: https://slack.com/api/chat.postMessage` and use a token. Removed `channel` so the snippet matches the webhook-secret pattern.
- The heading "Set Up Flux Notifications for CircleCI" described Slack notifications, not notifications sent to CircleCI. Renamed the heading to "Set Up Flux Notifications" to match the manifest.

## Review Notes
- The local environment did not have the `flux` CLI installed, so CLI command validation was performed against the official Flux CLI documentation instead of local `--help` output.
- The semver examples assume the image automation controllers were installed with Flux, which the post lists as a prerequisite.
