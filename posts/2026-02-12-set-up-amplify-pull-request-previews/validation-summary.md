# Validation Summary: How to Set Up Amplify Pull Request Previews

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- Amplify pull request web previews
- GitHub pull requests and GitHub App integration
- Amplify build specifications (`amplify.yml`)
- Amplify environment variables and secrets
- Amplify access control
- AWS Lambda
- AWS CLI
- Amazon CloudFront caching concepts

## Sources Consulted
- AWS Amplify Hosting: Web previews for pull requests: https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html
- AWS Amplify Hosting: Using environment variables in an Amplify application: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify Hosting: Managing environment secrets: https://docs.aws.amazon.com/amplify/latest/userguide/environment-secrets.html
- AWS Amplify Hosting: Restricting access to an Amplify app's branches: https://docs.aws.amazon.com/amplify/latest/userguide/access-control.html
- AWS Amplify Hosting: Managing the build configuration for an Amplify application: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings-configuration.html
- AWS Amplify Hosting: Customizing the build image: https://docs.aws.amazon.com/amplify/latest/userguide/custom-build-image.html
- AWS Amplify Hosting: Troubleshooting general Amplify issues: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-general.html
- AWS Amplify Hosting: Using the Cache-Control header to increase app performance: https://docs.aws.amazon.com/amplify/latest/userguide/Using-headers-to-control-cache-duration.html
- AWS Lambda: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CLI Command Reference: `aws lambda create-function`: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html

## Issues Found
- The prerequisites and setup text described repository webhooks too broadly. Updated the wording to match Amplify's current GitHub App-based flow for GitHub repositories.
- The sequence diagram also referred to webhooks directly. Updated those labels to "repository event" to keep the diagram provider-neutral.
- The post claimed GitLab and Bitbucket PR preview support with unspecified webhook limitations. Replaced that with a narrower, documented GitHub-specific note.
- The Next.js-oriented `amplify.yml` example used `baseDirectory: build`, which is not the typical Amplify Hosting output directory for Next.js builds. Updated it to `.next`.
- The environment variable example included a database URL with credentials. AWS documentation says not to store secrets in Amplify environment variables, so the example now uses non-secret configuration and points readers to Amplify Secrets or SSM Parameter Store environment secrets.
- The access control section suggested AWS IAM for reviewer access to preview URLs. Amplify's documented branch access control is username/password-based, so the text now recommends application-level auth for more granular reviewer access.
- The GitHub integration section implied Amplify bot comments can be customized through a GitHub check. Updated it to clarify that custom checks or workflows can be added alongside Amplify's bot comment.
- The build optimization section claimed a smaller build image can be selected specifically for previews. Updated it to current Amplify guidance around build instance sizing and custom build images.
- The Lambda notification example used `nodejs18.x`, which is deprecated. Updated it to `nodejs24.x`, a current supported Lambda runtime.
- The debugging section recommended invalidating Amplify's managed CloudFront distribution from build commands. Replaced that with documented cache-control guidance because Amplify Hosting's managed CDN is normally tuned through headers, not direct preview-build invalidations.
- The GitHub troubleshooting text referenced webhook redelivery in GitHub settings. Updated it to check Amplify build logs and GitHub App authorization.

## Review Notes
The guide is technically relevant and mostly accurate after the corrections. Some UI labels in the Amplify console can change over time, so future reviews should re-check console navigation wording against AWS documentation.
