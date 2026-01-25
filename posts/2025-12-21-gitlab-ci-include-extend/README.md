# How to Use Include/Extend in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Include, Extend, YAML, CI/CD, DRY, Configuration

Description: Learn how to use include and extend keywords in GitLab CI to create reusable, maintainable pipeline configurations. This guide covers local includes, remote templates, extends inheritance, and anchors.

> The include and extend keywords are the foundation of maintainable GitLab CI configurations, allowing you to share pipeline logic across projects and reduce duplication.

As your GitLab CI configuration grows, you will find yourself repeating the same job definitions, scripts, and configurations across multiple projects. The `include` and `extends` keywords solve this problem by enabling you to create reusable templates and share them across your organization.

## Understanding Include

The `include` keyword imports external YAML files into your pipeline configuration. This allows you to split large configurations into manageable pieces or share common templates across projects.

```mermaid
flowchart TD
    A[.gitlab-ci.yml] --> B[include: local]
    A --> C[include: project]
    A --> D[include: remote]
    A --> E[include: template]
    B --> F[/ci/build.yml]
    C --> G[Other Project Templates]
    D --> H[External URL Templates]
    E --> I[GitLab Templates]
```

## Local Includes

Include files from the same repository.

```yaml
# .gitlab-ci.yml
include:
  - local: '/ci/build.yml'
  - local: '/ci/test.yml'
  - local: '/ci/deploy.yml'

stages:
  - build
  - test
  - deploy
```

```yaml
# ci/build.yml
build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
```

```yaml
# ci/test.yml
unit_tests:
  stage: test
  script:
    - npm test

lint:
  stage: test
  script:
    - npm run lint
```

```yaml
# ci/deploy.yml
deploy_staging:
  stage: deploy
  script:
    - ./scripts/deploy.sh staging
  environment:
    name: staging

deploy_production:
  stage: deploy
  script:
    - ./scripts/deploy.sh production
  environment:
    name: production
  when: manual
```

## Project Includes

Include files from other GitLab projects. This is perfect for sharing templates across your organization.

```yaml
# .gitlab-ci.yml
include:
  - project: 'mygroup/ci-templates'
    ref: main
    file: '/templates/nodejs.yml'
  - project: 'mygroup/ci-templates'
    ref: v1.2.0
    file: '/templates/docker.yml'
  - project: 'mygroup/ci-templates'
    ref: main
    file:
      - '/templates/security.yml'
      - '/templates/deploy.yml'
```

Create a dedicated repository for your CI templates.

```yaml
# In mygroup/ci-templates repository
# templates/nodejs.yml
.nodejs_build:
  image: node:20
  before_script:
    - npm ci
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/

.nodejs_test:
  extends: .nodejs_build
  script:
    - npm test

.nodejs_lint:
  extends: .nodejs_build
  script:
    - npm run lint
```

## Remote Includes

Include files from any URL accessible by your GitLab instance.

```yaml
# .gitlab-ci.yml
include:
  - remote: 'https://example.com/ci-templates/nodejs.yml'
  - remote: 'https://raw.githubusercontent.com/myorg/templates/main/docker.yml'
```

## GitLab Template Includes

GitLab provides built-in templates for common use cases.

```yaml
# .gitlab-ci.yml
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Code-Quality.gitlab-ci.yml
  - template: Jobs/Build.gitlab-ci.yml
  - template: Jobs/Deploy.gitlab-ci.yml
```

## Understanding Extends

The `extends` keyword creates inheritance between jobs. A job that extends another inherits all its configuration and can override specific parts.

```yaml
# Base job template
.base_deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - ./scripts/deploy.sh $DEPLOY_ENV
  after_script:
    - ./scripts/notify.sh
  retry:
    max: 2
    when: runner_system_failure

# Staging inherits from base and sets DEPLOY_ENV
deploy_staging:
  extends: .base_deploy
  variables:
    DEPLOY_ENV: staging
  environment:
    name: staging
    url: https://staging.example.com

# Production inherits and adds manual trigger
deploy_production:
  extends: .base_deploy
  variables:
    DEPLOY_ENV: production
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
```

## Multiple Inheritance

Jobs can extend multiple templates. Later templates override earlier ones.

```yaml
# Base templates
.docker_job:
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375

.cached_job:
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - .cache/

.retry_job:
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure

# Job extends multiple templates
build_image:
  extends:
    - .docker_job
    - .cached_job
    - .retry_job
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Combining Include and Extend

The real power comes from combining include and extend to create organization-wide templates.

```yaml
# mygroup/ci-templates/templates/base.yml
.base_job:
  tags:
    - docker
  retry:
    max: 2
  interruptible: true

.nodejs_base:
  extends: .base_job
  image: node:20
  cache:
    key: $CI_COMMIT_REF_SLUG-node
    paths:
      - node_modules/
  before_script:
    - npm ci

.python_base:
  extends: .base_job
  image: python:3.11
  cache:
    key: $CI_COMMIT_REF_SLUG-python
    paths:
      - .venv/
  before_script:
    - python -m venv .venv
    - source .venv/bin/activate
    - pip install -r requirements.txt
```

```yaml
# Your project's .gitlab-ci.yml
include:
  - project: 'mygroup/ci-templates'
    ref: main
    file: '/templates/base.yml'

stages:
  - build
  - test
  - deploy

build:
  extends: .nodejs_base
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  extends: .nodejs_base
  stage: test
  script:
    - npm test

deploy:
  extends: .base_job
  stage: deploy
  image: alpine:latest
  script:
    - ./scripts/deploy.sh
```

## YAML Anchors and Aliases

YAML anchors provide another way to reduce duplication within a single file.

```yaml
# Define anchor with &
.default_scripts: &default_scripts
  before_script:
    - echo "Setting up environment"
  after_script:
    - echo "Cleaning up"

# Use anchor with *
build:
  <<: *default_scripts
  stage: build
  script:
    - npm run build

test:
  <<: *default_scripts
  stage: test
  script:
    - npm test

# Anchors for variables
.deploy_variables: &deploy_variables
  DEPLOY_TIMEOUT: "300"
  HEALTH_CHECK_PATH: "/health"

deploy_staging:
  variables:
    <<: *deploy_variables
    DEPLOY_ENV: staging
  script:
    - ./scripts/deploy.sh

deploy_production:
  variables:
    <<: *deploy_variables
    DEPLOY_ENV: production
  script:
    - ./scripts/deploy.sh
```

## Reference Keyword

The `!reference` tag allows you to reuse specific parts of other jobs.

```yaml
.setup:
  before_script:
    - echo "Installing dependencies"
    - npm ci
  after_script:
    - echo "Cleanup complete"

.security:
  script:
    - npm audit
    - npm run security-scan

build:
  stage: build
  before_script:
    - !reference [.setup, before_script]
  script:
    - npm run build

security_check:
  stage: test
  before_script:
    - !reference [.setup, before_script]
  script:
    - !reference [.security, script]
    - echo "Additional security checks"
```

## Complete Template Library Example

Here is a complete example of a reusable template library.

```yaml
# mygroup/ci-templates/templates/nodejs-pipeline.yml
variables:
  NODE_VERSION: "20"
  NPM_CACHE_DIR: "$CI_PROJECT_DIR/.npm"

.nodejs_cache:
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - $NPM_CACHE_DIR
      - node_modules/

.nodejs_build:
  extends: .nodejs_cache
  image: node:$NODE_VERSION
  before_script:
    - npm ci --cache $NPM_CACHE_DIR

.nodejs_test:
  extends: .nodejs_build
  script:
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

.nodejs_lint:
  extends: .nodejs_build
  script:
    - npm run lint

.nodejs_security:
  extends: .nodejs_build
  script:
    - npm audit --audit-level=high
  allow_failure: true

.nodejs_build_production:
  extends: .nodejs_build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
```

```yaml
# Your project's .gitlab-ci.yml
include:
  - project: 'mygroup/ci-templates'
    ref: v2.0.0
    file: '/templates/nodejs-pipeline.yml'

stages:
  - build
  - test
  - security
  - deploy

build:
  extends: .nodejs_build_production
  stage: build

test:
  extends: .nodejs_test
  stage: test

lint:
  extends: .nodejs_lint
  stage: test

security:
  extends: .nodejs_security
  stage: security

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - ./scripts/deploy.sh
  needs:
    - build
    - test
```

## Best Practices

Use project includes for organization-wide templates that need version control. Prefix hidden jobs with a dot to prevent them from running directly. Version your template repositories with tags for stable references. Document your templates with comments explaining usage. Use extends for job inheritance and anchors for simple value reuse. Keep template files focused on a single concern for better reusability.

The include and extend keywords transform GitLab CI from a project-level tool into an organization-wide platform. By investing in a good template library, you reduce duplication, enforce standards, and make it easier for teams to adopt CI/CD best practices.
