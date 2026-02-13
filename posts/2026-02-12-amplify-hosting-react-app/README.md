# How to Set Up Amplify Hosting for a React App

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, React, Hosting, CI/CD

Description: A step-by-step guide to deploying a React application with AWS Amplify Hosting, including CI/CD pipelines, custom domains, environment variables, and build configuration optimization.

---

Amplify Hosting is one of the easiest ways to deploy a React app on AWS. You connect your Git repository, Amplify detects your build settings, and every push to your branch triggers an automatic deployment with a CDN, HTTPS, and a preview URL. No need to configure S3, CloudFront, or Route 53 separately.

Let's go through the setup from scratch and cover the customizations you'll likely need for a production deployment.

## Connecting Your Repository

You can set up Amplify Hosting through the AWS Console or the CLI. The console approach is more visual and great for the first time.

Using the Amplify CLI:

```bash
# Navigate to your React project
cd my-react-app

# Initialize Amplify if you haven't already
amplify init

# Add hosting
amplify add hosting

# Select "Hosting with Amplify Console"
# Choose "Continuous deployment" for Git-based deployments
```

Or use the AWS CLI to create the app directly:

```bash
# Create an Amplify app connected to a GitHub repo
aws amplify create-app \
    --name my-react-app \
    --repository https://github.com/yourname/my-react-app \
    --access-token $GITHUB_TOKEN \
    --build-spec "$(cat amplify.yml)"

# Create a branch for deployment
aws amplify create-branch \
    --app-id $APP_ID \
    --branch-name main \
    --enable-auto-build
```

## Build Configuration

Amplify automatically detects React apps created with Create React App or Vite. But you'll want to customize the build settings for your specific setup.

Create an `amplify.yml` file in your project root:

```yaml
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
    baseDirectory: build  # Use 'dist' for Vite projects
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

For Vite-based React apps, adjust the artifacts directory:

```yaml
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
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Environment Variables

You'll need environment variables for API endpoints, feature flags, and other configuration.

Set them through the CLI:

```bash
# Add environment variables
aws amplify update-branch \
    --app-id $APP_ID \
    --branch-name main \
    --environment-variables \
        REACT_APP_API_URL=https://api.example.com,REACT_APP_FEATURE_FLAG=true
```

Or reference them in your build spec:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        # Amplify environment variables are available during build
        - echo "Building for $AWS_BRANCH"
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
```

For React apps, remember that environment variables must start with `REACT_APP_` (for CRA) or `VITE_` (for Vite) to be embedded in the bundle.

## Custom Domain Setup

Amplify gives you a default domain like `main.d1234abcd.amplifyapp.com`. For production, you'll want your own domain.

Add a custom domain:

```bash
# Associate a custom domain
aws amplify create-domain-association \
    --app-id $APP_ID \
    --domain-name example.com \
    --sub-domain-settings \
        prefix='',branchName='main' \
        prefix='www',branchName='main'
```

If your domain is managed by Route 53, Amplify handles DNS configuration automatically. For external DNS providers, you'll need to add CNAME records manually.

## Branch Deployments and Previews

One of Amplify's best features is automatic branch deployments. Each branch gets its own URL, which is perfect for staging and testing.

Configure branch patterns:

```bash
# Enable auto-build for feature branches
aws amplify create-branch \
    --app-id $APP_ID \
    --branch-name develop \
    --enable-auto-build \
    --environment-variables \
        REACT_APP_API_URL=https://staging-api.example.com

# Enable pull request previews
aws amplify update-app \
    --app-id $APP_ID \
    --enable-branch-auto-build \
    --auto-branch-creation-config '{
        "enableAutoBuild": true,
        "enablePullRequestPreview": true,
        "pullRequestEnvironmentName": "pr"
    }'
```

## Single-Page App Redirects

React apps need all routes to redirect to `index.html` so that client-side routing works. Amplify doesn't do this by default.

Add redirect rules:

```bash
# Add SPA redirect rules
aws amplify update-app \
    --app-id $APP_ID \
    --custom-rules '[
        {
            "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>",
            "target": "/index.html",
            "status": "200"
        }
    ]'
```

Or add it through the console in Rewrites and Redirects section. The regex pattern catches all requests that aren't for static files and serves `index.html` instead.

## Optimizing Build Performance

Large React apps can take a while to build. Here are some tips to speed things up.

Optimize your build configuration:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        # Use npm ci for faster, more reliable installs
        - npm ci --prefer-offline
    build:
      commands:
        # Increase Node.js memory for large builds
        - NODE_OPTIONS=--max_old_space_size=4096 npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      # Cache node_modules
      - node_modules/**/*
      # Cache npm cache
      - ~/.npm/**/*
```

## Monitoring Your Deployment

Amplify provides build logs and deployment status, but for application-level monitoring you'll want additional tooling.

Check deployment status programmatically:

```bash
# List recent deployments
aws amplify list-jobs \
    --app-id $APP_ID \
    --branch-name main \
    --max-results 5

# Get specific build logs
aws amplify get-job \
    --app-id $APP_ID \
    --branch-name main \
    --job-id $JOB_ID
```

## Access Control

You can add basic access control to branches - useful for staging environments that shouldn't be publicly accessible:

```bash
# Add basic auth to a branch
aws amplify update-branch \
    --app-id $APP_ID \
    --branch-name staging \
    --enable-basic-auth \
    --basic-auth-credentials $(echo -n "username:password" | base64)
```

For Next.js applications, see [setting up Amplify Hosting for a Next.js app](https://oneuptime.com/blog/post/2026-02-12-amplify-hosting-nextjs-app/view). And for the overall Amplify ecosystem, check out [getting started with AWS Amplify](https://oneuptime.com/blog/post/2026-02-12-aws-amplify-getting-started/view).

## Wrapping Up

Amplify Hosting takes the DevOps out of deploying React apps. You get CI/CD, CDN distribution, HTTPS, preview deployments, and custom domains without touching CloudFront, S3, or CodePipeline directly. The main configuration points are your build spec file, environment variables, and redirect rules for SPA routing. Set those up correctly and you've got a production-grade hosting setup that deploys automatically on every git push.
