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
    strategy: mirror
```

`strategy: mirror` waits for the downstream pipeline to finish and mirrors its status.

## Pass Variables to the Downstream Pipeline

```yaml
trigger-api:
  stage: deploy
  trigger:
    project: my-group/api-service
    branch: main
    strategy: mirror
  variables:
    RELEASE_VERSION: "${CI_COMMIT_TAG}"
```

## Use the API

To trigger a multi-project pipeline with the API, use `CI_JOB_TOKEN`. For private downstream projects, make sure the upstream project is allowed to use a job token with the downstream project.

```yaml
trigger-api:
  stage: deploy
  script:
    - curl --request POST --header "JOB-TOKEN: $CI_JOB_TOKEN" --form ref=main https://gitlab.example.com/api/v4/projects/123/trigger/pipeline
```

## Best Practices

- Keep downstream pipelines stable and well tested.
- Use `strategy: mirror` for coordinated releases.
- Use tags or release branches for production deploys.

## Conclusion

Multi-project pipelines are powerful for orchestrating complex systems. Use triggers with variables and strict branch policies to keep releases safe and predictable.
