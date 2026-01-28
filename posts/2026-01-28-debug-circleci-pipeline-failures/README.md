# How to Debug CircleCI Pipeline Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, Debugging, CI/CD, Troubleshooting, DevOps

Description: Learn how to diagnose CircleCI pipeline failures using logs, SSH reruns, artifacts, and local reproduction.

---

When a CircleCI pipeline fails, the fastest fix comes from reproducing the issue and narrowing the failure. This guide provides a reliable checklist.

## Step 1: Read the Job Logs

Check the full log output, especially the last steps before the failure.

## Step 2: Rerun with SSH

CircleCI lets you rerun a job with SSH access. This is the fastest way to explore the environment.

## Step 3: Save Artifacts

Capture logs and test results for inspection:

```yaml
- store_artifacts:
    path: test-results
```

## Step 4: Check Caches

A corrupted cache can break builds. Clear or change the cache key if you suspect it.

## Step 5: Reproduce Locally

Use the same Docker image or macOS executor locally to reproduce.

## Best Practices

- Pin versions of runtime tools
- Separate flaky tests from stable ones
- Add retries only where needed

## Conclusion

CircleCI failures are easier to debug with logs, SSH reruns, and artifacts. Build a repeatable process and keep CI stable.
