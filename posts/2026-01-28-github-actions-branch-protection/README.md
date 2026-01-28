# How to Implement GitHub Actions Branch Protection Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Branch Protection, CI/CD, Security, DevOps

Description: Learn how to enforce branch protection with GitHub Actions, required checks, and merge policies to keep your main branch safe.

---

Branch protection rules turn CI into a gatekeeper. When configured correctly, pull requests cannot merge unless the required GitHub Actions workflows pass. This guide shows the common setup and best practices.

## Step 1: Ensure Your Workflow Has a Stable Name

The name of the workflow job is what you will require in branch protection settings.

```yaml
name: CI

on:
  pull_request:
    branches: ["main"]

jobs:
  test:
    name: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

Here, the check name is `unit-tests`.

## Step 2: Configure Branch Protection

In GitHub:

1. Go to **Settings → Branches**
2. Add a rule for `main`
3. Enable **Require status checks to pass**
4. Select the checks you want, for example `unit-tests`

Now merges are blocked until these checks pass.

## Step 3: Require PR Reviews

Enable:

- Require pull request reviews
- Dismiss stale approvals when new commits are pushed
- Require code owner reviews (optional)

This ensures human approval plus automated checks.

## Step 4: Enforce Linear History (Optional)

If you want a clean history, enable **Require linear history**. This blocks merge commits and forces rebase or squash.

## Step 5: Protect Against Admin Bypass

Enable **Do not allow bypassing the above settings** if you want admins to follow the same rules.

## Common Pitfalls

- Workflow name changes can break required checks.
- Skipped jobs can fail required status checks.
- Checks must run on `pull_request`, not only on `push`.

## Best Practices

- Keep required checks minimal and fast.
- Add separate workflows for long-running jobs.
- Use `concurrency` to cancel stale runs and reduce queue time.

## Conclusion

Branch protection rules make GitHub Actions a reliable gate for production code. Set required checks, enforce reviews, and prevent bypasses to keep your main branch safe and stable.
