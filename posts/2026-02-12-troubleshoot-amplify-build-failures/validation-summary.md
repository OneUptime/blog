# Validation Summary: How to Troubleshoot Amplify Build Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Amplify Hosting
- Amplify build specifications (`amplify.yml`)
- Node.js and NVM
- npm and `npm ci`
- Next.js SSR and SSG deployments
- TypeScript
- Docker/custom build images
- AWS Service Health Dashboard

## Sources Consulted
- AWS Amplify Hosting build specification reference: https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting build settings: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html
- AWS Amplify Hosting environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify Hosting custom build images and live package updates: https://docs.aws.amazon.com/amplify/latest/userguide/custom-build-image.html
- AWS Amplify Hosting build instance types and heap memory configuration: https://docs.aws.amazon.com/amplify/latest/userguide/custom-build-instance.html
- AWS Amplify Hosting build issue troubleshooting: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-build-issues.html
- AWS Amplify Hosting SSR troubleshooting: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html
- AWS Amplify Hosting Next.js deployment settings: https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Hosting SSR environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
- npm `ci` documentation: https://docs.npmjs.com/cli/v8/commands/npm-ci
- npm `.npmrc` documentation: https://docs.npmjs.com/files/npmrc/
- Next.js dynamic import/lazy loading documentation: https://nextjs.org/docs/13/app/building-your-application/optimizing/lazy-loading

## Issues Found
- The post said Amplify defaults to Node.js 16 and recommended Node.js 18 in `nvm` and `_LIVE_UPDATES` examples. Current Amplify guidance says SSR apps using Node.js 14, 16, or 18 are no longer supported, and AL2023 defaults have moved beyond Node 18. Updated the claim to avoid a stale default and changed examples to Node.js 20.
- The out-of-memory section used an inline `NODE_OPTIONS=... npm run build` command and described only a generic container memory limit. Updated it to export `NODE_OPTIONS` before the build and clarified that both build instance memory and Node.js heap limits matter. Also updated the console wording from compute type to build instance type and included XLarge.
- The timeout section described changing timeout directly under Build settings. AWS documents `_BUILD_TIMEOUT` as the supported override, with a 5 minute minimum and 120 minute maximum. Updated the instructions accordingly.
- The SSR artifact limit claimed the Lambda deployment package cannot exceed 50 MB. AWS Amplify Hosting documents a 220 MB maximum build output size for SSR apps. Updated the limit and adjusted the reduction advice to focus on build output and runtime dependencies.
- The local reproduction section claimed Amplify publishes the Docker images used for builds and referenced `public.ecr.aws/aws-amplify/amplify-linux2:latest`. Current AWS docs emphasize AL2023 by default and do not document that image as the current reproducible build container. Replaced the Docker commands with local reproduction using the same Node.js version and build commands.

## Review Notes
The remaining examples are broadly correct but intentionally generic. Projects may need branch-specific environment variable handling, framework-specific cache paths, or a different Node.js version if their Amplify app is pinned to a custom image or older build image.
