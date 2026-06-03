# Validation Summary: How to Set Up Amplify Hosting for a React App

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Amplify Hosting
- AWS CLI for Amplify
- Amplify CLI
- React
- Create React App
- Vite
- YAML build specifications
- CI/CD, branch deployments, pull request previews, custom domains, redirects, and basic auth

## Sources Consulted
- AWS Amplify Hosting build specification reference: https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting editing build settings: https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html
- AWS Amplify Hosting environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify Hosting redirects and rewrites examples: https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html
- AWS Amplify Hosting custom domains: https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html
- AWS Amplify Hosting feature branch deployments: https://docs.aws.amazon.com/amplify/latest/userguide/multi-environments.html
- AWS Amplify Hosting pattern-based feature branch deployments: https://docs.aws.amazon.com/amplify/latest/userguide/pattern-based-feature-branch-deployments.html
- AWS Amplify Hosting web previews for pull requests: https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html
- AWS CLI `amplify create-app`: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-app.html
- AWS CLI `amplify create-branch`: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-branch.html
- AWS CLI `amplify update-app`: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-app.html
- AWS CLI `amplify update-branch`: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-branch.html
- AWS CLI `amplify create-domain-association`: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-domain-association.html
- AWS CLI `amplify list-jobs`: https://docs.aws.amazon.com/cli/latest/reference/amplify/list-jobs.html
- AWS CLI `amplify get-job`: https://docs.aws.amazon.com/cli/latest/reference/amplify/get-job.html
- Create React App environment variables: https://create-react-app.dev/docs/adding-custom-environment-variables/
- Vite environment variables and modes: https://vite.dev/guide/env-and-mode.html

## Issues Found
- The auto-branch/PR preview command configured `auto-branch-creation-config` but did not enable automated branch creation or provide branch creation patterns. Added `--enable-auto-branch-creation` and `--auto-branch-creation-patterns 'feature/*'`.
- The SPA rewrite regex omitted `webp` from the current AWS Amplify SPA rewrite example. Added `webp` to the excluded static asset extensions.
- The build optimization snippet cached `~/.npm/**/*`, but Amplify build cache paths are relative to the project root. Changed the install command to use `npm ci --cache .npm --prefer-offline` and cache `.npm/**/*`.
- The `aws amplify list-jobs` example used `--max-results`, but the AWS CLI v2 paginated command uses `--max-items`. Updated the command accordingly.

## Review Notes
The AWS CLI examples assume AWS CLI v2 and a repository connection token with appropriate permissions. The `get-job` command returns job steps that include `logUrl` values rather than printing raw log text directly.
