# Validation Summary: How to Configure Automation Rules in Cloud Deploy for Automatic Promotions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Cloud Deploy automation rules
- Google Cloud CLI
- IAM service accounts and roles
- YAML configuration
- CI/CD promotion and canary rollout workflows

## Sources Consulted
- Google Cloud Deploy automation overview: https://docs.cloud.google.com/deploy/docs/automation
- Google Cloud Deploy automation rules: https://docs.cloud.google.com/deploy/docs/automation-rules
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy Automation REST resource: https://docs.cloud.google.com/deploy/docs/api/reference/rest/v1/projects.locations.deliveryPipelines.automations
- Google Cloud Deploy TargetAttribute REST type: https://docs.cloud.google.com/deploy/docs/api/reference/rest/v1/TargetAttribute
- Google Cloud Deploy IAM roles and permissions: https://docs.cloud.google.com/deploy/docs/iam-roles-permissions
- Google Cloud CLI deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy
- Google Cloud CLI automations reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/automations
- Google Cloud CLI automation-runs reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/automation-runs

## Issues Found
- The post claimed Cloud Deploy automation rules can automatically approve pending rollouts. Current Cloud Deploy built-in automation rules are timed promotion, promotion after successful rollout, rollout phase advancement, and rollout repair. I changed the approval references to rollout repair or canary advancement.
- The Automation YAML examples used `selector` as a list. Cloud Deploy expects `selector.targets`. I corrected each snippet.
- The Automation YAML examples used a top-level `deliveryPipeline` field. Current Cloud Deploy automation config identifies the parent delivery pipeline through the automation resource name, such as `my-app-pipeline/auto-promote-dev-to-staging`. I removed `deliveryPipeline` and updated `metadata.name` values.
- The promotion rule examples used `name` and `toTargetId`. Current Cloud Deploy uses `id` and `destinationTargetId`. I corrected the snippets.
- The advance rollout rule examples used `name`. Current Cloud Deploy uses `id`. I corrected the snippets.
- The suspend/resume example used `gcloud deploy automations update --suspended`, but the GA gcloud automations group does not expose an `update` command. I changed the example to edit `suspended` in YAML and run `gcloud deploy apply`, matching the official workflow.
- The `@next` explanation said it avoided updates if targets are renamed. `@next` avoids hard-coding the destination target, but the source selector still depends on the selected target. I narrowed the wording.
- The IAM command comment said `roles/clouddeploy.operator` was for creating rollouts. I changed the comment to reflect that it manages deployment resources; `roles/clouddeploy.releaser` covers release and rollout creation.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI verification was done against the official Google Cloud SDK reference pages rather than local `gcloud --help` output.
