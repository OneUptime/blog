# Validation Summary: How to Deploy a Next.js App to AWS with Amplify

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Amplify Hosting
- AWS CLI for Amplify
- Next.js
- Next.js image configuration
- Next.js environment variables
- Amplify build specifications
- Custom domains and pull request previews

## Sources Consulted
- AWS Amplify Hosting: Amplify support for Next.js: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- AWS Amplify Hosting: Deploying a Next.js SSR application to Amplify: https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Hosting: Making environment variables accessible to server-side runtimes: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
- AWS CLI Command Reference: amplify create-app: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-app.html
- AWS CLI Command Reference: amplify update-app: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-app.html
- AWS CLI Command Reference: amplify update-branch: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-branch.html
- AWS CLI Command Reference: amplify create-domain-association: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-domain-association.html
- AWS Amplify Hosting: Web previews for pull requests: https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html
- AWS Amplify Hosting: Connecting a custom domain: https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html
- AWS Amplify Hosting: Build specification reference: https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting: Troubleshooting build issues: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-build-issues.html
- Next.js Docs: Environment variables: https://nextjs.org/docs/app/guides/environment-variables
- Next.js Docs: Image component configuration: https://nextjs.org/docs/pages/api-reference/components/image

## Issues Found
- The `next.config.js` example used `images.domains`, which is deprecated in current Next.js versions. Updated the example and the related gotcha to use `images.remotePatterns`.
- The Amplify build spec did not show the documented step required to make selected environment variables available to Next.js SSR runtime code on Amplify. Added build commands that write public and selected non-secret server-side variables to `.env.production`.
- The environment-variable AWS CLI example used invalid map syntax by passing each key/value as a separate shell argument. Changed it to the documented comma-separated AWS CLI map syntax.
- The environment-variable section implied secrets such as database URLs and API keys were ordinary Amplify environment-variable examples. Adjusted the wording and examples to use non-secret configuration and note that long-lived secrets should use IAM roles or a secrets service where possible.
- The pull request preview CLI example used app-level auto branch creation configuration, which does not directly enable previews for an existing branch. Replaced it with `aws amplify update-branch --enable-pull-request-preview`, matching the AWS CLI branch setting.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference rather than local `--help` output.
- Amplify currently documents support for Next.js versions 12 through 15 on Amplify Hosting compute, with unsupported features including Edge API Routes, Edge middleware, on-demand ISR, and Next.js streaming.
