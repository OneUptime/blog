# How to Configure Automation Rules in Cloud Deploy for Automatic Promotions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Automation, CI/CD, DevOps

Description: Set up automation rules in Google Cloud Deploy to automatically promote releases through pipeline stages, approve rollouts, and advance canary phases.

---

Manually promoting releases through every stage of your delivery pipeline gets old fast. If you have a three-stage pipeline and you are deploying multiple times a day, that is a lot of clicking or CLI commands. Google Cloud Deploy automation rules solve this by automatically triggering actions like promotions, approvals, and canary advances based on configurable conditions.

Let me show you how to set up automation rules to make your pipeline work for you.

## What Are Automation Rules?

Automation rules are resources you attach to a delivery pipeline. They watch for specific events (like a successful deployment) and automatically perform actions (like promoting to the next stage). Think of them as event-driven triggers for your delivery pipeline.

Cloud Deploy supports several types of automation rules:

- Promote releases automatically after a successful rollout
- Approve pending rollouts automatically
- Advance canary deployment phases
- Roll back on verification failure

## Creating a Promote Automation

The most common automation is automatic promotion. After a release deploys successfully to one stage, it automatically gets promoted to the next.

```yaml
# auto-promote.yaml - Automatically promote from dev to staging
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: auto-promote-dev-to-staging
description: Automatically promote successful dev deployments to staging
selector:
- targets:
  - id: dev
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- promoteReleaseRule:
    name: promote-after-dev
    wait: 60s
    toTargetId: staging
```

The `wait` field adds a delay before the promotion triggers. This gives you a window to catch issues manually before the automation kicks in. Setting it to 60 seconds means you have a minute after the dev deployment succeeds to intervene if needed.

Register the automation.

```bash
# Apply the automation rule
gcloud deploy apply --file=auto-promote.yaml --region=us-central1
```

## Setting Up the Service Account

The automation service account needs permissions to perform the actions. For promotions, it needs the ability to create rollouts and manage releases.

```bash
# Create the automation service account
gcloud iam service-accounts create deploy-automation-sa \
  --display-name="Cloud Deploy Automation"

# Grant Cloud Deploy operator role for creating rollouts
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.operator"

# Grant Cloud Deploy releaser role for promoting releases
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.releaser"

# Allow the automation SA to act as the execution SA
gcloud iam service-accounts add-iam-policy-binding \
  deploy-sa@my-project.iam.gserviceaccount.com \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Automatic Approval for Non-Production Targets

If your staging target has `requireApproval: true` for governance reasons but you want automated testing to proceed without manual approval, you can set up an auto-approve rule.

```yaml
# auto-approve-staging.yaml - Auto-approve rollouts to staging
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: auto-approve-staging
description: Automatically approve staging rollouts
selector:
- targets:
  - id: staging
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- advanceRolloutRule:
    name: auto-approve
    sourcePhases:
    - "stable"
    wait: 0s
```

## Chaining Automations for Full Pipeline Automation

You can chain multiple automations to create a fully automated pipeline from dev through staging. Just keep the production stage manual for safety.

```yaml
# full-auto.yaml - Combined automation rules
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: full-pipeline-automation
description: Automatic promotion from dev through staging
selector:
- targets:
  - id: dev
  - id: staging
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
# Auto-promote from dev after 60 seconds
- promoteReleaseRule:
    name: promote-dev
    wait: 60s
    toTargetId: "@next"
# Auto-promote from staging after verification passes
- promoteReleaseRule:
    name: promote-staging
    wait: 300s
    toTargetId: "@next"
```

The `@next` keyword tells Cloud Deploy to promote to whatever the next target is in the pipeline sequence. This makes the automation portable - you do not need to update it if you rename targets.

## Automating Canary Phase Advances

For canary deployments, you can automatically advance through phases after each one succeeds.

```yaml
# canary-advance.yaml - Auto-advance canary phases
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: auto-advance-canary
description: Automatically advance canary phases after verification
selector:
- targets:
  - id: prod
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- advanceRolloutRule:
    name: advance-canary
    sourcePhases:
    - "canary-10"
    - "canary-50"
    wait: 120s
```

This advances the canary from 10% to 50% to stable, waiting 2 minutes between each advance. Combined with verification at each phase, this gives you a fully automated canary that self-validates and progresses.

## Suspending and Resuming Automations

Sometimes you need to pause automations temporarily - maybe during a freeze period or an incident. You can suspend an automation without deleting it.

```bash
# Suspend an automation
gcloud deploy automations update auto-promote-dev-to-staging \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --suspended=true

# Resume it later
gcloud deploy automations update auto-promote-dev-to-staging \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --suspended=false
```

This is useful for code freeze periods where you want to keep deploying to dev but stop automatic promotions to staging or production.

## Viewing Automation Activity

Track what your automations are doing through the CLI.

```bash
# List all automations for a pipeline
gcloud deploy automations list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1

# List automation runs to see execution history
gcloud deploy automation-runs list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1

# Describe a specific automation run for details
gcloud deploy automation-runs describe RUN_ID \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1
```

## Target Selectors

You can scope automations to specific targets using selectors. The selector supports matching by target ID and labels.

```yaml
# Automation that applies only to targets with specific labels
selector:
- targets:
  - id: "*"
    labels:
      env: non-production
```

This applies the automation to all targets labeled as non-production, which is a clean way to manage automations across many targets.

## Best Practices

Here are patterns that work well in practice:

- Always keep at least one manual gate before production. Full automation is great for dev and staging, but production should have a human approval step.
- Use the `wait` parameter wisely. Even a 60-second wait gives you a chance to catch obvious failures.
- Set up notifications for automation runs. You want to know when automatic promotions happen.
- Start with promotions disabled (`suspended: true`) and enable them after you are confident the pipeline works correctly.
- Use the `@next` keyword instead of hard-coding target names to keep automations maintainable.

## Summary

Automation rules in Cloud Deploy turn your delivery pipeline from a manual process into an automated one. By combining promote rules, approve rules, and canary advance rules, you can create a pipeline that moves releases from development to staging automatically while keeping production under manual control. The suspend/resume capability gives you a kill switch when you need to slow things down.
