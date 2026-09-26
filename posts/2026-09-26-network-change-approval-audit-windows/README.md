# How to Audit and Approve Network Changes Within Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Git, CI/CD, Networking

Description: Bind network change approval to immutable plans, enforce maintenance windows at execution time, and preserve a complete per-device audit trail.

A peer approval is useful only if it identifies exactly what will run. A maintenance window is useful only if the job checks it when the device is about to change. A log is useful only if it connects those decisions to the observed outcome.

Build these controls around an immutable change package: an intended-state revision, a target list, a rendered plan, a baseline observation, and explicit verification and recovery procedures.

## Define the change package

A package should answer six questions before deployment starts:

| Field | What it establishes |
| --- | --- |
| Source revision and artifact digest | The exact reviewed input and rendered output |
| Device identities and managed resources | The allowed scope |
| Observed baseline and collection time | The state used to calculate the plan |
| Pre-checks and post-checks | Conditions for starting and confirming success |
| Rollback method and time budget | The expected recovery path |
| Window start, end, and expiry | When the authorization can be used |

Keep secrets outside the package. Configuration backups may contain sensitive values, so store them separately with restricted access and reference them by an opaque artifact identifier.

Render once for review. The deployment job should fetch and verify that artifact rather than regenerate from a moving branch or a live inventory that may have changed since approval.

## Enforce peer review at two boundaries

Source review approves the policy and implementation. Deployment approval approves a particular package for a particular target and time. Small routine changes can use a preapproved policy, but that policy still needs an enforceable scope and expiry.

With GitHub Actions, a job referencing a protected environment can require reviewers before it starts or receives environment secrets. Enable prevention of self-review where peer separation is required. GitHub's required-reviewer list needs only one listed reviewer to approve; adding several names does not automatically require all of them. Feature availability depends on repository visibility and plan. [Deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)

For example, the deployment job can declare:

```yaml
# Fragment to add to a deployment workflow.
permissions:
  contents: read

concurrency:
  group: network-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: [self-hosted, network-deploy]
    environment: network-production
    steps:
      - name: Execute the approved package
        run: /opt/network-runner/execute-approved-package
```

The executable is your controlled runner application, not a built-in GitHub command. It must retrieve the approved package from trusted workflow context and enforce the checks below. Configure the environment and its reviewers separately; naming an environment in YAML does not create its approval policy.

## Treat the window as an authorization check

A fixed delay is not a maintenance window. GitHub's wait timer delays a job relative to its trigger; it does not encode a calendar interval or guarantee the job will finish inside one. A queue, runner outage, or slow approval can move execution beyond the intended time.

Read window timestamps from the approved change record, not user-supplied shell arguments. Immediately before each write, check that enough time remains for apply, validation, and recovery. This small Python function illustrates the decision:

```python
from datetime import datetime, timedelta, timezone


def require_window(start_text, end_text, required_seconds, now=None):
    start = datetime.fromisoformat(start_text)
    end = datetime.fromisoformat(end_text)
    if start.utcoffset() is None or end.utcoffset() is None:
        raise ValueError("Window timestamps must include a timezone")
    if type(required_seconds) is not int or required_seconds <= 0:
        raise ValueError("A positive integer time budget is required")
    now = now or datetime.now(timezone.utc)
    if now.utcoffset() is None:
        raise ValueError("Current time must include a timezone")
    now = now.astimezone(timezone.utc)
    if not start <= now < end:
        raise RuntimeError("Outside the approved maintenance window")
    if now + timedelta(seconds=required_seconds) > end:
        raise RuntimeError("Insufficient time for change and recovery")
```

Use explicit offsets or UTC in persisted records, and show the local timezone in the review interface. Synchronize runner clocks. For long rollouts, reevaluate remaining time between batches; stop starting new work when the budget no longer fits.

## Lock and recheck after approval

Acquire a per-device or topology-aware lease, then collect fresh state. Compare it with the approved baseline. If the plan would now differ, return to planning and approval. Do not silently recompute commands and reuse approval for the old artifact.

GitHub concurrency groups reduce overlapping workflow runs, but they are not a distributed device lock across AWX, operator sessions, and other repositories. Group ordering is not a durable change queue either. Use a shared coordination mechanism when multiple writers exist. [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

Avoid automatic cancellation of a job in the middle of a network transaction. Cancellation should stop further devices and initiate reconciliation of any write already attempted. A killed runner does not undo configuration.

## Record decisions separately from transcripts

Emit structured, allowlisted audit events. Useful fields include change ID, package digest, initiating identity, approving identity, approval time, window, device ID, stage, outcome, and verification evidence reference.

Record the result for each device, even when the overall batch fails. Distinguish rejected before apply, applied and confirmed, reverted and verified, and outcome unknown. A final pipeline status of failed does not say which devices changed.

Send audit records to storage with independent retention and restricted modification. Keep raw command transcripts and configuration backups in a more restricted evidence store. A readable review log should not require access to enable secrets or full running configurations.

## Close the loop with verified state

After deployment, read configuration and test the intended service path. Confirm any device-side rollback timer only after the checks succeed. Persist configuration according to the platform's semantics and verify that step too.

Close the change record only when all targeted devices have known outcomes. If a device is unreachable after an attempted write, retain the lock or hand it to the recovery workflow and mark the result uncertain. The useful output of this pipeline is an approved, traceable, verified network state-not merely an approval button followed by a green job.
