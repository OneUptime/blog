# How to Configure Automation Rules in Cloud Deploy for Automatic Promotions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Automation, CI/CD, DevOps

Description: Set up automation rules in Google Cloud Deploy to automatically promote releases through pipeline stages, approve rollouts, and advance canary phases.

---

Manually promoting releases through every stage of your delivery pipeline gets old fast. If you have a three-stage pipeline and you are deploying multiple times a day, that is a lot of clicking or CLI commands. Google Cloud Deploy automation rules solve this by automatically triggering actions like promotions, rollout repairs, and canary advances based on configurable conditions.

Let me show you how to set up automation rules to make your pipeline work for you.

## What Are Automation Rules?

Automation rules are resources you attach to a delivery pipeline. They watch for specific events (like a successful deployment) and automatically perform actions (like promoting to the next stage). Think of them as event-driven triggers for your delivery pipeline.

Cloud Deploy supports several types of automation rules:

- Promote releases automatically after a successful rollout
- Promote releases automatically on a schedule
- Advance canary deployment phases
- Roll back on verification failure

## Creating a Promote Automation

The most common automation is automatic promotion. After a release deploys successfully to one stage, it automatically gets promoted to the next.

```yaml
# auto-promote.yaml - Automatically promote from dev to staging

apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: my-app-pipeline/auto-promote-dev-to-staging
description: Automatically promote successful dev deployments to staging
selector:
  targets:
  - id: dev
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- promoteReleaseRule:
    id: promote-after-dev
    wait: 1m
    destinationTargetId: staging
```

The `wait` field adds a delay before the promotion triggers. This gives you a window to catch issues manually before the automation kicks in. Setting it to 1 minute means you have a minute after the dev deployment succeeds to intervene if needed.

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

# Grant Cloud Deploy operator role for managing deployment resources
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

## Automatic Advancement for Non-Production Canary Targets

If your staging target uses a canary deployment strategy and you want automated testing to proceed through phases without manual advancement, you can set up an advance rollout rule.

```yaml
# auto-advance-staging.yaml - Auto-advance canary rollouts in staging
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: my-app-pipeline/auto-advance-staging
description: Automatically advance staging canary rollouts
selector:
  targets:
  - id: staging
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- advanceRolloutRule:
    id: auto-advance
    wait: 0s
```

## Chaining Automations for Full Pipeline Automation

You can chain multiple automations to create a fully automated pipeline from dev through staging. Just keep the production stage manual for safety.

```yaml
# full-auto.yaml - Combined automation rules
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: my-app-pipeline/full-pipeline-automation
description: Automatic promotion from dev through staging
selector:
  targets:
  - id: dev
  - id: staging
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
# Auto-promote from dev after 60 seconds
- promoteReleaseRule:
    id: promote-dev
    wait: 1m
    destinationTargetId: "@next"
# Auto-promote from staging after verification passes
- promoteReleaseRule:
    id: promote-staging
    wait: 5m
    destinationTargetId: "@next"
```

The `@next` keyword tells Cloud Deploy to promote to whatever the next target is in the pipeline sequence. This keeps the destination portable, so you do not need to hard-code the next target's ID.

## Automating Canary Phase Advances

For canary deployments, you can automatically advance through phases after each one succeeds.

```yaml
# canary-advance.yaml - Auto-advance canary phases
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: my-app-pipeline/auto-advance-canary
description: Automatically advance canary phases after verification
selector:
  targets:
  - id: prod
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- advanceRolloutRule:
    id: advance-canary
    sourcePhases:
    - "canary-10"
    - "canary-50"
    wait: 2m
```

This advances the canary from 10% to 50% to stable, waiting 2 minutes between each advance. Combined with verification at each phase, this gives you a fully automated canary that self-validates and progresses.

## Suspending and Resuming Automations

Sometimes you need to pause automations temporarily - maybe during a freeze period or an incident. You can suspend an automation without deleting it.

```bash
# Suspend an automation by setting suspended: true in the YAML
gcloud deploy apply --file=auto-promote.yaml --region=us-central1

# Resume it later by setting suspended: false in the YAML
gcloud deploy apply --file=auto-promote.yaml --region=us-central1
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
  targets:
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
- Use the `@next` keyword instead of hard-coding destination target names to keep automations maintainable.

## Summary

Automation rules in Cloud Deploy turn your delivery pipeline from a manual process into an automated one. By combining promote rules, repair rules, and canary advance rules, you can create a pipeline that moves releases from development to staging automatically while keeping production under manual control. The suspend/resume capability gives you a kill switch when you need to slow things down.
