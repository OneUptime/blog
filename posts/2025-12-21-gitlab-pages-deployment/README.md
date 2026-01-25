# How to Set Up Pages Deployment in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, GitLab Pages, Static Sites, Deployment, CI/CD, Web Hosting

Description: Learn how to set up GitLab Pages deployment in your CI/CD pipeline. This guide covers static site deployment, custom domains, HTTPS configuration, and common static site generators.

> GitLab Pages provides free static website hosting directly from your repository, automatically deployed through your CI/CD pipeline.

GitLab Pages is a static site hosting service built into GitLab. It allows you to publish static websites directly from a repository. Combined with GitLab CI/CD, you can automatically build and deploy your site whenever you push changes.

## Understanding GitLab Pages

GitLab Pages serves static content from a special `public` directory created by a job named `pages` in your CI/CD pipeline.

```mermaid
flowchart LR
    A[Push Code] --> B[CI Pipeline]
    B --> C[Build Site]
    C --> D[pages job]
    D --> E[public/ artifact]
    E --> F[GitLab Pages Server]
    F --> G[username.gitlab.io/project]
```

## Basic Pages Configuration

The simplest Pages deployment requires a `pages` job that creates a `public` artifact.

```yaml
# .gitlab-ci.yml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r build/* public/
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

Key requirements: The job must be named exactly `pages`. The job must produce an artifact with a `public` directory. The `public` directory contains all files to be served.

## HTML Site Deployment

Deploy a simple HTML site.

```yaml
# Static HTML site
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r src/* public/
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## React/Vite Deployment

Deploy a React application built with Vite.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

pages:
  stage: deploy
  script:
    - mv dist public
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

Configure your `vite.config.js` for GitLab Pages.

```javascript
// vite.config.js
export default {
  base: '/project-name/', // Use your GitLab project name
  build: {
    outDir: 'dist'
  }
}
```

## Vue.js Deployment

Deploy a Vue.js application.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

pages:
  stage: deploy
  script:
    - mv dist public
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

```javascript
// vue.config.js
module.exports = {
  publicPath: process.env.CI_PAGES_URL ? '/project-name/' : '/'
}
```

## Next.js Static Export

Deploy a statically exported Next.js site.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - out/

pages:
  stage: deploy
  script:
    - mv out public
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

```javascript
// next.config.js
module.exports = {
  output: 'export',
  basePath: '/project-name',
  images: {
    unoptimized: true
  }
}
```

## Hugo Deployment

Deploy a Hugo static site.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: registry.gitlab.com/pages/hugo:latest
  script:
    - hugo --baseURL "https://username.gitlab.io/project-name/"
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  script:
    - echo "Deploying to GitLab Pages"
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Jekyll Deployment

Deploy a Jekyll site.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: ruby:3.2
  script:
    - gem install bundler
    - bundle install
    - bundle exec jekyll build -d public
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  script:
    - echo "Deploying Jekyll site"
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## MkDocs Documentation

Deploy MkDocs documentation.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: python:3.11
  script:
    - pip install mkdocs mkdocs-material
    - mkdocs build --site-dir public
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  script:
    - echo "Deploying MkDocs"
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Sphinx Documentation

Deploy Sphinx documentation.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: python:3.11
  script:
    - pip install sphinx sphinx-rtd-theme
    - cd docs && make html
    - mv _build/html ../public
  artifacts:
    paths:
      - public/

pages:
  stage: deploy
  script:
    - echo "Deploying Sphinx docs"
  artifacts:
    paths:
      - public
  needs:
    - build
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Custom Domain Configuration

Configure a custom domain for your GitLab Pages site.

First, deploy your site with the pages job. Then go to Settings > Pages in your project and add your custom domain.

Add DNS records for your domain.

```
# For apex domain (example.com)
Type: A
Name: @
Value: 35.185.44.232

# For subdomain (www.example.com)
Type: CNAME
Name: www
Value: username.gitlab.io
```

## HTTPS with Let's Encrypt

GitLab Pages automatically provisions Let's Encrypt certificates for custom domains.

```yaml
# No special CI configuration needed for HTTPS
# Enable in Settings > Pages > Force HTTPS
pages:
  stage: deploy
  script:
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Preview Deployments for Merge Requests

Deploy preview sites for merge requests.

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

# Main pages deployment
pages:
  stage: deploy
  script:
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

# MR preview deployment (uses review apps pattern)
pages_preview:
  stage: deploy
  script:
    - mkdir -p public
    - mv dist public/$CI_MERGE_REQUEST_IID
  artifacts:
    paths:
      - public
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://username.gitlab.io/project-name/$CI_MERGE_REQUEST_IID/
    on_stop: stop_preview
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

stop_preview:
  stage: deploy
  script:
    - echo "Preview stopped"
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: manual
```

## Single Page Application Routing

Configure SPA routing with a custom 404 page.

```yaml
# For SPAs, create a 404.html that redirects to index.html
pages:
  stage: deploy
  script:
    - mv dist public
    - cp public/index.html public/404.html
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Multiple Sites in One Repository

Deploy multiple sites from different directories.

```yaml
stages:
  - build
  - deploy

build_docs:
  stage: build
  script:
    - cd docs && npm run build
  artifacts:
    paths:
      - docs/dist/

build_app:
  stage: build
  script:
    - cd app && npm run build
  artifacts:
    paths:
      - app/dist/

pages:
  stage: deploy
  script:
    - mkdir -p public
    - mv app/dist/* public/
    - mv docs/dist public/docs/
  artifacts:
    paths:
      - public
  needs:
    - build_docs
    - build_app
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Complete Pages Pipeline

Here is a complete pipeline with testing, building, and deployment.

```yaml
stages:
  - install
  - test
  - build
  - deploy

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

install:
  stage: install
  image: node:20
  script:
    - npm ci
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - .npm/
  artifacts:
    paths:
      - node_modules/

lint:
  stage: test
  image: node:20
  script:
    - npm run lint
  needs:
    - install

test:
  stage: test
  image: node:20
  script:
    - npm test
  needs:
    - install

build:
  stage: build
  image: node:20
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
  needs:
    - install

# Deploy to GitLab Pages
pages:
  stage: deploy
  script:
    - mv dist public
    # Add headers for security
    - |
      cat > public/_headers << 'EOF'
      /*
        X-Frame-Options: DENY
        X-Content-Type-Options: nosniff
        Referrer-Policy: strict-origin-when-cross-origin
      EOF
  artifacts:
    paths:
      - public
  needs:
    - build
    - test
    - lint
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  environment:
    name: production
    url: https://username.gitlab.io/project-name/
```

## Accessing Pages URL in Jobs

Use the `CI_PAGES_URL` variable to reference your Pages URL.

```yaml
pages:
  stage: deploy
  script:
    - echo "Deploying to $CI_PAGES_URL"
    - mv dist public
  artifacts:
    paths:
      - public
```

## Best Practices

Always use the `main` or `master` branch rule to prevent accidental deployments from feature branches. Set appropriate cache headers for static assets. Use a build stage separate from the pages job for cleaner pipeline structure. Configure proper base URLs for frameworks to handle subpath deployment. Enable HTTPS and configure security headers. Consider using a CDN in front of GitLab Pages for high-traffic sites.

GitLab Pages provides a simple yet powerful way to host static sites directly from your repository. Combined with modern static site generators and CI/CD automation, you can maintain documentation, blogs, and web applications with minimal infrastructure overhead.
