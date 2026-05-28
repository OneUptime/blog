# Validation Summary: How to Integrate Bitbucket Cloud Repositories with Google Cloud Build Triggers

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Google Cloud Build
- Google Cloud Build repositories and triggers, 2nd gen
- Google Cloud CLI (`gcloud`)
- Bitbucket Cloud
- Bitbucket Cloud access tokens and webhooks
- Google Secret Manager
- Artifact Registry
- Docker
- Node.js build steps

## Sources Consulted
- Google Cloud CLI reference: `gcloud builds connections create bitbucket-cloud` - https://docs.cloud.google.com/sdk/gcloud/reference/builds/connections/create/bitbucket-cloud
- Google Cloud CLI reference: `gcloud builds repositories create` - https://cloud.google.com/sdk/gcloud/reference/builds/repositories/create
- Google Cloud CLI reference: `gcloud builds triggers create bitbucket-cloud` - https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/bitbucket-cloud
- Google Cloud CLI reference: `gcloud builds triggers create webhook` - https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/webhook
- Cloud Build: Connect to a Bitbucket Cloud host - https://docs.cloud.google.com/build/docs/automating-builds/bitbucket/connect-host-bitbucket-cloud
- Cloud Build: Connect to a Bitbucket Cloud repository - https://docs.cloud.google.com/build/docs/automating-builds/bitbucket/connect-repo-bitbucket-cloud
- Cloud Build: Build repositories from Bitbucket Cloud - https://docs.cloud.google.com/build/docs/automating-builds/bitbucket/build-repos-from-bitbucket-cloud
- Cloud Build: Automate builds in response to webhook events - https://docs.cloud.google.com/build/docs/automate-builds-webhook-events
- Cloud Build: Substituting variable values - https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Build: Payload bindings and bash parameter expansions in substitutions - https://docs.cloud.google.com/build/docs/configuring-builds/use-bash-and-bindings-in-substitutions
- Cloud Build: Build configuration file schema - https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build pricing - https://cloud.google.com/build/pricing
- Atlassian Bitbucket Cloud: Access tokens - https://support.atlassian.com/bitbucket-cloud/docs/access-tokens/
- Atlassian Bitbucket Cloud: Repository-level access token permissions - https://support.atlassian.com/bitbucket-cloud/docs/repository-access-token-permissions/
- Atlassian Bitbucket Cloud: Step options - https://support.atlassian.com/bitbucket-cloud/docs/step-options/
- Atlassian Bitbucket Cloud: Limitations of Bitbucket Pipelines - https://support.atlassian.com/bitbucket-cloud/docs/limitations-of-bitbucket-pipelines/

## Issues Found
- The Bitbucket Cloud connection command was missing the required `--webhook-secret-secret-version` flag. Added the flag and a corresponding Secret Manager secret creation example because the current `gcloud` reference requires admin token, read token, webhook secret, and workspace.
- The credential instructions incorrectly referred to Bitbucket app passwords and did not include the required admin repository permission for the authorizer token. Updated the text to use Bitbucket Cloud access tokens and documented the admin token permissions and separate read token permission from the official Cloud Build Bitbucket Cloud host guide.
- The connected-repository setup reused the same generic webhook secret name as the standalone webhook trigger example. Renamed the connection webhook secret to `bitbucket-connection-webhook-secret` to avoid a copy-paste conflict between the two alternative methods.
- The webhook trigger command used `--build-config` while describing a sourceless webhook flow that clones the repository manually. Changed it to `--inline-config`, which matches Cloud Build webhook trigger guidance for builds that control Git operations themselves.
- The webhook trigger substitutions extracted `_COMMIT` but used `${_COMMIT:0:7}` directly in image tags. Added `_SHORT_COMMIT=${_COMMIT:0:7}` to the trigger substitutions and updated the build config to use `$_SHORT_COMMIT`.
- The webhook alternative was described as useful for a Bitbucket instance with network restrictions, which is inaccurate for Bitbucket Cloud wording. Rephrased it as an option for cases where connected repositories cannot be used or custom payload handling is needed.
- The Bitbucket Pipelines comparison said Bitbucket Pipelines caps at `8x`. Atlassian's current docs list `1x`, `2x`, `4x`, `8x`, `16x`, `24x`, and `32x` for cloud steps, so the comparison was replaced with a Cloud Build machine-type/control point.
- The timeout comparison said Bitbucket Pipelines has a 2-hour limit. Atlassian's current `max-time` documentation allows values up to 720 minutes, so the post now says Bitbucket Pipelines steps can be configured up to 12 hours.
- The pricing comparison said Cloud Build offers 120 free build-minutes per day. Current Cloud Build pricing states 2,500 free build-minutes per month for the promotional `e2-standard-2` default-pool free tier, so the post was updated accordingly.

## Review Notes
- The examples still use placeholder project IDs, repository names, usernames, and tokens; readers must replace them with real values.
- The local environment did not have `gcloud` installed, so CLI validation was performed against current official Google Cloud CLI reference pages rather than local `gcloud --help` output.
