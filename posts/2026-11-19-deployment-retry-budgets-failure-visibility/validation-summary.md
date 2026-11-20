# Validation Summary: Set Deployment Retry Budgets Without Hiding Chronic Failures Behind Re-Runs

## Status
validated

## Post Type
Technical guide with a Python policy example and CI/CD implementation guidance.

## Technologies Covered
- Python 3
- GitHub Actions workflow run identifiers
- GitLab CI/CD retry configuration and Jobs API
- Kubernetes Deployment progress conditions
- Deployment controllers, idempotency, retry budgets, and observability

## Sources Consulted
- GitHub Actions variables reference: https://docs.github.com/en/actions/reference/workflows-and-actions/variables — verified run ID persistence and attempt increments during reruns.
- GitLab CI/CD YAML retry reference: https://docs.gitlab.com/ci/yaml/#retry — verified additional-retry limits, failure filtering, and the documented GitLab 19.1 runner-failure reclassification.
- GitLab Jobs API: https://docs.gitlab.com/api/jobs/#list-all-jobs-by-pipeline — verified pagination, exclusion of retried jobs by default, `include_retried`, job IDs, and `failure_reason`.
- Kubernetes failed Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#failed-deployment — verified that exceeding the progress deadline reports a condition without automatically stopping or rolling back the rollout.
- AWS Builders' Library, Timeouts, retries, and backoff with jitter: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — verified timeout ambiguity, side-effect risks, idempotency, and bounded retries. The URL redirects to the corresponding AWS Builder Center article.
- Python control flow and keyword-only arguments: https://docs.python.org/3/tutorial/controlflow.html#keyword-only-arguments — checked the function signature and conditional control flow.
- Python expression reference: https://docs.python.org/3/reference/expressions.html#membership-test-operations — checked set membership and comparison semantics.
- Author profile: https://www.github.com/nawazdhandala — verified that the link resolves to the intended GitHub profile.

## Issues Found
No technical issues found.

## Review Notes
- The README required no changes. All referenced links resolved to the intended resources, including redirects.
- Extracted and compiled the actual Python example, then executed 11 checks covering both retryable classes, recurrence suspension, unsafe repetition, an unknown failure class, exhausted and exceeded attempt budgets, and elapsed-time boundaries.
- The function conservatively rejects a retry when remaining time exactly equals the delay plus attempt timeout. This is consistent with its illustrative policy and leaves no ambiguity about the boundary.
- Verified all four calculations: 90% first-attempt success, 98% eventual success, 8% retry dependence, and 1.10 attempt amplification for 110 attempts across 100 operations.
- The two-attempt, fifteen-minute, and three-in-twenty limits are explicitly proposed policy values, not vendor guarantees or industry standards. The retry-dependence denominator is clearly defined as all operations in the closed cohort.
- Persistent operation identity, atomic attempt reservation, latched recurrence suspension, external attempt history, reconciliation, and manual override records are controller design requirements. The post correctly states that the sample function does not implement scheduling, classification, or concurrency control.
- GitLab failure reasons are version-sensitive. The cited documentation explicitly supports the 19.1 statement, and the post appropriately directs readers to check their installed version and recorded reasons.
- No terminal commands or complete deployment configurations are presented. Review covered documentation, local Python execution, and arithmetic; no live CI pipeline or Kubernetes deployment was exercised.
