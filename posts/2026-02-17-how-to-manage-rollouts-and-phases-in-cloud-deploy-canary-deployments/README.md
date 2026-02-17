# How to Manage Rollouts and Phases in Cloud Deploy Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Canary, Rollouts, DevOps

Description: Master the management of rollouts and phases in Google Cloud Deploy canary deployments, including advancing, pausing, and rolling back canary releases.

---

Canary deployments in Google Cloud Deploy break a release into multiple phases, each representing a different traffic percentage. Managing these phases - knowing when to advance, when to pause, and when to roll back - is where the real operational skill comes in. This post covers the practical aspects of working with canary rollout phases day to day.

## How Canary Phases Work

When you set up a canary deployment with percentages like 10, 25, 50, and 75, Cloud Deploy creates a rollout with distinct phases. Each phase represents a step in the progressive rollout:

- Phase 1 (canary-10): 10% of traffic goes to the new version
- Phase 2 (canary-25): 25% of traffic goes to the new version
- Phase 3 (canary-50): 50% of traffic goes to the new version
- Phase 4 (canary-75): 75% of traffic goes to the new version
- Final phase (stable): 100% of traffic goes to the new version

The rollout starts at the first phase and waits for you (or an automation rule) to advance it to the next phase.

## Viewing Rollout Phases

When a canary rollout is created, you can inspect its phases to understand the current state.

```bash
# Describe the rollout to see all phases and their status
gcloud deploy rollouts describe rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1
```

The output shows each phase with its status (PENDING, IN_PROGRESS, SUCCEEDED, or FAILED) and the associated job runs.

```bash
# Example output structure:
# phases:
# - id: canary-10
#   state: SUCCEEDED
# - id: canary-25
#   state: IN_PROGRESS
# - id: canary-50
#   state: PENDING
# - id: stable
#   state: PENDING
```

## Advancing to the Next Phase

After the current phase completes and you are satisfied with the metrics, advance to the next phase.

```bash
# Advance the rollout to the next canary phase
gcloud deploy rollouts advance rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1
```

The advance command is straightforward. Cloud Deploy knows which phase is current and moves to the next one. You do not need to specify which phase to advance to.

## What Happens During Each Phase

Each canary phase consists of jobs that Cloud Deploy executes:

1. Deploy job - Scales the canary deployment to match the target percentage
2. Verify job (if enabled) - Runs your verification container to validate the phase

For service networking based canary deployments, the deploy job adjusts the ratio of canary pods to stable pods. For Gateway API based canaries, it updates the traffic split rules in the HTTPRoute.

```bash
# List the job runs within a specific phase
gcloud deploy job-runs list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --rollout=rel-v2-to-prod-0001 \
  --region=us-central1
```

## Monitoring Between Phases

The window between phases is your observation period. Use this time to check key metrics in Cloud Monitoring.

Here are the things to watch:

- Error rate comparison between canary and stable pods
- Latency percentiles (p50, p95, p99) for canary versus stable
- Resource utilization on canary pods
- Any application-specific metrics you track

```bash
# Quick check: get the pod status in the cluster during a canary phase
kubectl get pods -l app=my-app --show-labels

# Check logs from canary pods specifically
kubectl logs -l app=my-app,deploy.cloud.google.com/rollout-type=canary --tail=50
```

## Rolling Back a Canary

If you spot a problem at any phase, you can cancel the rollout to return to the stable version.

```bash
# Cancel the canary rollout and revert to the stable version
gcloud deploy rollouts cancel rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1
```

Canceling removes the canary pods and restores the stable deployment to full capacity. The impact is limited to whatever percentage was active in the current phase.

## Retrying Failed Phases

If a phase fails due to a transient issue (maybe a verification timeout caused by a temporary network blip), you can retry the job.

```bash
# Retry a failed job run within a phase
gcloud deploy job-runs retry JOB_RUN_ID \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --rollout=rel-v2-to-prod-0001 \
  --region=us-central1
```

This re-executes the failed job without resetting the entire rollout.

## Ignoring a Failed Job

In some cases, you might decide a job failure is not critical and want to proceed anyway. You can ignore the failure and advance.

```bash
# Ignore a failed job to unblock the rollout
gcloud deploy rollouts advance rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1 \
  --override
```

Use this cautiously. Ignoring verification failures defeats the purpose of having verification in the first place.

## Automating Phase Advances

Instead of manually advancing each phase, set up automation rules.

```yaml
# auto-advance.yaml - Automatically advance canary phases
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: auto-advance-canary
selector:
- targets:
  - id: prod
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- advanceRolloutRule:
    name: advance-canary-phases
    sourcePhases:
    - "canary-10"
    - "canary-25"
    - "canary-50"
    wait: 300s
```

This automation advances through each canary phase after a 5-minute observation window. The final stable phase is left out so it requires manual advance or a separate automation.

## The Stable Phase

The stable phase is the final phase where 100% of traffic shifts to the new version. After this phase succeeds, the canary rollout is complete and the old stable deployment is removed.

```bash
# Advance to the stable phase (final step)
gcloud deploy rollouts advance rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1
```

Once the stable phase completes, you are done. The new version is fully deployed and the rollout status shows SUCCEEDED.

## Viewing Phase History and Timing

You can get detailed timing information about each phase, which is useful for understanding your deployment cadence.

```bash
# Get detailed rollout information including phase timing
gcloud deploy rollouts describe rel-v2-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1 \
  --format="yaml(phases)"
```

This shows when each phase started, when it completed, and how long it took. Over time, this data helps you calibrate your canary percentages and observation windows.

## Managing Multiple Concurrent Canaries

Cloud Deploy does not support multiple active rollouts to the same target simultaneously. If you create a new release while a canary is in progress, you need to either complete or cancel the existing rollout before the new one can start.

This is a deliberate design choice. Running multiple canaries at once makes it nearly impossible to attribute issues to a specific release.

```bash
# Check if there is an active rollout before creating a new release
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2 \
  --region=us-central1 \
  --filter="state:IN_PROGRESS OR state:PENDING_APPROVAL"
```

## Practical Tips for Canary Management

Through experience, here are patterns that work well:

- Start with fewer phases (3-4) and add more only if needed. Too many phases slow down deployment without proportionally reducing risk.
- The first phase should be small (5-10%) to minimize initial impact.
- Match your observation window to your monitoring granularity. If your metrics aggregate every 5 minutes, a 2-minute observation window is useless.
- Always have a runbook for what to check during each phase. Consistency matters when you are doing this multiple times a day.
- Use verification at every phase for critical services. Manual observation alone misses things.

## Summary

Managing canary rollout phases in Cloud Deploy is about controlling the pace of your deployment. You advance when metrics look good, pause when you need more time to observe, and roll back when something is wrong. Combined with verification and automation rules, you can build a canary workflow that balances speed with safety. The key is finding the right number of phases, the right observation windows, and the right automation level for your specific service.
