# How to Use ArgoCD API for Deployment Tracking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API, Deployment Tracking

Description: Track deployments across environments and clusters using ArgoCD's REST API, operation history, and Prometheus metrics to build deployment audit trails and analytics.

---

Knowing what was deployed, when, where, and by whom is essential for incident response, compliance, and operational visibility. ArgoCD's REST API gives you access to deployment history, sync operations, and application state that you can use to build comprehensive deployment tracking.

This post shows you how to extract deployment data from ArgoCD and use it for tracking, auditing, and analytics.

## What ArgoCD Tracks

ArgoCD maintains several pieces of deployment data for each application. The operation history records each sync operation including the revision, timestamp, and result. The sync status shows whether the live state matches the desired state. The resource tree shows every Kubernetes resource managed by the application. And the operation state tracks the current or most recent sync operation's progress.

## Querying Deployment History

Each application stores a history of sync operations. Query it through the API.

```bash
# Get the deployment history for an application
curl -s -k "$ARGOCD_URL/api/v1/applications/web-app-production" \
  -H "$AUTH_HEADER" | jq '[.status.history[] | {
    id: .id,
    revision: .revision[0:7],
    deployedAt: .deployedAt,
    source: {
      repo: .source.repoURL,
      path: .source.path,
      targetRevision: .source.targetRevision
    }
  }]'
```

Example output:

```json
[
  {
    "id": 12,
    "revision": "abc1234",
    "deployedAt": "2026-02-26T14:30:00Z",
    "source": {
      "repo": "https://github.com/company/k8s-configs",
      "path": "apps/web-app/production",
      "targetRevision": "main"
    }
  },
  {
    "id": 11,
    "revision": "def5678",
    "deployedAt": "2026-02-25T10:15:00Z",
    "source": {
      "repo": "https://github.com/company/k8s-configs",
      "path": "apps/web-app/production",
      "targetRevision": "main"
    }
  }
]
```

## Getting the Current Operation State

For tracking in-progress deployments, query the operation state.

```bash
# Get the current or most recent sync operation details
curl -s -k "$ARGOCD_URL/api/v1/applications/web-app-production" \
  -H "$AUTH_HEADER" | jq '{
    phase: .status.operationState.phase,
    message: .status.operationState.message,
    startedAt: .status.operationState.startedAt,
    finishedAt: .status.operationState.finishedAt,
    syncResult: {
      revision: .status.operationState.syncResult.revision[0:7],
      resources: [.status.operationState.syncResult.resources[] | {
        kind: .kind,
        name: .name,
        status: .status,
        message: .message
      }]
    }
  }'
```

The operation phases are: `Running`, `Succeeded`, `Failed`, and `Error`. For deployment tracking, you care about transitions between these phases.

## Building a Deployment Tracker Service

Here is a service that polls ArgoCD and records deployment events to a database for historical analysis.

```python
# deployment_tracker.py
# Service that tracks ArgoCD deployments and stores them for analysis
import os
import time
import json
import logging
import requests
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('deployment-tracker')

ARGOCD_URL = os.environ['ARGOCD_URL']
ARGOCD_TOKEN = os.environ['ARGOCD_AUTH_TOKEN']
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '30'))


class DeploymentTracker:
    def __init__(self):
        self.headers = {
            'Authorization': f'Bearer {ARGOCD_TOKEN}',
            'Content-Type': 'application/json'
        }
        # Track the last known operation state per application
        self.last_operation = {}
        # In production, use a real database
        self.deployments = []

    def get_applications(self):
        """Fetch all applications from ArgoCD."""
        resp = requests.get(
            f'{ARGOCD_URL}/api/v1/applications',
            headers=self.headers,
            verify=False,
            timeout=30
        )
        resp.raise_for_status()
        return resp.json().get('items', [])

    def check_for_new_deployments(self):
        """Check all applications for new or completed deployments."""
        apps = self.get_applications()

        for app in apps:
            name = app['metadata']['name']
            op_state = app.get('status', {}).get('operationState', {})

            if not op_state:
                continue

            phase = op_state.get('phase', '')
            finished_at = op_state.get('finishedAt', '')
            started_at = op_state.get('startedAt', '')

            # Create a unique key for this operation
            op_key = f"{name}:{started_at}"

            # Check if this is a new completed operation
            if phase in ('Succeeded', 'Failed', 'Error'):
                if op_key not in self.last_operation:
                    self.record_deployment(app, op_state)
                    self.last_operation[op_key] = phase

            # Track in-progress deployments
            elif phase == 'Running':
                if op_key not in self.last_operation:
                    logger.info(f'Deployment in progress: {name}')
                    self.last_operation[op_key] = 'Running'

    def record_deployment(self, app, op_state):
        """Record a completed deployment event."""
        name = app['metadata']['name']
        project = app['spec'].get('project', 'default')
        destination = app['spec'].get('destination', {})

        sync_result = op_state.get('syncResult', {})
        resources = sync_result.get('resources', [])

        deployment = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'application': name,
            'project': project,
            'cluster': destination.get('server', ''),
            'namespace': destination.get('namespace', ''),
            'phase': op_state.get('phase', ''),
            'revision': sync_result.get('revision', '')[:7],
            'started_at': op_state.get('startedAt', ''),
            'finished_at': op_state.get('finishedAt', ''),
            'duration_seconds': self.calculate_duration(
                op_state.get('startedAt'),
                op_state.get('finishedAt')
            ),
            'resources_synced': len(resources),
            'resources_failed': len([r for r in resources if r.get('status') == 'SyncFailed']),
            'initiated_by': op_state.get('operation', {}).get('initiatedBy', {}).get('username', 'automated'),
        }

        self.deployments.append(deployment)
        logger.info(
            f'Recorded deployment: {name} - {deployment["phase"]} '
            f'(rev: {deployment["revision"]}, duration: {deployment["duration_seconds"]}s)'
        )

        # In production, send this to your analytics backend
        self.send_to_analytics(deployment)

    def calculate_duration(self, started, finished):
        """Calculate deployment duration in seconds."""
        if not started or not finished:
            return 0
        try:
            start = datetime.fromisoformat(started.replace('Z', '+00:00'))
            end = datetime.fromisoformat(finished.replace('Z', '+00:00'))
            return int((end - start).total_seconds())
        except (ValueError, TypeError):
            return 0

    def send_to_analytics(self, deployment):
        """Send deployment event to analytics backend."""
        # Example: send to a webhook, database, or monitoring system
        logger.info(f'Analytics event: {json.dumps(deployment)}')

    def get_deployment_stats(self, hours=24):
        """Calculate deployment statistics for the given time window."""
        now = datetime.now(timezone.utc)
        recent = [d for d in self.deployments
                  if d.get('finished_at')]

        total = len(recent)
        succeeded = len([d for d in recent if d['phase'] == 'Succeeded'])
        failed = len([d for d in recent if d['phase'] in ('Failed', 'Error')])

        durations = [d['duration_seconds'] for d in recent if d['duration_seconds'] > 0]
        avg_duration = sum(durations) / len(durations) if durations else 0

        return {
            'total_deployments': total,
            'succeeded': succeeded,
            'failed': failed,
            'success_rate': (succeeded / total * 100) if total > 0 else 0,
            'avg_duration_seconds': round(avg_duration, 1),
            'deployments_by_project': self.count_by_field(recent, 'project'),
            'deployments_by_cluster': self.count_by_field(recent, 'cluster'),
        }

    def count_by_field(self, deployments, field):
        """Count deployments grouped by a field."""
        counts = {}
        for d in deployments:
            key = d.get(field, 'unknown')
            counts[key] = counts.get(key, 0) + 1
        return counts

    def run(self):
        """Main polling loop."""
        logger.info(f'Starting deployment tracker (poll interval: {POLL_INTERVAL}s)')
        while True:
            try:
                self.check_for_new_deployments()
            except Exception as e:
                logger.error(f'Error checking deployments: {e}')
            time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    tracker = DeploymentTracker()
    tracker.run()
```

## Using Prometheus Metrics for Deployment Analytics

ArgoCD's Prometheus metrics provide aggregate deployment data that is perfect for trend analysis.

```promql
# Deployment frequency: syncs per hour by application
sum by (name) (rate(argocd_app_sync_total[1h])) * 3600

# Success rate over the last 24 hours
sum(argocd_app_sync_total{phase="Succeeded"}) by (name)
/
sum(argocd_app_sync_total) by (name)

# Average sync duration by application
avg by (name) (
  argocd_app_sync_duration_seconds_sum
  /
  argocd_app_sync_duration_seconds_count
)

# Deployment frequency trend (daily deployments over time)
sum(increase(argocd_app_sync_total[1d]))
```

## Building a Deployment Audit Trail

For compliance requirements, you need a complete audit trail. Combine ArgoCD's history with Git commit data.

```bash
# Get deployment history with Git metadata
APP_NAME="web-app-production"

# Step 1: Get the ArgoCD deployment history
HISTORY=$(curl -s -k "$ARGOCD_URL/api/v1/applications/$APP_NAME" \
  -H "$AUTH_HEADER" | jq '.status.history')

# Step 2: For each deployment, enrich with Git commit info
echo "$HISTORY" | jq -r '.[].revision' | while read rev; do
  # Get Git commit details from the repo
  COMMIT_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/company/k8s-configs/commits/$rev" | \
    jq '{sha: .sha[0:7], author: .commit.author.name, message: .commit.message, date: .commit.author.date}')

  echo "$COMMIT_INFO"
done
```

## Deployment Event Webhooks

Instead of polling, use ArgoCD Notifications to push deployment events to your tracking system.

```yaml
# argocd-notifications-cm - send deployment events to a webhook
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.deployment-tracker: |
    url: https://tracker.company.com/api/deployments
    headers:
      - name: Authorization
        value: Bearer $tracker-api-key
  template.deployment-event: |
    webhook:
      deployment-tracker:
        method: POST
        body: |
          {
            "application": "{{.app.metadata.name}}",
            "project": "{{.app.spec.project}}",
            "revision": "{{.app.status.sync.revision}}",
            "cluster": "{{.app.spec.destination.server}}",
            "namespace": "{{.app.spec.destination.namespace}}",
            "phase": "{{.app.status.operationState.phase}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [deployment-event]
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Failed', 'Error']
      send: [deployment-event]
```

Annotate your applications to enable tracking.

```yaml
metadata:
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.deployment-tracker: ""
    notifications.argoproj.io/subscribe.on-sync-failed.deployment-tracker: ""
```

## Wrapping Up

ArgoCD provides all the data you need for comprehensive deployment tracking through its REST API, operation history, resource tree, and Prometheus metrics. The approach you choose depends on your needs: the REST API for real-time queries and building custom tools, Prometheus metrics for trend analysis and dashboards, and ArgoCD Notifications for event-driven tracking pipelines. For organizations that need integrated deployment monitoring alongside infrastructure observability, consider combining ArgoCD tracking with [OneUptime's monitoring capabilities](https://oneuptime.com) for a complete operational picture.
