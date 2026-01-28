# How to Implement GitLab CI Multi-Project Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, CI/CD, Multi-Project, Automation, DevOps

Description: Learn how to trigger pipelines across multiple GitLab projects, pass variables, and coordinate releases safely.

---

Multi-project pipelines let one repository trigger workflows in another. This is common for platform teams, shared libraries, and deploy pipelines.

## When to Use Multi-Project Pipelines

- A shared library repo triggers downstream app builds
- A platform repo triggers infrastructure deployments
- A release repo orchestrates multiple services

## Trigger a Downstream Pipeline

Use the `trigger` keyword with a project path:

```yaml
stages:
  - deploy

trigger-api:
  stage: deploy
  trigger:
    project: my-group/api-service
    branch: main
    strategy: depend
```

`strategy: depend` waits for the downstream pipeline to finish.

## Pass Variables to the Downstream Pipeline

```yaml
trigger-api:
  stage: deploy
  trigger:
    project: my-group/api-service
    branch: main
    strategy: depend
  variables:
    RELEASE_VERSION: "${CI_COMMIT_TAG}"
```

## Use Trigger Tokens

If the downstream project is private, create a trigger token and store it in CI variables.

```yaml
trigger-api:
  stage: deploy
  script:
    - curl -X POST -F token=$TRIGGER_TOKEN -F ref=main https://gitlab.example.com/api/v4/projects/123/trigger/pipeline
```

## Best Practices

- Keep downstream pipelines stable and well tested.
- Use `strategy: depend` for coordinated releases.
- Use tags or release branches for production deploys.

## Conclusion

Multi-project pipelines are powerful for orchestrating complex systems. Use triggers with variables and strict branch policies to keep releases safe and predictable.
