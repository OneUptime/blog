# How to Set Expiration and TTL Policies on Secrets in GCP Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, TTL, Expiration, Security

Description: Learn how to configure expiration dates and TTL policies on secrets in GCP Secret Manager to automatically clean up temporary credentials and enforce secret lifecycle management.

---

Temporary secrets are everywhere. A short-lived API token for a partner integration. A database password created for a migration that was supposed to take a week. An OAuth client secret for a proof of concept. The problem is that "temporary" in practice means "forgotten." Six months later, those secrets are still sitting in Secret Manager, still accessible, still a risk.

Secret Manager supports expiration policies that automatically delete secrets when they are no longer needed. You set a time-to-live (TTL) or an absolute expiration date, and Secret Manager handles the cleanup. No cron jobs, no manual review processes, no forgotten credentials lingering indefinitely.

## How Expiration Works

When you set an expiration on a secret, Secret Manager schedules the entire secret resource (including all its versions) for deletion at the specified time. When the expiration fires, the secret is deleted permanently - it is not disabled or archived, it is gone.

There are two ways to set the expiration:

- **Absolute expire time** - the secret expires at a specific timestamp (e.g., March 1, 2026 at midnight)
- **TTL (Time to Live)** - the secret expires after a duration from creation (e.g., 30 days after creation)

Both result in the same outcome: automatic deletion of the secret when the time comes.

## Setting Expiration When Creating a Secret

### Using an Absolute Expiration Date

```bash
# Create a secret that expires on a specific date
echo -n "temp-api-key-abc123" | gcloud secrets create partner-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --expire-time="2026-04-01T00:00:00Z" \
  --project=my-project-id
```

This secret will be automatically deleted on April 1, 2026. Use this when you know the exact date the secret should stop being valid - like the end of a contract or a migration deadline.

### Using a TTL

```bash
# Create a secret that expires 30 days from now
echo -n "migration-db-password" | gcloud secrets create migration-credentials \
  --data-file=- \
  --replication-policy="automatic" \
  --ttl="2592000s" \
  --project=my-project-id
```

The TTL is specified in seconds. Common values:
- 1 day: `86400s`
- 7 days: `604800s`
- 30 days: `2592000s`
- 90 days: `7776000s`

## Setting Expiration on Existing Secrets

You can add or update the expiration on secrets that already exist:

```bash
# Add an expiration date to an existing secret
gcloud secrets update partner-api-key \
  --expire-time="2026-06-01T00:00:00Z" \
  --project=my-project-id

# Or set a TTL on an existing secret
gcloud secrets update migration-credentials \
  --ttl="604800s" \
  --project=my-project-id
```

## Removing Expiration

If plans change and the secret needs to stick around longer, you can remove the expiration:

```bash
# Remove the expiration from a secret
gcloud secrets update partner-api-key \
  --remove-expire-time \
  --project=my-project-id
```

## Using Terraform

```hcl
# Secret with absolute expiration
resource "google_secret_manager_secret" "partner_key" {
  secret_id = "partner-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  # Secret expires on this date
  expire_time = "2026-04-01T00:00:00Z"
}

# Secret with TTL
resource "google_secret_manager_secret" "migration_creds" {
  secret_id = "migration-credentials"
  project   = var.project_id

  replication {
    auto {}
  }

  # Secret expires 30 days after creation
  ttl = "2592000s"
}
```

## Practical Use Cases

### Temporary Partner Access

When working with a third-party vendor on a time-limited integration, create secrets that automatically expire when the engagement ends:

```bash
# Create a secret for a 90-day partner engagement
echo -n "partner-shared-secret" | gcloud secrets create vendor-integration-key \
  --data-file=- \
  --replication-policy="automatic" \
  --expire-time="2026-05-17T00:00:00Z" \
  --labels="partner=acme-corp,engagement=data-migration" \
  --project=my-project-id
```

### Migration Credentials

Database migrations often require temporary credentials with elevated privileges:

```bash
# Create migration credentials that expire in 7 days
echo -n "migration-superuser-password" | gcloud secrets create migration-db-admin \
  --data-file=- \
  --replication-policy="automatic" \
  --ttl="604800s" \
  --labels="purpose=migration,ticket=JIRA-1234" \
  --project=my-project-id
```

### Short-Lived Test Secrets

For integration test environments that spin up and down:

```bash
# Create test credentials that expire in 24 hours
echo -n "test-api-key-xyz" | gcloud secrets create e2e-test-credentials \
  --data-file=- \
  --replication-policy="automatic" \
  --ttl="86400s" \
  --labels="environment=test,created-by=ci-pipeline" \
  --project=my-project-id
```

### Incident Response Credentials

During an incident, you might create temporary elevated access credentials. Set them to expire within hours:

```bash
# Create incident response credentials that expire in 4 hours
echo -n "incident-admin-token" | gcloud secrets create incident-response-creds \
  --data-file=- \
  --replication-policy="automatic" \
  --ttl="14400s" \
  --labels="incident=INC-5678,responder=oncall" \
  --project=my-project-id
```

## Version-Level Expiration

Secret Manager also supports expiration on individual secret versions using the Secret Manager API. This is useful when you want the secret resource to persist but specific versions to be cleaned up:

```python
# Python: Create a secret version with an expiration
from google.cloud import secretmanager
from google.protobuf import timestamp_pb2
import datetime

client = secretmanager.SecretManagerServiceClient()

# Calculate expiration time (7 days from now)
expire_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)

# Add a version with the expiration set at the secret level
# Note: version-level TTL requires using the API directly
parent = "projects/my-project-id/secrets/my-secret"
response = client.add_secret_version(
    request={
        "parent": parent,
        "payload": {
            "data": b"temporary-value",
        },
    }
)
print(f"Created version: {response.name}")
```

## Notifications Before Expiration

Secret Manager can publish notifications when secrets are about to expire. Configure a Pub/Sub topic to receive these events:

```bash
# Add event notifications to a secret
gcloud secrets update partner-api-key \
  --add-topics="projects/my-project-id/topics/secret-events" \
  --project=my-project-id
```

Then set up a Cloud Function or alerting pipeline that listens for `SECRET_EXPIRE` events:

```python
# Cloud Function to notify team about expiring secrets
import json
import base64
import functions_framework

@functions_framework.cloud_event
def handle_secret_event(cloud_event):
    """Handle Secret Manager notification events."""
    data = base64.b64decode(cloud_event.data.get("message", {}).get("data", ""))
    event = json.loads(data) if data else {}

    event_type = event.get("eventType", "")
    secret_name = event.get("name", "")

    if "SECRET_EXPIRE" in event_type:
        # Secret is about to expire - notify the team
        print(f"Warning: Secret {secret_name} is expiring soon!")
        # Send notification via Slack, email, PagerDuty, etc.
```

## Finding Secrets Without Expiration

Audit your project for secrets that should have expiration but do not:

```bash
# List all secrets and check for expiration
gcloud secrets list \
  --project=my-project-id \
  --format="table(name, expireTime, labels)" \
  --filter="NOT expireTime:*"
```

This shows all secrets without an expiration date. Review this list regularly and add expirations where appropriate.

## Best Practices

Label temporary secrets with their purpose and the requestor. When the secret expires, the labels provide context about why it existed and who to contact if there are questions.

Set expiration dates that are generous but not indefinite. If a migration should take a week, set the TTL to 14 days, not 90 days. You can always extend it if needed.

Use notifications to alert on upcoming expirations. This gives the team a chance to extend the expiration or confirm that the secret is no longer needed before it is deleted.

Document the expiration policy in your team's runbook. Every team member should know that temporary secrets need TTLs and where to find the list of expiring secrets.

Test your applications' behavior when a secret disappears. When a secret expires and is deleted, applications trying to access it will get a NOT_FOUND error. Make sure your error handling covers this case gracefully rather than crashing.

Expiration policies turn secret cleanup from a manual discipline problem into an automated process. They are simple to configure, free to use, and prevent the accumulation of forgotten credentials that plagues most cloud environments.
