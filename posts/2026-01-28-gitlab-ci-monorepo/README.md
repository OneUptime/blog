# How to Use GitLab CI for Monorepo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Monorepo, CI/CD, Automation, DevOps

Description: Learn how to structure GitLab CI for monorepos using rules, path filters, and child pipelines to reduce build time.

---

Monorepos can trigger too many jobs if you treat every change the same. GitLab CI offers rules, path filters, and child pipelines to scope builds to just what changed.

## Use Rules with Changes

Run jobs only when relevant paths change:

```yaml
backend-tests:
  stage: test
  rules:
    - changes:
        - services/backend/**
  script:
    - cd services/backend
    - npm ci
    - npm test
```

## Split into Child Pipelines

Use parent-child pipelines to keep CI modular.

```yaml
trigger-backend:
  stage: test
  trigger:
    include: .gitlab/backend.yml
    strategy: depend
  rules:
    - changes:
        - services/backend/**
```

## Use a Matrix for Similar Services

For multiple services, use a matrix but keep it scoped with rules.

## Cache Per Workspace

Use separate cache keys per service to avoid collisions.

```yaml
cache:
  key: "backend-${CI_COMMIT_REF_SLUG}"
  paths:
    - services/backend/node_modules/
```

## Best Practices

- Use path-based rules in most jobs.
- Keep shared jobs minimal and fast.
- Add a top-level pipeline only for release workflows.

## Conclusion

GitLab CI scales to monorepos if you scope jobs by path and use child pipelines. That keeps pipelines fast, readable, and cost-efficient.
