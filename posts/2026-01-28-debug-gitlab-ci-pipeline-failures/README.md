# How to Debug GitLab CI Pipeline Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Debugging, CI/CD, Troubleshooting, DevOps

Description: Learn how to diagnose and fix GitLab CI pipeline failures using logs, artifacts, retries, and local reproduction techniques.

---

CI failures happen for many reasons: flaky tests, missing dependencies, or environment mismatches. This guide provides a structured approach to debugging GitLab CI pipelines.

## Step 1: Read the Job Logs First

Check the full log output. Most failures are in the last 20 lines.

## Step 2: Reproduce Locally

Run the same commands locally or in a container with the same image.

```bash
docker run --rm -it node:20 bash
```

## Step 3: Use Debug Traces

Enable debug logging in the job:

```yaml
variables:
  CI_DEBUG_TRACE: "true"
```

This prints every shell command and helps locate hidden errors.

## Step 4: Keep Artifacts for Investigation

Store logs or test output as artifacts:

```yaml
artifacts:
  when: always
  paths:
    - test-results/
```

## Step 5: Add Retries for Flaky Jobs

```yaml
retry: 2
```

Use retries only for known flaky tests.

## Step 6: Check Runner Issues

If jobs fail with executor or network errors, inspect runners:

- Disk full
- Missing docker socket
- Network egress blocked

## Best Practices

- Pin Docker image versions.
- Keep the pipeline environment close to production.
- Separate slow integration tests from unit tests.

## Conclusion

Debugging GitLab CI is easier when you follow a clear checklist. Focus on logs, reproducibility, and runner stability to fix failures quickly.
