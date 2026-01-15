# How to Implement CI/CD Pipelines for React with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, GitHub Actions, CI/CD, DevOps, Automation, Deployment

Description: A comprehensive guide to building production-ready CI/CD pipelines for React applications using GitHub Actions, covering testing, building, caching, and multi-environment deployments.

---

Modern React applications demand automated pipelines that catch bugs early, enforce code quality, and deploy seamlessly. GitHub Actions provides a powerful, integrated solution that lives right next to your code. This guide walks through building a complete CI/CD pipeline from scratch.

## Why GitHub Actions for React?

GitHub Actions offers several advantages for React projects:

- **Native integration**: No external CI service configuration needed
- **Free tier**: 2,000 minutes/month for public repositories
- **Marketplace**: Pre-built actions for common tasks
- **Matrix builds**: Test across Node versions simultaneously
- **Caching**: Speed up builds with dependency caching
- **Environments**: Built-in deployment protection rules

## Project Structure

Before diving into workflows, here's the recommended structure:

```
your-react-app/
  .github/
    workflows/
      ci.yml              # Runs on every PR
      cd-staging.yml      # Deploy to staging
      cd-production.yml   # Deploy to production
      codeql.yml          # Security scanning
  src/
  public/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

## Part 1: Continuous Integration Pipeline

The CI pipeline runs on every pull request and push to main. It validates code quality before merging.

### Basic CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Cancel in-progress runs when a new commit is pushed
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      # Checkout repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Set up Node.js environment
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Install dependencies using clean install
      - name: Install dependencies
        run: npm ci

      # Run ESLint to check code style
      - name: Run ESLint
        run: npm run lint

      # Check TypeScript types without emitting files
      - name: Type check
        run: npx tsc --noEmit

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run unit and integration tests with coverage
      - name: Run tests
        run: npm run test -- --coverage --watchAll=false

      # Upload coverage reports for analysis
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, test]  # Only build if lint and test pass
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Build the production bundle
      - name: Build
        run: npm run build

      # Upload build artifacts for deployment jobs
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 7
```

### Understanding Each Step

**Checkout**: The `actions/checkout@v4` action clones your repository into the runner.

**Node Setup**: `actions/setup-node@v4` installs Node.js and configures npm caching automatically when you specify `cache: 'npm'`.

**Install Dependencies**: `npm ci` is preferred over `npm install` because:
- It's faster for clean installs
- It ensures exact versions from `package-lock.json`
- It fails if the lockfile is out of sync

**Concurrency**: The concurrency block prevents wasted resources by canceling older runs when new commits arrive.

## Part 2: Advanced Testing Strategies

### Matrix Testing Across Node Versions

Test compatibility across multiple Node.js versions:

```yaml
  test-matrix:
    name: Test Node ${{ matrix.node-version }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false  # Continue testing other versions if one fails
      matrix:
        node-version: ['18', '20', '22']
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -- --watchAll=false
```

### End-to-End Testing with Playwright

Add E2E tests to catch integration issues:

```yaml
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Install Playwright browsers (cached)
      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      # Download the build artifacts from previous job
      - name: Download build
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      # Start preview server and run E2E tests
      - name: Run E2E tests
        run: |
          npm run preview &
          sleep 5
          npx playwright test --project=chromium

      # Upload test results on failure
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Visual Regression Testing

Catch unintended visual changes:

```yaml
  visual:
    name: Visual Regression
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      # Run Storybook visual tests
      - name: Visual tests
        run: |
          npm run build-storybook
          npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }} --exit-once-uploaded
```

## Part 3: Optimizing Build Performance

### Aggressive Dependency Caching

Speed up installs with better caching:

```yaml
  build-optimized:
    name: Optimized Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Cache node_modules based on lockfile hash
      - name: Cache node_modules
        id: cache-modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-modules-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-modules-

      # Only install if cache miss
      - name: Install dependencies
        if: steps.cache-modules.outputs.cache-hit != 'true'
        run: npm ci

      # Cache Vite build artifacts
      - name: Cache Vite
        uses: actions/cache@v4
        with:
          path: node_modules/.vite
          key: ${{ runner.os }}-vite-${{ hashFiles('src/**', 'vite.config.ts') }}

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
```

### Turbo Repo Integration

For monorepos, leverage Turborepo caching:

```yaml
  build-turbo:
    name: Turbo Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Remote caching with Turbo
      - name: Setup Turbo cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: npm ci

      # Build with Turbo's intelligent caching
      - name: Build with Turbo
        run: npx turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

## Part 4: Deployment Workflows

### Staging Deployment

Create `.github/workflows/cd-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:  # Allow manual triggers

env:
  AWS_REGION: us-east-1
  S3_BUCKET: my-app-staging

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.myapp.com
    permissions:
      id-token: write   # Required for OIDC
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Build with staging environment variables
      - name: Build for staging
        run: npm run build
        env:
          VITE_API_URL: https://api-staging.myapp.com
          VITE_ENV: staging

      # Configure AWS credentials using OIDC (no long-lived secrets)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-staging
          aws-region: ${{ env.AWS_REGION }}

      # Sync build output to S3
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://${{ env.S3_BUCKET }} \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "*.json"

          # Upload HTML and JSON with shorter cache
          aws s3 cp dist/index.html s3://${{ env.S3_BUCKET }}/index.html \
            --cache-control "public, max-age=0, must-revalidate"

      # Invalidate CloudFront cache
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_STAGING }} \
            --paths "/*"

      # Notify deployment tracking
      - name: Notify OneUptime
        if: always()
        run: |
          curl -X POST ${{ secrets.ONEUPTIME_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "environment": "staging",
              "status": "${{ job.status }}",
              "commit": "${{ github.sha }}",
              "branch": "${{ github.ref_name }}"
            }'
```

### Production Deployment

Create `.github/workflows/cd-production.yml`:

```yaml
name: Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
        type: string

env:
  AWS_REGION: us-east-1
  S3_BUCKET: my-app-production

jobs:
  # Run full test suite before production deploy
  pre-deploy-checks:
    name: Pre-deployment Checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm run test -- --watchAll=false

      - name: Run E2E tests
        run: |
          npx playwright install --with-deps chromium
          npm run build
          npm run preview &
          sleep 5
          npx playwright test

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: pre-deploy-checks
    environment:
      name: production
      url: https://myapp.com
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Build with production environment
      - name: Build for production
        run: npm run build
        env:
          VITE_API_URL: https://api.myapp.com
          VITE_ENV: production
          NODE_ENV: production

      # Generate build info for tracking
      - name: Generate build manifest
        run: |
          echo '{
            "version": "${{ github.event.release.tag_name || inputs.version }}",
            "commit": "${{ github.sha }}",
            "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
          }' > dist/build-info.json

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-production
          aws-region: ${{ env.AWS_REGION }}

      # Deploy with zero-downtime strategy
      - name: Deploy to S3
        run: |
          # Upload new assets first (immutable, long cache)
          aws s3 sync dist/assets/ s3://${{ env.S3_BUCKET }}/assets/ \
            --cache-control "public, max-age=31536000, immutable"

          # Then update HTML (triggers new version)
          aws s3 cp dist/index.html s3://${{ env.S3_BUCKET }}/index.html \
            --cache-control "public, max-age=0, must-revalidate"

          # Upload remaining files
          aws s3 sync dist/ s3://${{ env.S3_BUCKET }} \
            --delete \
            --exclude "assets/*" \
            --exclude "index.html"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_PROD }} \
            --paths "/index.html" "/build-info.json"

      # Create deployment record
      - name: Record deployment
        run: |
          curl -X POST ${{ secrets.ONEUPTIME_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "environment": "production",
              "version": "${{ github.event.release.tag_name || inputs.version }}",
              "commit": "${{ github.sha }}",
              "status": "success"
            }'

  # Automated smoke tests after deployment
  post-deploy-validation:
    name: Post-deployment Validation
    runs-on: ubuntu-latest
    needs: deploy-production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Run smoke tests against production
      - name: Run smoke tests
        run: |
          npx playwright install --with-deps chromium
          npx playwright test tests/smoke/ --project=chromium
        env:
          BASE_URL: https://myapp.com

      # Health check
      - name: Verify deployment
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://myapp.com)
          if [ "$response" != "200" ]; then
            echo "Health check failed with status: $response"
            exit 1
          fi
          echo "Health check passed"
```

## Part 5: Alternative Deployment Targets

### Deploying to Vercel

```yaml
  deploy-vercel:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Vercel handles build internally
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Deploying to Netlify

```yaml
  deploy-netlify:
    name: Deploy to Netlify
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Deploying to GitHub Pages

```yaml
  deploy-pages:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          BASE_URL: /my-react-app/

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Deploying Docker to Container Registry

```yaml
  deploy-docker:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Part 6: Security Scanning

### CodeQL Analysis

Create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly scan on Monday

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript-typescript"
```

### Dependency Scanning

```yaml
  dependency-audit:
    name: Audit Dependencies
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Run npm audit for known vulnerabilities
      - name: Security audit
        run: npm audit --audit-level=high

      # Check for outdated packages
      - name: Check outdated
        run: npm outdated || true
```

### License Compliance

```yaml
  license-check:
    name: License Compliance
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Check licenses of all dependencies
      - name: Check licenses
        run: npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD"
```

## Part 7: Notifications and Monitoring

### Slack Notifications

```yaml
  notify:
    name: Send Notifications
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: always()
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status*: ${{ needs.deploy-production.result }}\n*Environment*: Production\n*Version*: ${{ github.event.release.tag_name }}\n*Commit*: `${{ github.sha }}`"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

### GitHub Deployment Status

```yaml
  update-deployment:
    name: Update Deployment Status
    runs-on: ubuntu-latest
    needs: [deploy-production, post-deploy-validation]
    if: always()
    steps:
      - name: Create deployment status
        uses: actions/github-script@v7
        with:
          script: |
            const success = '${{ needs.post-deploy-validation.result }}' === 'success';
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: context.payload.deployment?.id || 0,
              state: success ? 'success' : 'failure',
              environment_url: 'https://myapp.com',
              description: success ? 'Deployment successful' : 'Deployment failed'
            });
```

## Part 8: Reusable Workflows

### Creating a Reusable CI Workflow

Create `.github/workflows/reusable-ci.yml`:

```yaml
name: Reusable CI

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '20'
      skip-tests:
        required: false
        type: boolean
        default: false
    secrets:
      npm-token:
        required: false

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          registry-url: 'https://npm.pkg.github.com'

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.npm-token }}

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        if: ${{ !inputs.skip-tests }}
        run: npm run test -- --watchAll=false

      - name: Build
        run: npm run build
```

### Using the Reusable Workflow

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: ./.github/workflows/reusable-ci.yml
    with:
      node-version: '20'
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

## Part 9: Environment Variables and Secrets

### Managing Environment-Specific Configuration

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Load environment-specific variables
      - name: Build for ${{ matrix.environment }}
        run: npm run build
        env:
          VITE_API_URL: ${{ matrix.environment == 'production' && 'https://api.myapp.com' || 'https://api-staging.myapp.com' }}
          VITE_ENV: ${{ matrix.environment }}
          VITE_SENTRY_DSN: ${{ secrets[format('SENTRY_DSN_{0}', matrix.environment)] }}

      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.environment }}
          path: dist/
```

### Using GitHub Environments

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      # Environment secrets are automatically scoped
      - name: Deploy
        run: |
          echo "Deploying to ${{ vars.DEPLOY_URL }}"
          # ${{ secrets.AWS_ACCESS_KEY }} is environment-specific
```

## Part 10: Rollback Strategy

### Automated Rollback on Failure

```yaml
  rollback:
    name: Rollback on Failure
    runs-on: ubuntu-latest
    needs: [deploy-production, post-deploy-validation]
    if: failure()
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-production
          aws-region: us-east-1

      # Restore previous version from S3 versioning
      - name: Rollback to previous version
        run: |
          # Get previous version ID of index.html
          PREV_VERSION=$(aws s3api list-object-versions \
            --bucket ${{ env.S3_BUCKET }} \
            --prefix index.html \
            --query 'Versions[1].VersionId' \
            --output text)

          # Copy previous version as current
          aws s3api copy-object \
            --bucket ${{ env.S3_BUCKET }} \
            --copy-source "${{ env.S3_BUCKET }}/index.html?versionId=$PREV_VERSION" \
            --key index.html

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_PROD }} \
            --paths "/*"

      - name: Notify rollback
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "text": "Production deployment failed. Automatic rollback initiated.",
              "attachments": [{
                "color": "danger",
                "fields": [
                  {"title": "Commit", "value": "${{ github.sha }}", "short": true},
                  {"title": "Branch", "value": "${{ github.ref_name }}", "short": true}
                ]
              }]
            }'
```

## Summary

Here is a complete reference of all workflow stages and their purposes:

| Stage | Trigger | Purpose | Key Actions |
|-------|---------|---------|-------------|
| **Lint** | PR, Push | Code quality validation | ESLint, TypeScript check |
| **Test** | PR, Push | Unit and integration tests | Jest/Vitest, coverage upload |
| **Build** | PR, Push | Compile production bundle | Vite build, artifact upload |
| **E2E Test** | PR, Push | End-to-end validation | Playwright, browser tests |
| **Security Scan** | PR, Push, Schedule | Vulnerability detection | CodeQL, npm audit |
| **Deploy Staging** | Push to develop | Preview deployment | S3 sync, CloudFront invalidation |
| **Deploy Production** | Release published | Production deployment | Zero-downtime deploy, smoke tests |
| **Post-deploy Validation** | After production deploy | Verify deployment | Health checks, smoke tests |
| **Rollback** | On deploy failure | Automatic recovery | S3 version restore, notification |
| **Notify** | After deploy | Team communication | Slack, OneUptime webhooks |

### Best Practices Checklist

1. **Always use `npm ci`** instead of `npm install` for reproducible builds
2. **Cache aggressively** - node_modules, Vite cache, Playwright browsers
3. **Use matrix builds** for testing across Node versions
4. **Implement concurrency control** to cancel stale runs
5. **Separate CI from CD** - validation vs deployment workflows
6. **Use environments** for deployment protection rules
7. **Implement automated rollback** for production safety
8. **Add monitoring hooks** to track deployment health
9. **Scan for vulnerabilities** with CodeQL and npm audit
10. **Use OIDC for AWS** instead of long-lived credentials

### Performance Optimization Tips

- Enable `setup-node` caching with `cache: 'npm'`
- Use `actions/cache` for build artifacts
- Parallelize independent jobs
- Use `fail-fast: false` for matrix builds when debugging
- Consider self-hosted runners for frequent builds

With this comprehensive CI/CD setup, your React application will have automated quality gates, secure deployments, and reliable rollback capabilities. The pipeline catches issues early, deploys consistently, and keeps your team informed every step of the way.
