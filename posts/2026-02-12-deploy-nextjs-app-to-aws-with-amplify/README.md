# How to Deploy a Next.js App to AWS with Amplify

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Next.js, Amplify, Deployment

Description: Learn how to deploy Next.js applications to AWS Amplify with automatic builds, custom domains, environment variables, and SSR support.

---

AWS Amplify has become one of the simplest ways to deploy Next.js applications. It supports server-side rendering, static generation, API routes, and incremental static regeneration right out of the box. If you've been looking for a Vercel alternative that runs on your own AWS account, Amplify is worth a serious look. Let's walk through the entire process from connecting your repo to setting up a production-ready deployment.

## Why Amplify for Next.js?

Amplify offers several things that make it attractive for Next.js deployments. It handles SSR automatically without any extra configuration. It provides built-in CI/CD pipelines that trigger on every push. You get preview deployments for pull requests. And everything runs in your AWS account, which matters for compliance and cost control.

The pricing model is also straightforward - you pay for build minutes and hosting, and there's a generous free tier that covers most side projects.

## Prerequisites

You'll need:

- A Next.js app in a Git repository (GitHub, GitLab, Bitbucket, or CodeCommit)
- An AWS account
- The Amplify CLI installed (optional but helpful)

## Setting Up Your Next.js App

If you don't have a Next.js project yet, here's how to create one:

```bash
# Create a new Next.js app
npx create-next-app@latest my-amplify-app
cd my-amplify-app
```

Make sure your `next.config.js` is set up properly. For Amplify deployments, you generally don't need any special configuration:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Amplify handles output configuration automatically
  images: {
    // If you use external images, add domains here
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig
```

## Deploying via the Amplify Console

The fastest approach is through the AWS Console.

1. Go to the AWS Amplify console
2. Click "New app" then "Host web app"
3. Choose your Git provider and authorize access
4. Select your repository and branch
5. Amplify auto-detects Next.js and sets up the build configuration
6. Click "Save and deploy"

That's really all there is to it for a basic deployment. Amplify will clone your repo, install dependencies, build your app, and deploy it to a CDN-backed URL.

## Deploying via the CLI

If you prefer the command line, you can use the Amplify CLI or the AWS CLI.

Install and configure the Amplify CLI first:

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure with your AWS credentials
amplify configure
```

Then initialize Amplify in your project:

```bash
# Initialize Amplify in your project directory
amplify init

# Add hosting
amplify add hosting

# Choose: Hosting with Amplify Console
# Choose: Continuous deployment
```

You can also use the AWS CLI directly to create the app:

```bash
# Create an Amplify app connected to your GitHub repo
aws amplify create-app \
  --name my-nextjs-app \
  --repository https://github.com/youruser/my-amplify-app \
  --access-token YOUR_GITHUB_TOKEN \
  --platform WEB_COMPUTE

# Create a branch deployment
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --stage PRODUCTION

# Trigger a build
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE
```

## Custom Build Configuration

Amplify generates a default `amplify.yml` build spec, but you can customize it. Create this file in your project root:

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

The cache configuration is important - caching `node_modules` and `.next/cache` significantly speeds up subsequent builds. Without it, every build starts from scratch, which can take several minutes for larger projects.

## Environment Variables

You'll almost certainly need environment variables for things like API keys, database URLs, and feature flags. There are two ways to set them.

Through the console, navigate to your app, go to "Environment variables", and add them there.

Through the CLI, use this command:

```bash
# Set an environment variable
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables \
    DATABASE_URL=postgresql://user:pass@host:5432/db \
    NEXT_PUBLIC_API_URL=https://api.example.com
```

Remember that Next.js has a distinction between server-side and client-side environment variables. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser, while others are only available during build time and on the server.

Here's how to access them in your Next.js code:

```typescript
// lib/config.ts
export const config = {
  // Available on the client (prefixed with NEXT_PUBLIC_)
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',

  // Server-only variables
  databaseUrl: process.env.DATABASE_URL,
  secretKey: process.env.SECRET_KEY,
}
```

## Custom Domains

Setting up a custom domain with Amplify is straightforward. You can do it through the console or CLI.

```bash
# Add a custom domain
aws amplify create-domain-association \
  --app-id YOUR_APP_ID \
  --domain-name yourdomain.com \
  --sub-domain-settings \
    prefix='',branchName='main' \
    prefix='www',branchName='main'
```

Amplify automatically provisions an SSL certificate through ACM (AWS Certificate Manager) and sets up the necessary DNS records. If your domain is in Route 53, the DNS configuration is automatic. For external DNS providers, Amplify gives you the CNAME records to add manually.

## Preview Deployments for Pull Requests

One of Amplify's best features is automatic preview deployments for PRs. Enable it like this:

```bash
# Enable pull request previews
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --enable-auto-branch-creation \
  --auto-branch-creation-config '{
    "enableAutoBuild": true,
    "stage": "DEVELOPMENT",
    "enablePullRequestPreview": true
  }'
```

Every pull request gets its own URL where you can preview changes before merging. This is incredibly useful for design reviews and QA.

## Server-Side Rendering Configuration

Amplify supports Next.js SSR features including `getServerSideProps`, API routes, and middleware. For the most part, it just works. But there are a few things to be aware of.

If you're using API routes, make sure they handle errors gracefully:

```typescript
// pages/api/data.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Your API logic here
    const data = await fetchData()
    res.status(200).json(data)
  } catch (error) {
    console.error('API error:', error)
    // Always return a proper error response
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

## Monitoring Your Deployment

Amplify provides basic metrics in the console, but for production apps you'll want more. You can integrate with CloudWatch for detailed logging.

Add a custom logging utility that works well in both local development and on Amplify:

```typescript
// lib/logger.ts
const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    const entry = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }
    console.log(isDev ? message : JSON.stringify(entry))
  },
  error: (message: string, error?: Error) => {
    const entry = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      stack: error?.stack,
    }
    console.error(isDev ? message : JSON.stringify(entry))
  },
}
```

For uptime monitoring and alerting, consider setting up external health checks with a service like [OneUptime](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view) that can catch issues before your users do.

## Common Gotchas

A few things that trip people up with Amplify and Next.js:

**Build timeouts**: The default build timeout is 30 minutes. If your build takes longer, increase it in the app settings.

**Image optimization**: Next.js image optimization works on Amplify, but make sure your `next.config.js` has the correct image domains configured.

**Large dependencies**: If your `node_modules` is massive, builds can be slow. Use `npm ci` instead of `npm install` in your build spec for faster, more reliable installs.

**Environment variable changes**: After changing environment variables, you need to trigger a new build for them to take effect.

## Wrapping Up

AWS Amplify takes most of the pain out of deploying Next.js applications. You get CI/CD, preview deployments, custom domains, and SSR support without managing any infrastructure. For teams already invested in AWS, it's a compelling alternative to Vercel that keeps everything under one roof. The setup takes about 10 minutes, and from there it's just push-to-deploy.
