# How to Configure GitLab CI Caching Strategies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, CI/CD, Caching, Performance, DevOps

Description: Learn how to use GitLab CI cache effectively with keying strategies, fallback keys, and best practices to speed up pipelines.

---

Caching in GitLab CI speeds up builds by reusing dependencies and build artifacts. The key is choosing stable cache keys and scoping caches correctly. This guide covers common patterns.

## Cache vs Artifacts

- **Cache**: Reusable between jobs and pipelines.
- **Artifacts**: Passed from job to job within the same pipeline.

Use cache for dependencies, artifacts for build outputs.

## Basic Cache Example

```yaml
cache:
  key: "npm-${CI_COMMIT_REF_SLUG}"
  paths:
    - node_modules/

build:
  stage: build
  script:
    - npm ci
    - npm run build
```

## Use Fallback Keys

Fallback keys help reuse cache across branches.

```yaml
cache:
  key:
    files:
      - package-lock.json
    prefix: npm
  paths:
    - ~/.npm
  policy: pull-push
```

## Split Caches by Job Type

Separate caches prevent collisions:

```yaml
cache:
  key: "lint-${CI_COMMIT_REF_SLUG}"
  paths:
    - .eslintcache
```

## Avoid Caching Large Build Outputs

Caching large build directories can slow down pipelines. Cache only dependencies or package manager folders.

## Best Practices

- Cache per package manager: npm, pip, maven, gradle.
- Use `policy: pull-push` to keep caches fresh.
- Invalidate cache when lock files change.

## Conclusion

A good caching strategy can cut minutes off every pipeline. Use stable keys, avoid oversized caches, and treat artifacts and cache as separate tools.
