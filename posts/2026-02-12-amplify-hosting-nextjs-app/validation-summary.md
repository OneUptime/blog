# Validation Summary: How to Set Up Amplify Hosting for a Next.js App

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Amplify Hosting
- AWS CLI for Amplify
- AWS Systems Manager Parameter Store
- Next.js
- Next.js SSR, ISR, Route Handlers, Middleware, and Image Optimization
- CloudFront
- YAML build specifications

## Sources Consulted
- AWS Amplify Hosting: Amplify support for Next.js: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- AWS Amplify Hosting: Deploying a Next.js SSR application to Amplify: https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Hosting: Making environment variables accessible to server-side runtimes: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
- AWS Amplify Hosting: Configuring monorepo build settings: https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html
- AWS Amplify Hosting: Troubleshooting server-side rendered applications: https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html
- AWS CLI Command Reference: amplify create-app: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-app.html
- AWS CLI Command Reference: amplify create-branch: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-branch.html
- AWS CLI Command Reference: amplify update-branch: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-branch.html
- AWS CLI Command Reference: amplify update-app: https://docs.aws.amazon.com/cli/latest/reference/amplify/update-app.html
- AWS CLI Command Reference: amplify create-domain-association: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-domain-association.html
- AWS CLI Command Reference: amplify start-job: https://docs.aws.amazon.com/cli/latest/reference/amplify/start-job.html
- Next.js environment variables documentation: https://nextjs.org/docs/app/guides/environment-variables
- Next.js Route Handlers documentation: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Image Component documentation: https://nextjs.org/docs/app/api-reference/components/image
- Next.js headers configuration documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers

## Issues Found
- The post described current Amplify Next.js SSR deployments as running across Lambda@Edge. Updated the wording and diagram to use Amplify Hosting compute and CloudFront, and added the supported Next.js version range from AWS documentation.
- The feature list said middleware runs at the edge. AWS documents middleware support but does not support Edge API Routes or Edge Middleware, so the wording was corrected.
- The monorepo `amplify.yml` example used top-level `appRoot`. Updated it to the documented `applications` list format.
- The environment variable section implied branch variables are directly available to the Next.js server runtime. Updated it to show writing selected variables to `.env.production` during the build, matching AWS guidance.
- The environment variable commands were split into two `update-branch` calls, which can replace the branch environment variable map. Consolidated them into one command.
- The Parameter Store example exported a shell variable but did not persist it into the Next.js environment file. Updated it to write the fetched value to `.env.production` and added the AWS warning that long-lived secrets should not be stored in deployment artifacts.
- The image optimization wording said processing happens at the edge. Updated it to the documented Amplify SSR image optimization wording.
- The API routes and SSR troubleshooting sections referred to Lambda functions or Lambda errors. Updated them to Amplify Hosting compute terminology.
- The branch preview example used `--enable-branch-auto-build` to enable automatic branch creation. Updated it to `--enable-auto-branch-creation` with `--auto-branch-creation-patterns`.
- The memory troubleshooting advice set `NODE_OPTIONS` inline in the build command. AWS recommends setting `NODE_OPTIONS` in Amplify environment variables and temporarily removing `.next/cache/**/*` from cache paths when needed, so the example was corrected.

## Review Notes
- AWS Amplify Hosting compute currently documents support for Next.js versions 12 through 15, while the latest Next.js documentation shows Next.js 16. Future updates should revisit the post when AWS adds support for newer Next.js major versions.
