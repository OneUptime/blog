# How to Set Up Automated Firestore Backups with Scheduled PITR Exports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Backup, Cloud Scheduler, Disaster Recovery

Description: Learn how to set up automated Firestore backups using scheduled exports and point-in-time recovery to protect your data against accidental deletions and corruption.

---

Losing data in Firestore is one of those things that nobody thinks about until it happens. Maybe someone runs a bad migration script, a bug in production deletes documents it should not have, or a disgruntled employee wipes a collection. Whatever the cause, having reliable backups is not optional - it is essential.

Firestore gives you two mechanisms for data protection: managed exports (for full or collection-level backups) and point-in-time recovery (PITR) for rolling back to any point in the last seven days. In this guide, I will show you how to set up both, automate them with Cloud Scheduler, and make sure you can actually restore when you need to.

## Understanding Your Backup Options

**Managed Exports** create a snapshot of your Firestore data in a Cloud Storage bucket. You can export the entire database or specific collections. These exports can be imported back into any Firestore database, making them useful for disaster recovery, creating staging environments, or migrating data between projects.

**Point-in-Time Recovery (PITR)** lets you recover your database to any second within the last seven days. It does not require you to set up anything in advance - Firestore continuously tracks changes. But PITR only works for the same database in the same project, and the retention window is fixed at seven days.

The best approach is to use both: PITR for quick recoveries from recent incidents, and scheduled exports for long-term archival and cross-project recovery.

## Enabling Point-in-Time Recovery

PITR needs to be enabled on your Firestore database. You can do this through the console or CLI.

```bash
# Enable PITR on your Firestore database
gcloud firestore databases update \
  --database='(default)' \
  --enable-pitr \
  --project=my-project
```

Once enabled, you can recover to any point within the seven-day window:

```bash
# Restore to a specific point in time (ISO 8601 format)
gcloud firestore databases restore \
  --source-database='(default)' \
  --destination-database='restored-db' \
  --snapshot-time='2026-02-15T14:30:00Z' \
  --project=my-project
```

Note that PITR restores create a new database - they do not overwrite the existing one. This is actually a good safety feature because it lets you inspect the restored data before replacing anything.

## Setting Up Automated Exports

For automated exports, you need three things: a Cloud Storage bucket, a Cloud Function (or Cloud Run service) to trigger the export, and Cloud Scheduler to run it on a cron schedule.

### Create the Storage Bucket

```bash
# Create a bucket for Firestore exports with lifecycle rules
gsutil mb -l us-central1 gs://my-firestore-backups

# Set a lifecycle rule to delete exports older than 90 days
cat > /tmp/lifecycle.json << 'LIFECYCLE'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
LIFECYCLE

gsutil lifecycle set /tmp/lifecycle.json gs://my-firestore-backups
```

### Create the Export Cloud Function

Here is a Cloud Function that triggers a Firestore export:

```python
# main.py - Cloud Function to trigger Firestore exports
import functions_framework
from google.cloud import firestore_admin_v1
from datetime import datetime
import json

@functions_framework.http
def export_firestore(request):
    """Trigger a Firestore export to Cloud Storage."""
    # Configuration
    project_id = 'my-project'
    database_id = '(default)'
    bucket = 'gs://my-firestore-backups'

    # Create a timestamped folder for this export
    timestamp = datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')
    output_uri = f'{bucket}/exports/{timestamp}'

    # Parse optional collection filter from request body
    collection_ids = []
    if request.data:
        body = json.loads(request.data)
        collection_ids = body.get('collection_ids', [])

    # Initialize the Firestore Admin client
    client = firestore_admin_v1.FirestoreAdminClient()

    # Build the database name
    database_name = f'projects/{project_id}/databases/{database_id}'

    # Trigger the export
    request = firestore_admin_v1.ExportDocumentsRequest(
        name=database_name,
        output_uri_prefix=output_uri,
        collection_ids=collection_ids,
    )

    operation = client.export_documents(request=request)
    print(f"Export started: {operation.operation.name}")

    return json.dumps({
        'status': 'started',
        'output_uri': output_uri,
        'operation': operation.operation.name,
    }), 200
```

The requirements file for this function:

```text
# requirements.txt
functions-framework==3.*
google-cloud-firestore-admin==1.*
```

Deploy the function:

```bash
# Deploy the export function
gcloud functions deploy firestore-export \
  --runtime python312 \
  --trigger-http \
  --entry-point export_firestore \
  --region us-central1 \
  --memory 256MB \
  --timeout 540s \
  --service-account firestore-backup@my-project.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --project my-project
```

### Set Up the Service Account

The service account needs permissions to export Firestore data and write to Cloud Storage:

```bash
# Create a dedicated service account for backups
gcloud iam service-accounts create firestore-backup \
  --display-name="Firestore Backup Service Account" \
  --project=my-project

# Grant Firestore export permission
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:firestore-backup@my-project.iam.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"

# Grant Cloud Storage write permission
gsutil iam ch \
  serviceAccount:firestore-backup@my-project.iam.gserviceaccount.com:objectCreator \
  gs://my-firestore-backups
```

### Schedule the Export

Use Cloud Scheduler to trigger the export function on a cron schedule:

```bash
# Schedule daily exports at 2 AM UTC
gcloud scheduler jobs create http firestore-daily-export \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/firestore-export" \
  --http-method=POST \
  --body='{"collection_ids": []}' \
  --headers="Content-Type=application/json" \
  --oidc-service-account-email=firestore-backup@my-project.iam.gserviceaccount.com \
  --project=my-project
```

For critical collections, you might want more frequent backups:

```bash
# Schedule hourly exports for critical collections only
gcloud scheduler jobs create http firestore-hourly-critical \
  --location=us-central1 \
  --schedule="0 * * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/firestore-export" \
  --http-method=POST \
  --body='{"collection_ids": ["users", "orders", "payments"]}' \
  --headers="Content-Type=application/json" \
  --oidc-service-account-email=firestore-backup@my-project.iam.gserviceaccount.com \
  --project=my-project
```

## Restoring from an Export

When you need to restore data, you import from the Cloud Storage export:

```bash
# List available exports
gsutil ls gs://my-firestore-backups/exports/

# Import a specific export into a new database
gcloud firestore import gs://my-firestore-backups/exports/2026-02-15_02-00-00 \
  --project=my-project
```

If you want to import into a separate database first (recommended for validation):

```bash
# Create a temporary database for validation
gcloud firestore databases create \
  --database=restore-validation \
  --location=us-central1 \
  --type=firestore-native \
  --project=my-project

# Import into the validation database
gcloud firestore import gs://my-firestore-backups/exports/2026-02-15_02-00-00 \
  --database=restore-validation \
  --project=my-project
```

## Monitoring Backup Health

Your backup system is only as good as your monitoring. Here is a Cloud Function that checks whether recent backups exist:

```python
# monitor_backups.py - Verify that backups are running on schedule
import functions_framework
from google.cloud import storage
from datetime import datetime, timedelta
import json

@functions_framework.http
def check_backup_health(request):
    """Verify that a recent Firestore export exists."""
    bucket_name = 'my-firestore-backups'
    max_age_hours = 26  # Alert if no backup in 26 hours

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List recent exports
    cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
    blobs = list(bucket.list_blobs(prefix='exports/'))

    # Find the most recent export
    latest = None
    for blob in blobs:
        if blob.time_created.replace(tzinfo=None) > (latest or cutoff):
            latest = blob.time_created.replace(tzinfo=None)

    if latest and latest > cutoff:
        return json.dumps({
            'status': 'healthy',
            'latest_backup': latest.isoformat(),
        }), 200
    else:
        # This should trigger an alert in your monitoring system
        return json.dumps({
            'status': 'unhealthy',
            'message': f'No backup found within the last {max_age_hours} hours',
        }), 500
```

## Building a Complete Backup Strategy

Here is a backup strategy that covers most scenarios:

```
+------------------+------------------+-------------------+
| Backup Type      | Frequency        | Retention         |
+------------------+------------------+-------------------+
| PITR             | Continuous       | 7 days (fixed)    |
| Critical exports | Hourly           | 30 days           |
| Full exports     | Daily            | 90 days           |
| Monthly archive  | Monthly          | 1 year            |
+------------------+------------------+-------------------+
```

For the monthly archive, you can use a different storage class to save costs:

```bash
# Create a Nearline storage bucket for monthly archives
gsutil mb -l us-central1 -c nearline gs://my-firestore-archives
```

## Testing Your Restores

The most overlooked part of any backup strategy is testing restores. Schedule a monthly exercise where you actually restore from a backup and verify the data. Here is a simple process:

1. Pick a random recent export
2. Restore it to a temporary database
3. Run a set of validation queries to verify data integrity
4. Compare document counts against production
5. Delete the temporary database

If you are using OneUptime for monitoring, set up an alert that fires if the backup health check function returns an error. That way, you will know within hours if your backup pipeline breaks - not days later when you actually need a restore and discover that backups have been failing silently.

Automating Firestore backups is one of those things that takes a couple of hours to set up but saves you from catastrophic data loss. Do it before you need it.
