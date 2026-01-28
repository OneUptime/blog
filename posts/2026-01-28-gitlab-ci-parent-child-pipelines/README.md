# How to Use GitLab CI Parent-Child Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, CI/CD, Pipelines, Automation, DevOps

Description: Learn how to structure GitLab CI parent-child pipelines for modular builds, parallel stages, and reusable pipeline templates.

---

Parent-child pipelines let you split a large CI configuration into smaller, focused pipelines. This is ideal for monorepos, complex deploy flows, and reusable templates.

## Why Use Parent-Child Pipelines

- Reduce a single huge `.gitlab-ci.yml`
- Run sub-pipelines in parallel
- Enable reusable and scoped pipeline logic

## Basic Parent Pipeline

The parent pipeline triggers a child pipeline using `trigger`:

```yaml
stages:
  - build
  - deploy

trigger-child:
  stage: build
  trigger:
    include: .gitlab/child-pipeline.yml
    strategy: depend
```

`strategy: depend` makes the parent wait for the child and collect results.

## Child Pipeline Example

```yaml
# .gitlab/child-pipeline.yml
stages:
  - test
  - package

unit-tests:
  stage: test
  script:
    - npm ci
    - npm test

build-image:
  stage: package
  script:
    - docker build -t my-app:${CI_COMMIT_SHA} .
```

## Passing Variables

You can pass variables from parent to child:

```yaml
trigger-child:
  stage: build
  trigger:
    include: .gitlab/child-pipeline.yml
    strategy: depend
  variables:
    ENVIRONMENT: "staging"
```

## Best Practices

- Keep child pipelines focused and reusable.
- Use `include` for shared job templates.
- Use `strategy: depend` for coordinated execution.

## Conclusion

Parent-child pipelines make GitLab CI more maintainable and scalable. Start by moving large job blocks into child pipelines and keep your main pipeline minimal.
