# How to Implement GitLab CI Compliance Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Compliance, Security, CI/CD, DevOps

Description: Learn how to enforce compliance in GitLab CI using compliance pipelines, templates, and protected branches.

---

Compliance pipelines ensure required security checks run for projects that have a compliance framework applied. Compliance pipelines are deprecated in GitLab 17.3 and planned for removal in GitLab 19.0, so use pipeline execution policies for new implementations.

## What Is a Compliance Pipeline

GitLab compliance pipelines let group owners define a central pipeline configuration that applies to projects through a compliance framework. By default, the compliance pipeline configuration replaces the labeled project's `.gitlab-ci.yml`, though it can include the project configuration if you want both to run. It is useful for:

- Security scanning
- License checks
- Policy enforcement

## Step 1: Create a Compliance Pipeline Project

Create a dedicated project that contains a compliance `.gitlab-ci.yml` file with required jobs.

Example:

```yaml
stages:
  - security

sast:
  stage: security
  script:
    - echo "Run SAST"
```

## Step 2: Enable Compliance Pipelines

In GitLab:

1. Go to **Group → Secure → Compliance center → Frameworks**.
2. Create or edit a compliance framework.
3. Add the compliance pipeline configuration path in the `path/file.yml@group-name/project-name` format.
4. Apply the compliance framework to the target projects.

## Step 3: Use Protected Branches

Protect the target branches and enable **Pipelines must succeed** in the project's merge request settings. This prevents merging when required compliance checks fail.

## Best Practices

- Keep compliance pipelines fast and stable.
- Avoid blocking jobs that are flaky.
- Version the compliance pipeline project.

## Conclusion

Compliance pipelines help enforce security and policy checks across teams. Use them alongside branch protection and approvals for reliable governance.
