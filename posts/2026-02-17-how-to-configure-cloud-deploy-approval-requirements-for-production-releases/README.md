# How to Configure Cloud Deploy Approval Requirements for Production Releases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Approval, Production, DevOps

Description: Set up approval requirements in Google Cloud Deploy to enforce manual review before production deployments, including IAM roles and approval workflows.

---

Shipping to production without a human looking at it first is a bold move. While automation is great for development and staging environments, most teams want a manual approval gate before code reaches production users. Google Cloud Deploy supports configurable approval requirements on targets, so you can enforce review before deployments happen.

This guide covers how to set up approval requirements, manage approvals, and build a workflow that balances speed with safety.

## How Approvals Work in Cloud Deploy

When a target has `requireApproval: true`, any rollout to that target enters a "pending approval" state instead of deploying immediately. The rollout waits until someone with the right IAM permissions explicitly approves or rejects it. Only after approval does the deployment proceed.

This creates a natural checkpoint in your delivery pipeline. Code flows automatically through dev and staging, but pauses at production for human review.

## Enabling Approval on a Target

Add `requireApproval: true` to your production target definition.

```yaml
# prod-target.yaml - Production target with approval required
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production environment - approval required
requireApproval: true
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: deploy-sa@my-project.iam.gserviceaccount.com
```

Apply the target configuration.

```bash
# Register or update the production target
gcloud deploy apply --file=prod-target.yaml --region=us-central1
```

## Setting Up IAM Roles for Approvers

Only users with the `clouddeploy.approver` role can approve or reject rollouts. You need to grant this role to the people or groups who should have approval authority.

```bash
# Grant approval permission to an individual user
gcloud projects add-iam-policy-binding my-project \
  --member="user:tech-lead@company.com" \
  --role="roles/clouddeploy.approver"

# Grant approval permission to a group (recommended)
gcloud projects add-iam-policy-binding my-project \
  --member="group:release-managers@company.com" \
  --role="roles/clouddeploy.approver"

# Grant approval permission to a service account (for automation)
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.approver"
```

The `clouddeploy.approver` role is specifically scoped to approval actions. It does not grant permission to create releases, manage pipelines, or deploy directly.

## The Approval Workflow

Here is what happens step by step when a release reaches a target with approval requirements.

First, the release is promoted to the production target (either manually or via automation).

```bash
# Promote a release to production
gcloud deploy releases promote \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1
```

Cloud Deploy creates a rollout in the PENDING_APPROVAL state. No deployment happens yet.

Check the rollout status to see it waiting for approval.

```bash
# List rollouts to see the pending approval
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1
```

## Approving a Rollout

An approver reviews the release and approves it.

```bash
# Approve the rollout to proceed with deployment
gcloud deploy rollouts approve rel-v2.1-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1
```

After approval, Cloud Deploy immediately begins the deployment process - rendering manifests, deploying to the cluster, and running verification if configured.

## Rejecting a Rollout

If the approver decides the release should not proceed, they can reject it.

```bash
# Reject the rollout with a reason
gcloud deploy rollouts reject rel-v2.1-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1
```

A rejected rollout is terminal. You cannot approve it after rejection. If you want to try again, you need to promote the release again, which creates a new rollout.

## Viewing What Changed Before Approving

Before approving, you should review what the release contains. Cloud Deploy lets you inspect the release and compare it to what is currently deployed.

```bash
# Describe the release to see its contents
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1

# See the rendered manifests for the production target
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(targetArtifacts)"
```

You can also look at the release annotations to find the associated commit SHA or CI build link.

```bash
# Get annotations like commit SHA and build link
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(annotations)"
```

## Setting Up Notifications for Pending Approvals

You do not want rollouts sitting in pending approval for hours because no one noticed. Set up notifications to alert approvers when a rollout needs their attention.

Cloud Deploy publishes events to the `clouddeploy-operations` Pub/Sub topic. You can subscribe to this topic and filter for approval events.

```bash
# Create a Pub/Sub subscription for approval notifications
gcloud pubsub subscriptions create approval-notifications \
  --topic=clouddeploy-operations \
  --push-endpoint=https://your-notification-service.run.app/notify \
  --message-filter='attributes.Action="Required" AND attributes.ResourceType="Rollout"'
```

A Cloud Function or Cloud Run service at that endpoint can parse the event and send a Slack message, email, or PagerDuty notification to the approver group.

## Approval with Canary Deployments

When you combine approvals with canary deployments, the approval happens before the canary starts. Once approved, the canary phases proceed based on your automation configuration.

```yaml
# Pipeline with both approval and canary
serialPipeline:
  stages:
  - targetId: prod
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          kubernetes:
            serviceNetworking:
              service: my-app-service
              deployment: my-app
        canaryDeployment:
          percentages:
          - 10
          - 50
          verify: true
```

The flow becomes: promote to prod, wait for approval, then start the canary phases. This gives you a human checkpoint before any production traffic sees the new version.

## Approving via the Console

The Google Cloud Console provides a user-friendly interface for approvals. Navigate to Cloud Deploy, find the pipeline, and click on the pending rollout. There is an Approve or Reject button with a text field for notes.

This is often easier for approvers who are not comfortable with the CLI. The visual pipeline view also shows what is currently deployed to each target, making it easier to assess the change.

## Multiple Approval Targets

You can require approval on multiple targets in the same pipeline. For example, both staging and production might require approval if you have strict change management requirements.

```yaml
# staging-target.yaml - Staging also requires approval
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
description: Staging environment - approval required
requireApproval: true
gke:
  cluster: projects/my-project/locations/us-central1/clusters/staging-cluster
```

You can then use automation to auto-approve staging while keeping production manual, giving you an audit trail for staging deployments without the manual bottleneck.

## Handling Approval Timeouts

Cloud Deploy does not have a built-in timeout for pending approvals. A rollout can sit in pending approval indefinitely. If you want to enforce SLAs on approval times, build a Cloud Function that checks for stale approvals and sends escalation notifications.

```bash
# Find rollouts that have been pending approval for more than 2 hours
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --filter="state:PENDING_APPROVAL AND createTime<'-PT2H'"
```

## Best Practices for Approvals

Based on experience running approval workflows:

- Use groups, not individuals, for the approver role. If only one person can approve and they are on vacation, your pipeline is stuck.
- Include release details in notifications. The approver should not have to dig around to understand what they are approving.
- Keep approval queues short. If approvals sit for days, the process is too slow and people will start rubber-stamping.
- Document what approvers should check. A clear checklist reduces the chance of mistakes.
- Automate everything except the final production gate. Manual steps in dev and staging just slow you down without adding value.

## Summary

Approval requirements in Cloud Deploy create a controlled gateway to production. By setting `requireApproval: true` on your production target and configuring the right IAM roles, you ensure every production deployment gets a human review. Combined with notifications, clear release information, and a well-defined approval process, this feature helps teams ship safely while maintaining velocity.
