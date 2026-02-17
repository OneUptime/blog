# How to View Release Differences and Audit History in Cloud Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Audit, Release Management, DevOps

Description: Learn how to view release differences, inspect rendered manifests, and access the full audit history of deployments in Google Cloud Deploy.

---

When something goes wrong in production, the first question is always "what changed?" Google Cloud Deploy keeps a complete record of every release, rollout, approval, and promotion. This audit trail is invaluable for debugging, compliance, and understanding your deployment history. In this post, I will show you how to access and use all of this information.

## Understanding the Audit Trail

Cloud Deploy tracks several types of events automatically:

- Release creation (who created it, when, what images)
- Rollout creation and status changes
- Approval and rejection actions
- Promotion events
- Automation rule executions
- Verification results

All of these are recorded with timestamps, actor information, and relevant metadata.

## Listing Releases

Start by listing all releases in a pipeline to get an overview of your deployment history.

```bash
# List all releases for a pipeline, most recent first
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1

# Limit to the last 10 releases
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --limit=10
```

Each release entry shows the name, creation time, and which targets it has been deployed to.

## Inspecting a Specific Release

To see the full details of a release, describe it.

```bash
# Get detailed information about a specific release
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1
```

The output includes:

- The container images included in the release
- The Skaffold configuration used
- Annotations (like commit SHA and build ID)
- Labels
- The rendered manifest artifacts for each target
- The delivery pipeline snapshot at the time of creation

## Viewing Rendered Manifests

One of the most useful features for debugging is seeing exactly what was deployed. Cloud Deploy stores the rendered manifests for each target.

```bash
# View the rendered manifests for a specific release and target
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(targetRenders)"
```

This shows you the exact Kubernetes YAML that was applied to the cluster. No guessing about what image tag was used or what environment variables were set.

## Comparing Two Releases

To understand what changed between two releases, you need to compare their manifests. While Cloud Deploy does not have a built-in diff command, you can extract the manifests and compare them yourself.

```bash
# Save the rendered manifests from two releases to files
gcloud deploy releases describe rel-v2.0 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(targetRenders.prod)" > /tmp/release-v2.0.yaml

gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(targetRenders.prod)" > /tmp/release-v2.1.yaml

# Diff the two rendered manifests
diff /tmp/release-v2.0.yaml /tmp/release-v2.1.yaml
```

This shows you exactly what changed in the Kubernetes manifests between the two releases - new environment variables, changed image tags, modified resource limits, and so on.

## Viewing Rollout History

Rollouts are the deployment actions within a release. Each promotion creates a new rollout. You can list all rollouts for a release or for the entire pipeline.

```bash
# List all rollouts for a specific release
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1

# List all rollouts across all releases (shows recent deployment activity)
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --limit=20
```

## Inspecting Rollout Details

Each rollout has detailed status information including phase progression and timing.

```bash
# Get full details of a rollout
gcloud deploy rollouts describe rel-v2.1-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1
```

The rollout description shows:

- Current state (SUCCEEDED, FAILED, IN_PROGRESS, PENDING_APPROVAL, etc.)
- Phase details with individual job statuses
- Creation and completion timestamps
- The approver (if approval was required)
- Failure reason (if it failed)

## Tracking Who Approved What

For compliance, you often need to know who approved a production deployment. This information is stored in the rollout.

```bash
# Check who approved a specific rollout
gcloud deploy rollouts describe rel-v2.1-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1 \
  --format="yaml(approvalState,approveTime)"
```

## Using Cloud Audit Logs

Cloud Deploy writes to Cloud Audit Logs, which gives you a complete record of every API call. This is the most detailed audit trail available.

```bash
# Query audit logs for Cloud Deploy operations
gcloud logging read \
  'resource.type="clouddeploy.googleapis.com/DeliveryPipeline" AND
   protoPayload.methodName:"clouddeploy.projects.locations"' \
  --limit=50 \
  --format="table(timestamp,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail)"
```

You can filter for specific operations.

```bash
# Find all approval events
gcloud logging read \
  'resource.type="clouddeploy.googleapis.com/DeliveryPipeline" AND
   protoPayload.methodName:"ApproveRollout"' \
  --limit=20 \
  --format="json"

# Find all release creation events
gcloud logging read \
  'resource.type="clouddeploy.googleapis.com/DeliveryPipeline" AND
   protoPayload.methodName:"CreateRelease"' \
  --limit=20 \
  --format="json"
```

## Monitoring Deployment Frequency

By analyzing the release history, you can track your deployment frequency - a key DORA metric.

```bash
# Count releases created in the last 7 days
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --filter="createTime>'-P7D'" \
  --format="value(name)" | wc -l

# Get deployment frequency by day
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --filter="createTime>'-P30D'" \
  --format="table(name,createTime.date())"
```

## Tracking Deployment Lead Time

Lead time from commit to production is another important metric. Using release annotations, you can calculate this.

```bash
# Get the commit time from annotations and the production deployment time
gcloud deploy releases describe rel-v2.1 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --format="yaml(annotations,createTime)"

gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.1 \
  --region=us-central1 \
  --filter="targetId:prod AND state:SUCCEEDED" \
  --format="yaml(deployEndTime)"
```

The difference between the commit timestamp in the annotations and the production deployment end time gives you the lead time.

## Using the Console for Visual History

The Google Cloud Console provides an excellent visual interface for the deployment history. The pipeline view shows:

- A timeline of releases with their progression through stages
- Color-coded rollout statuses
- Click-through to rollout details, logs, and verification results
- Side-by-side comparison of what is deployed to each target

For day-to-day operations, the console is often more convenient than the CLI for browsing history.

## Exporting Audit Data

For long-term retention or integration with external compliance tools, export your audit data to BigQuery.

```bash
# Create a log sink that exports Cloud Deploy audit logs to BigQuery
gcloud logging sinks create cloud-deploy-audit \
  bigquery.googleapis.com/projects/my-project/datasets/deploy_audit \
  --log-filter='resource.type="clouddeploy.googleapis.com/DeliveryPipeline"'
```

Once in BigQuery, you can run SQL queries against your deployment history, build dashboards, and integrate with your compliance reporting tools.

## Pub/Sub Notifications for Real-Time Tracking

Cloud Deploy publishes events to Pub/Sub that you can use for real-time tracking.

```bash
# Subscribe to Cloud Deploy events
gcloud pubsub subscriptions create deploy-events \
  --topic=clouddeploy-operations

# Pull recent events
gcloud pubsub subscriptions pull deploy-events --auto-ack --limit=10
```

These events include release creations, rollout state changes, approval actions, and more. You can feed these into a monitoring system or Slack channel for real-time visibility.

## Summary

Cloud Deploy provides a comprehensive audit trail for your entire deployment lifecycle. From release creation through promotion, approval, and deployment, every action is recorded with actor and timestamp information. By using the CLI, Cloud Audit Logs, and the Console, you can answer any question about what was deployed, when, and by whom. This visibility is essential for debugging production issues, meeting compliance requirements, and understanding your team's deployment patterns.
