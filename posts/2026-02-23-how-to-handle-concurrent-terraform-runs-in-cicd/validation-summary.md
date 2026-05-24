# Validation Summary: How to Handle Concurrent Terraform Runs in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.7.0)
- GitHub Actions (concurrency groups, `cancel-in-progress`)
- GitLab CI (`resource_group`)
- AWS (S3 backend, IAM role assumption via `aws-actions/configure-aws-credentials@v4`)
- Redis (Python `redis-py` client)
- Bash scripting
- Python 3 (`subprocess`, `json`)
- `dorny/paths-filter` GitHub Action
- `hashicorp/setup-terraform` GitHub Action

## Sources Consulted
- Terraform CLI docs — state locking and `-lock-timeout`: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform CLI docs — plan/apply commands: https://developer.hashicorp.com/terraform/cli/commands/plan and /apply
- GitHub Actions concurrency docs: https://docs.github.com/en/actions/using-jobs/using-concurrency
- GitLab CI `resource_group` docs: https://docs.gitlab.com/ee/ci/yaml/#resource_group
- `hashicorp/setup-terraform` GitHub Action (v3 is current)
- `actions/checkout` (v4 is current)
- `aws-actions/configure-aws-credentials` (v4 is current)
- `dorny/paths-filter` (v3 is current)
- redis-py docs: https://redis.readthedocs.io/en/stable/ (verified `set(..., nx=True, ex=...)` SETNX-with-expiry usage)

## Issues Found
- **Strategy 5 — Inaccurate lock terminology**: The original note stated "plans still acquire a brief read lock on the state" and that plans would only need to wait for "the state refresh portion of the apply to complete." This is technically incorrect on two counts:
  1. Terraform's state lock is a single exclusive mutex — there is no read/write lock distinction at the Terraform level.
  2. The state lock is held for the entire duration of an apply (refresh + plan + apply + state write), not just the refresh phase.

  Replaced with wording clarifying that Terraform uses a single exclusive lock and that plans must wait for the entire apply to finish (or hit the `-lock-timeout`).

## Review Notes
- The post's claim that with GitHub Actions `cancel-in-progress: false` "queued runs execute in order" is a simplification. GitHub Actions concurrency only preserves one pending run per group — if multiple runs queue while one is in progress, the older pending run is canceled in favor of the newer one. This is a known limitation of GitHub Actions (unlike GitLab's `resource_group`, which does provide a true FIFO queue). The post's broader point — that the in-progress run is not canceled — is correct, so this was left as-is, but readers managing high-throughput pipelines should be aware that GitHub does not provide a true multi-slot queue.
- The phrasing "Plans are read-only and can run concurrently" in Strategy 5 is correct in the sense that plans don't modify infrastructure or persist state, but two plans against the same backend will still serialize at the Terraform lock level. The clarified note now makes this lock behavior explicit.
- The Redis-based queue example in Strategy 4 is simplified illustrative code (single worker, no crash recovery, no DLQ). It's fine as a conceptual example but production users would want to harden it considerably.
- All action versions (`@v4`, `@v3`) are current as of the validation date. Terraform 1.7.0 (January 2024) is older than current releases but remains valid for the workflow examples shown.
