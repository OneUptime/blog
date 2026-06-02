# Validation Summary: How to Set Up Amplify for Server-Side Rendering Apps

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Amplify Hosting
- Amplify Hosting compute / WEB_COMPUTE
- Next.js SSR, SSG, ISR, API routes, App Router route handlers
- Nuxt.js SSR hosting
- Node.js
- CloudFront
- CloudWatch Logs
- AWS Systems Manager Parameter Store and AWS Secrets Manager

## Sources Consulted
- AWS Amplify Hosting: Deploying a Next.js SSR application to Amplify - https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Hosting: Amplify support for Next.js - https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- AWS Amplify Hosting: SSR supported features - https://docs.aws.amazon.com/amplify/latest/userguide/ssr-supported-features.html
- AWS Amplify Hosting: Making environment variables accessible to server-side runtimes - https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
- AWS Amplify Hosting: Deploying server-side rendered applications with Amplify Hosting - https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html
- AWS Amplify Hosting: Deployment specification - https://docs.aws.amazon.com/amplify/latest/userguide/ssr-deployment-specification.html
- AWS Amplify Hosting: Troubleshooting SSR deployments - https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html
- AWS Amplify Hosting: Troubleshooting build issues - https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-build-issues.html
- AWS CLI Amplify create-app reference - https://docs.aws.amazon.com/cli/latest/reference/amplify/create-app.html
- Next.js environment variables guide - https://nextjs.org/docs/pages/guides/environment-variables
- Next.js Route Handlers guide - https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js getServerSideProps export error documentation - https://nextjs.org/docs/messages/gssp-export

## Issues Found
- The post listed Node.js 18 or later as a prerequisite. AWS Amplify Hosting now blocks SSR deployments built with Node.js 18 and requires Node.js 20 or later, so the prerequisite was updated.
- The Amplify CLI was presented as required for the hosting workflow. Amplify Hosting console deployments do not require the CLI unless the project also manages Amplify backend resources, so the prerequisite and install wording were narrowed.
- The post said Amplify SSR works best with Next.js 13 and later. AWS documents support for Next.js 12 through 15 on Amplify Hosting compute, so the version guidance was corrected.
- The environment variable guidance implied Amplify console variables are automatically available to all server-side Next.js code. AWS documents that Next.js server components do not receive those variables by default, so the build spec now writes selected variables to `.env.production`, and the text explains the build-time/runtime behavior.
- The environment variable examples included secrets such as database credentials and session secrets. AWS warns against storing secrets in environment variables that can appear in deployment artifacts, so the examples were replaced with non-secret values and the post now recommends IAM roles or managed secret stores for sensitive data.
- The compute settings section described tuning SSR function resources and implied a console JSON setting. It was corrected to explain `WEB_COMPUTE` as the platform used by API/CLI workflows and automatic console detection for new Next.js SSR apps.
- Several sections described current Amplify Hosting compute deployments as Lambda or Lambda@Edge functions. These references were changed to Amplify Hosting compute resources to match current AWS documentation.
- The common issues section cited a 50MB Lambda package limit for SSR apps. AWS documents a 220MB maximum build output size for Amplify Hosting compute SSR apps, so the limit and remediation guidance were corrected.
- The image optimization note said Amplify provisions a separate Lambda function. AWS documents built-in image optimization for SSR apps and no extra configuration for Next.js 13 or later, so the wording was updated.
- The monitoring section described Lambda invocation metrics and specific cold start timing. AWS documents CloudWatch Logs for SSR runtime logs with the required IAM service role permissions, so the monitoring wording was changed to SSR runtime logs and compute startup/response latency.

## Review Notes
The post is technically relevant and salvageable. It remains primarily a Next.js-focused guide even though the title and introduction mention Nuxt.js; future revisions could add Nuxt-specific adapter details, but the existing Nuxt mention is supported by AWS documentation.
