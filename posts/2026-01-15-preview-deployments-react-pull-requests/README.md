# How to Set Up Preview Deployments for React Pull Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: React, Preview Deployments, CI/CD, DevOps, Pull Requests, Automation

Description: Learn how to configure automatic preview deployments for React pull requests using GitHub Actions, Vercel, and Netlify to streamline code reviews and catch issues before merging.

---

Preview deployments transform your pull request workflow from "trust me, it works" to "see for yourself." Every PR gets its own live environment where reviewers can interact with actual changes instead of reading diffs. Here is a complete guide to setting up preview deployments for React applications.

## Why Preview Deployments Matter

Traditional code review involves reading diffs and imagining how changes behave. Preview deployments eliminate guesswork:

- **Visual verification**: Reviewers see exactly what users will experience
- **Cross-browser testing**: QA can test on multiple devices before merge
- **Stakeholder demos**: Product managers preview features without local setup
- **Regression catching**: Spot UI regressions that diffs hide
- **Faster iterations**: Feedback comes from interaction, not imagination

For React applications with complex component hierarchies and state management, preview deployments are invaluable. A CSS change that looks harmless in a diff might break layouts. A state update that passes unit tests might cause flickering. Preview deployments expose these issues early.

## Architecture Overview

Preview deployments work by:

1. Detecting PR events (open, synchronize, close)
2. Building the React application for that branch
3. Deploying to an isolated environment with a unique URL
4. Posting the URL as a PR comment or status check
5. Cleaning up when the PR closes or merges

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
├─────────────────────────────────────────────────────────────────┤
│  Pull Request Created/Updated                                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────┐                                        │
│  │   GitHub Actions    │                                        │
│  │   or Platform CI    │                                        │
│  └──────────┬──────────┘                                        │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐                                        │
│  │   Build React App   │                                        │
│  │   npm run build     │                                        │
│  └──────────┬──────────┘                                        │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐     ┌─────────────────────┐           │
│  │  Deploy to Preview  │────▶│  https://pr-42.    │           │
│  │  Environment        │     │  preview.app.com   │           │
│  └──────────┬──────────┘     └─────────────────────┘           │
│             │                                                    │
│             ▼                                                    │
│  ┌─────────────────────┐                                        │
│  │  Post URL to PR     │                                        │
│  │  Comment/Status     │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Option 1: Vercel (Recommended for Most Teams)

Vercel offers the smoothest preview deployment experience for React apps. Zero configuration for Create React App, Next.js, and Vite projects.

### Initial Setup

1. Sign up at vercel.com and connect your GitHub account
2. Import your repository
3. Vercel auto-detects React and configures builds

That is it. Every PR automatically gets a preview deployment.

### Customizing vercel.json

For advanced configuration, add `vercel.json` to your project root. This example shows common settings for a React SPA.

```json
{
  "version": 2,
  "name": "my-react-app",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      "dest": "/static/$1"
    },
    {
      "src": "/favicon.ico",
      "dest": "/favicon.ico"
    },
    {
      "src": "/manifest.json",
      "dest": "/manifest.json"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@api-url-preview"
  },
  "build": {
    "env": {
      "REACT_APP_ENVIRONMENT": "preview"
    }
  }
}
```

### Environment Variables for Previews

Vercel supports environment-specific variables. Set these in your project settings or via CLI.

```bash
# Set a variable for preview deployments only
vercel env add REACT_APP_API_URL preview

# Set different values per environment
vercel env add REACT_APP_API_URL production
vercel env add REACT_APP_API_URL development
```

In your React app, access these normally:

```javascript
// src/config.js
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  isPreview: process.env.VERCEL_ENV === 'preview',
};

export default config;
```

### Preview Deployment Protections

Protect preview deployments from unauthorized access. This is crucial for apps with sensitive data.

```json
{
  "version": 2,
  "password": {
    "protection": "all"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "noindex"
        }
      ]
    }
  ]
}
```

### Vercel CLI for Local Testing

Test preview builds locally before pushing:

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Build and preview locally (simulates preview environment)
vercel dev

# Manually create a preview deployment
vercel --prebuilt
```

## Option 2: Netlify

Netlify provides similar functionality with different strengths. Excellent for static sites and JAMstack architectures.

### Initial Setup

1. Sign up at netlify.com and authorize GitHub
2. Click "New site from Git"
3. Select your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `build` (or `dist` for Vite)

### netlify.toml Configuration

Create `netlify.toml` in your project root for detailed control:

```toml
[build]
  command = "npm run build"
  publish = "build"
  environment = { REACT_APP_ENVIRONMENT = "preview" }

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

# SPA routing - all paths serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# API proxy for development
[[redirects]]
  from = "/api/*"
  to = "https://api.example.com/:splat"
  status = 200
  force = true

# Preview-specific settings
[context.deploy-preview]
  command = "npm run build:preview"

[context.deploy-preview.environment]
  REACT_APP_API_URL = "https://api-staging.example.com"
  REACT_APP_FEATURE_FLAGS = "all"

# Branch deploy settings
[context.branch-deploy]
  command = "npm run build"

[context.branch-deploy.environment]
  REACT_APP_API_URL = "https://api-staging.example.com"

# Production settings
[context.production]
  command = "npm run build:production"

[context.production.environment]
  REACT_APP_API_URL = "https://api.example.com"

# Headers for caching and security
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Plugins
[[plugins]]
  package = "@netlify/plugin-lighthouse"

  [plugins.inputs]
    output_path = "reports/lighthouse.html"
```

### Deploy Notifications

Configure Slack or webhook notifications for deploy status:

```toml
# netlify.toml

[build.processing]
  skip_processing = false

# Notify on deploy success
[[plugins]]
  package = "netlify-plugin-webhook-deploy-notification"

  [plugins.inputs]
    webhook_url = "https://hooks.slack.com/services/xxx/yyy/zzz"
```

### Branch Subdomains

Netlify creates predictable URLs for branch deploys:

```
# Pattern: branch-name--site-name.netlify.app

feature-login--myreactapp.netlify.app
bugfix-header--myreactapp.netlify.app
```

## Option 3: GitHub Actions + Custom Infrastructure

For teams needing full control or using existing infrastructure, GitHub Actions provides maximum flexibility.

### Basic Preview Workflow

This workflow builds your React app and deploys to a cloud storage bucket with unique PR-based paths.

```yaml
# .github/workflows/preview.yml

name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  contents: read
  pull-requests: write
  id-token: write

env:
  NODE_VERSION: '20'
  PREVIEW_BUCKET: 'preview-deployments'
  PREVIEW_DOMAIN: 'preview.example.com'

jobs:
  deploy-preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage --watchAll=false

      - name: Build React application
        run: npm run build
        env:
          REACT_APP_ENVIRONMENT: preview
          REACT_APP_API_URL: ${{ secrets.PREVIEW_API_URL }}
          REACT_APP_PR_NUMBER: ${{ github.event.pull_request.number }}
          PUBLIC_URL: /pr-${{ github.event.pull_request.number }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ env.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "asset-manifest.json"

          # Upload HTML files with no-cache
          aws s3 cp build/index.html s3://${{ env.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/index.html \
            --cache-control "no-cache, no-store, must-revalidate"

          aws s3 cp build/asset-manifest.json s3://${{ env.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/asset-manifest.json \
            --cache-control "no-cache, no-store, must-revalidate"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/pr-${{ github.event.pull_request.number }}/*"

      - name: Post deployment URL to PR
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const previewUrl = `https://${{ env.PREVIEW_DOMAIN }}/pr-${prNumber}/`;

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });

            const botComment = comments.find(comment =>
              comment.user.type === 'Bot' &&
              comment.body.includes('Preview Deployment')
            );

            const body = `## Preview Deployment

            | Status | URL |
            |--------|-----|
            | Ready | [${previewUrl}](${previewUrl}) |

            **Commit:** \`${context.sha.substring(0, 7)}\`
            **Updated:** ${new Date().toISOString()}

            ---
            *This preview will be automatically deleted when the PR is closed.*`;

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body: body
              });
            }

  cleanup-preview:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Delete preview deployment
        run: |
          aws s3 rm s3://${{ env.PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ --recursive

      - name: Update PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: prNumber,
            });

            const botComment = comments.find(comment =>
              comment.user.type === 'Bot' &&
              comment.body.includes('Preview Deployment')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: `## Preview Deployment

                | Status | URL |
                |--------|-----|
                | Deleted | Preview has been cleaned up |

                *PR was ${context.payload.pull_request.merged ? 'merged' : 'closed'}.*`
              });
            }
```

### Advanced: Kubernetes-based Preview Environments

For applications requiring backend services, deploy full environments to Kubernetes:

```yaml
# .github/workflows/preview-k8s.yml

name: Kubernetes Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=pr

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            REACT_APP_ENVIRONMENT=preview
            REACT_APP_API_URL=https://api-pr-${{ github.event.pull_request.number }}.preview.example.com

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure Kubernetes context
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Deploy to Kubernetes
        run: |
          export PR_NUMBER=${{ github.event.pull_request.number }}
          export IMAGE_TAG=pr-${PR_NUMBER}

          # Create namespace if not exists
          kubectl create namespace preview-${PR_NUMBER} --dry-run=client -o yaml | kubectl apply -f -

          # Apply manifests with substitution
          envsubst < k8s/preview/deployment.yaml | kubectl apply -n preview-${PR_NUMBER} -f -
          envsubst < k8s/preview/service.yaml | kubectl apply -n preview-${PR_NUMBER} -f -
          envsubst < k8s/preview/ingress.yaml | kubectl apply -n preview-${PR_NUMBER} -f -

          # Wait for rollout
          kubectl rollout status deployment/react-app -n preview-${PR_NUMBER} --timeout=300s

      - name: Get preview URL
        id: preview-url
        run: |
          echo "url=https://pr-${{ github.event.pull_request.number }}.preview.example.com" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.preview-url.outputs.url }}';
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `## Kubernetes Preview Ready\n\nURL: ${url}\n\nNamespace: \`preview-${{ github.event.pull_request.number }}\``
            });

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Configure Kubernetes context
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Delete preview namespace
        run: |
          kubectl delete namespace preview-${{ github.event.pull_request.number }} --ignore-not-found
```

Corresponding Kubernetes manifests:

```yaml
# k8s/preview/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-app
  labels:
    app: react-app
    preview: "pr-${PR_NUMBER}"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: react-app
  template:
    metadata:
      labels:
        app: react-app
        preview: "pr-${PR_NUMBER}"
    spec:
      containers:
        - name: react-app
          image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
```

```yaml
# k8s/preview/service.yaml

apiVersion: v1
kind: Service
metadata:
  name: react-app
spec:
  selector:
    app: react-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

```yaml
# k8s/preview/ingress.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: react-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - pr-${PR_NUMBER}.preview.example.com
      secretName: preview-${PR_NUMBER}-tls
  rules:
    - host: pr-${PR_NUMBER}.preview.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: react-app
                port:
                  number: 80
```

## Option 4: GitHub Actions + Surge.sh

Surge.sh provides simple, free static hosting perfect for quick preview deployments:

```yaml
# .github/workflows/surge-preview.yml

name: Surge Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run build
        env:
          REACT_APP_ENVIRONMENT: preview

      - name: Deploy to Surge
        run: |
          npm install -g surge
          surge ./build pr-${{ github.event.pull_request.number }}-${{ github.event.repository.name }}.surge.sh --token ${{ secrets.SURGE_TOKEN }}

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = `https://pr-${{ github.event.pull_request.number }}-${{ github.event.repository.name }}.surge.sh`;
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `Preview deployed to: ${url}`
            });

  teardown:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Teardown Surge
        run: |
          npm install -g surge
          surge teardown pr-${{ github.event.pull_request.number }}-${{ github.event.repository.name }}.surge.sh --token ${{ secrets.SURGE_TOKEN }}
```

## Handling Environment-Specific Configuration

React applications often need different configurations for preview environments. Here is a robust pattern:

```javascript
// src/config/index.js

const environments = {
  production: {
    apiUrl: 'https://api.example.com',
    analyticsId: 'UA-PROD-123',
    features: {
      betaFeatures: false,
      debugPanel: false,
    },
  },
  preview: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://api-staging.example.com',
    analyticsId: 'UA-STAGING-456',
    features: {
      betaFeatures: true,
      debugPanel: true,
    },
  },
  development: {
    apiUrl: 'http://localhost:3001',
    analyticsId: null,
    features: {
      betaFeatures: true,
      debugPanel: true,
    },
  },
};

const getEnvironment = () => {
  // Check for Vercel environment
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
  }

  // Check for Netlify environment
  if (process.env.CONTEXT) {
    if (process.env.CONTEXT === 'production') return 'production';
    if (process.env.CONTEXT === 'deploy-preview') return 'preview';
    if (process.env.CONTEXT === 'branch-deploy') return 'preview';
  }

  // Check custom environment variable
  if (process.env.REACT_APP_ENVIRONMENT) {
    return process.env.REACT_APP_ENVIRONMENT;
  }

  // Default based on NODE_ENV
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};

const currentEnvironment = getEnvironment();
const config = environments[currentEnvironment] || environments.development;

export default {
  ...config,
  environment: currentEnvironment,
  isPreview: currentEnvironment === 'preview',
  isProduction: currentEnvironment === 'production',
  isDevelopment: currentEnvironment === 'development',
};
```

## Preview Environment Indicators

Show users they are on a preview deployment to avoid confusion:

```jsx
// src/components/PreviewBanner.jsx

import React from 'react';
import config from '../config';

const PreviewBanner = () => {
  if (!config.isPreview) return null;

  const prNumber = process.env.REACT_APP_PR_NUMBER;
  const commitSha = process.env.REACT_APP_COMMIT_SHA?.substring(0, 7);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#f59e0b',
      color: '#000',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 500,
      zIndex: 9999,
    }}>
      Preview Environment
      {prNumber && ` | PR #${prNumber}`}
      {commitSha && ` | ${commitSha}`}
      <a
        href={`https://github.com/your-org/your-repo/pull/${prNumber}`}
        style={{ marginLeft: '16px', color: '#000', textDecoration: 'underline' }}
        target="_blank"
        rel="noopener noreferrer"
      >
        View PR
      </a>
    </div>
  );
};

export default PreviewBanner;
```

```jsx
// src/App.jsx

import React from 'react';
import PreviewBanner from './components/PreviewBanner';

function App() {
  return (
    <>
      <PreviewBanner />
      {/* Rest of your app */}
    </>
  );
}

export default App;
```

## Testing Preview Deployments

Integrate visual regression testing with your preview deployments:

```yaml
# .github/workflows/visual-tests.yml

name: Visual Regression Tests

on:
  deployment_status:

jobs:
  visual-tests:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Percy visual tests
        run: npx percy exec -- npm run test:e2e
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
          TEST_URL: ${{ github.event.deployment_status.target_url }}

      - name: Run Lighthouse audit
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            ${{ github.event.deployment_status.target_url }}
          uploadArtifacts: true
          temporaryPublicStorage: true
```

## Monitoring Preview Deployments

Track preview deployment health and usage with OneUptime:

```javascript
// src/utils/monitoring.js

import config from '../config';

export const initializeMonitoring = () => {
  if (!config.isPreview) return;

  // Track preview deployment initialization
  fetch('https://oneuptime.example.com/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'preview_deployment_loaded',
      properties: {
        prNumber: process.env.REACT_APP_PR_NUMBER,
        commitSha: process.env.REACT_APP_COMMIT_SHA,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    }),
  }).catch(() => {
    // Silently fail - monitoring should not break the app
  });
};

export const trackPreviewInteraction = (action, metadata = {}) => {
  if (!config.isPreview) return;

  fetch('https://oneuptime.example.com/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'preview_interaction',
      properties: {
        action,
        prNumber: process.env.REACT_APP_PR_NUMBER,
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    }),
  }).catch(() => {});
};
```

## Security Considerations

Preview deployments can expose sensitive data if not configured properly:

### 1. Authentication for Previews

```yaml
# vercel.json - Password protection
{
  "password": {
    "protection": "deployments"
  }
}
```

### 2. Sanitize Environment Variables

Never expose production secrets in previews:

```yaml
# GitHub Actions - Use separate secrets for previews
env:
  # Use preview-specific API keys with limited permissions
  REACT_APP_API_KEY: ${{ secrets.PREVIEW_API_KEY }}
  # Never use production database connections
  REACT_APP_DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
```

### 3. Block Search Engine Indexing

```javascript
// public/robots.txt (generated dynamically or via build)
// For preview environments:
User-agent: *
Disallow: /
```

Or via meta tag:

```jsx
// src/components/SEO.jsx

import { Helmet } from 'react-helmet';
import config from '../config';

const SEO = ({ title, description }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    {config.isPreview && <meta name="robots" content="noindex, nofollow" />}
  </Helmet>
);
```

### 4. Rate Limiting for Previews

```javascript
// netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex"

[[edge_functions]]
  path = "/*"
  function = "rate-limit"
```

## Troubleshooting Common Issues

### Build Failures

```yaml
# Debug build issues by preserving artifacts
- name: Upload build artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: build-debug
    path: |
      build/
      node_modules/.cache/
      npm-debug.log
```

### Environment Variable Issues

```jsx
// src/debug/EnvCheck.jsx - Add to preview builds only

import React from 'react';
import config from '../config';

const EnvCheck = () => {
  if (!config.isPreview) return null;

  return (
    <details style={{ position: 'fixed', bottom: 10, right: 10, background: '#fff', padding: 10 }}>
      <summary>Env Debug</summary>
      <pre>
        {JSON.stringify({
          NODE_ENV: process.env.NODE_ENV,
          REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
          REACT_APP_API_URL: process.env.REACT_APP_API_URL,
          config: config,
        }, null, 2)}
      </pre>
    </details>
  );
};

export default EnvCheck;
```

### Cache Invalidation

```yaml
# Force fresh builds when needed
- name: Clear npm cache
  run: npm cache clean --force

- name: Install with no cache
  run: npm ci --prefer-offline=false
```

## Cost Optimization

Preview deployments can generate costs. Here are strategies to minimize them:

### 1. Auto-Cleanup Stale Previews

```yaml
# .github/workflows/cleanup-stale.yml

name: Cleanup Stale Previews

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Find and close stale PRs previews
        uses: actions/github-script@v7
        with:
          script: |
            const { data: prs } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
            });

            const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
            const now = Date.now();

            for (const pr of prs) {
              const lastUpdate = new Date(pr.updated_at).getTime();
              if (now - lastUpdate > staleThreshold) {
                console.log(`Stale PR #${pr.number}: ${pr.title}`);
                // Trigger cleanup workflow or add label
              }
            }
```

### 2. Limit Concurrent Previews

```yaml
# Only deploy previews for certain branches or labels
jobs:
  should-deploy:
    runs-on: ubuntu-latest
    outputs:
      deploy: ${{ steps.check.outputs.deploy }}
    steps:
      - id: check
        run: |
          # Only deploy if PR has 'preview' label or targets main
          if [[ "${{ contains(github.event.pull_request.labels.*.name, 'preview') }}" == "true" ]] || \
             [[ "${{ github.event.pull_request.base.ref }}" == "main" ]]; then
            echo "deploy=true" >> $GITHUB_OUTPUT
          else
            echo "deploy=false" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: should-deploy
    if: needs.should-deploy.outputs.deploy == 'true'
    runs-on: ubuntu-latest
    steps:
      # ... deployment steps
```

### 3. Use Spot Instances for Kubernetes Previews

```yaml
# k8s/preview/deployment.yaml
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - key: "kubernetes.azure.com/scalesetpriority"
          operator: "Equal"
          value: "spot"
          effect: "NoSchedule"
```

## Summary Table

| Platform | Setup Complexity | Cost | Best For |
|----------|-----------------|------|----------|
| **Vercel** | Minimal (auto-detect) | Free tier generous; scales with usage | Next.js, CRA, Vite projects; teams wanting zero config |
| **Netlify** | Minimal (auto-detect) | Free tier generous; branch deploys included | JAMstack; teams needing edge functions |
| **GitHub Actions + S3** | Moderate | Pay for storage and bandwidth | Custom domains; AWS-heavy infrastructure |
| **GitHub Actions + Surge** | Low | Free for public; simple static hosting | Quick prototypes; open source projects |
| **GitHub Actions + Kubernetes** | High | Cluster costs; most control | Full-stack previews; complex backends |

### Feature Comparison

| Feature | Vercel | Netlify | Custom (S3) | Custom (K8s) |
|---------|--------|---------|-------------|--------------|
| Zero config for React | Yes | Yes | No | No |
| Custom domains | Yes | Yes | Yes | Yes |
| Password protection | Yes (Pro) | Yes (Pro) | Manual | Manual |
| Environment variables | Built-in UI | Built-in UI | Secrets | Secrets |
| Edge functions | Yes | Yes | CloudFront | Ingress |
| Backend services | Serverless only | Serverless only | No | Yes |
| Build minutes (free) | 6000/month | 300/month | 2000/month | N/A |
| Concurrent builds | 1 (free) | 1 (free) | Unlimited | Unlimited |
| Auto-cleanup | Yes | Yes | Manual | Manual |
| Visual regression | Third-party | Third-party | Third-party | Third-party |

### Decision Guide

Choose **Vercel** if:
- You use Next.js or want the smoothest React experience
- You need serverless functions alongside your frontend
- Developer experience is a priority

Choose **Netlify** if:
- You have a JAMstack architecture
- You need advanced redirect/proxy rules
- You want tight CMS integration

Choose **Custom GitHub Actions** if:
- You need full control over infrastructure
- You have existing AWS/GCP/Azure investments
- You need to deploy backend services alongside frontend
- Compliance requires specific hosting locations

---

Preview deployments eliminate the gap between code review and reality. Whether you choose a managed platform or build your own, the investment pays dividends in faster reviews, fewer production bugs, and happier stakeholders who can see changes before they ship.

Start with Vercel or Netlify for instant results, then consider custom solutions as your needs grow. The key is getting that first preview URL into your PR workflow and watching your team never go back.
