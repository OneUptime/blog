# How to Implement GitLab CI Compliance Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Compliance, Security, CI/CD, DevOps

Description: Learn how to enforce compliance in GitLab CI using compliance pipelines, templates, and protected branches.

---

Compliance pipelines ensure required security checks always run, even if teams customize their own `.gitlab-ci.yml`. This guide shows how to enforce them safely.

## What Is a Compliance Pipeline

GitLab compliance pipelines let administrators define a central pipeline that runs on selected projects. It is useful for:

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

1. Go to **Group → Security & Compliance → Compliance pipelines**
2. Select the compliance project
3. Choose the target projects or group

## Step 3: Use Protected Branches

Require pipelines to succeed before merging. This prevents bypassing compliance checks.

## Best Practices

- Keep compliance pipelines fast and stable.
- Avoid blocking jobs that are flaky.
- Version the compliance pipeline project.

## Conclusion

Compliance pipelines help enforce security and policy checks across teams. Use them alongside branch protection and approvals for reliable governance.
