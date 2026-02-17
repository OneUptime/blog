# How to Monitor and Audit Authentication Events Across a Google Cloud Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Authentication, Audit Monitoring, Cloud Identity, Security

Description: A comprehensive guide to monitoring and auditing authentication events across your Google Cloud organization, including login tracking, anomaly detection, and compliance reporting.

---

Authentication events tell you who is accessing your cloud environment, from where, and how. Failed logins might indicate a brute force attack. Logins from unusual locations could mean compromised credentials. Service account authentication from unexpected IPs might signal a key leak. Monitoring these events across your entire GCP organization is fundamental to security operations.

This guide covers how to collect, analyze, and alert on authentication events at the organization level.

## Types of Authentication Events in GCP

Google Cloud has several types of authentication events you need to track. User logins through Google Workspace or Cloud Identity, service account key usage, OAuth token grants and refreshes, API key usage, workload identity federation token exchanges, and failed authentication attempts across all of these.

Each generates audit log entries, but they appear in different log types and services, which is why organization-wide collection matters.

## Step 1: Enable Comprehensive Audit Logging

Not all authentication events are logged by default. Data Access logs, which include authentication details, must be explicitly enabled.

```bash
# Get the current audit log configuration for the organization
gcloud organizations get-iam-policy ORG_ID > /tmp/org-policy.yaml
```

Add audit log configuration to the policy file:

```yaml
# Add this to your organization IAM policy
auditConfigs:
  - service: allServices
    auditLogConfigs:
      - logType: ADMIN_READ
      - logType: DATA_READ
      - logType: DATA_WRITE
  - service: iam.googleapis.com
    auditLogConfigs:
      - logType: ADMIN_READ
      - logType: DATA_READ
      - logType: DATA_WRITE
```

```bash
# Apply the updated policy
gcloud organizations set-iam-policy ORG_ID /tmp/org-policy.yaml

# Create an organization-level sink for authentication events
gcloud logging sinks create auth-events-sink \
  --organization=ORG_ID \
  --log-filter='
    protoPayload.methodName:(
      "google.login.LoginService.loginSuccess" OR
      "google.login.LoginService.loginFailure" OR
      "google.iam.admin.v1.CreateServiceAccountKey" OR
      "google.iam.credentials.v1.GenerateAccessToken" OR
      "google.iam.credentials.v1.SignBlob" OR
      "SetIamPolicy"
    ) OR
    logName:"cloudaudit.googleapis.com/activity"
  ' \
  --destination="bigquery.googleapis.com/projects/audit-project/datasets/auth_events" \
  --include-children \
  --use-partitioned-tables
```

## Step 2: Collect Google Workspace Login Events

Google Workspace login events are separate from GCP audit logs. You need the Admin SDK Reports API to access them.

```python
from google.oauth2 import service_account
from googleapiclient.discovery import build
from google.cloud import bigquery
from datetime import datetime, timedelta

def collect_login_events(admin_email, days_back=1):
    """Collect login events from Google Workspace Admin Reports."""
    credentials = service_account.Credentials.from_service_account_file(
        'service-account-key.json',
        scopes=['https://www.googleapis.com/auth/admin.reports.audit.readonly'],
        subject=admin_email,
    )

    service = build('admin', 'reports_v1', credentials=credentials)

    # Calculate the time window
    start_time = (
        datetime.utcnow() - timedelta(days=days_back)
    ).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    # Fetch login events
    events = []
    request = service.activities().list(
        userKey='all',
        applicationName='login',
        startTime=start_time,
        maxResults=1000,
    )

    while request:
        response = request.execute()
        for activity in response.get('items', []):
            event = {
                'timestamp': activity['id']['time'],
                'user': activity['actor']['email'],
                'ip_address': activity.get('ipAddress', 'unknown'),
                'events': [],
            }

            for e in activity.get('events', []):
                event_data = {
                    'type': e.get('type', ''),
                    'name': e.get('name', ''),
                    'parameters': {},
                }
                for param in e.get('parameters', []):
                    event_data['parameters'][param['name']] = param.get(
                        'value', param.get('multiValue', '')
                    )
                event['events'].append(event_data)

            events.append(event)

        request = service.activities().list_next(request, response)

    return events

def store_login_events(events, project_id, dataset_id):
    """Store login events in BigQuery for analysis."""
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.{dataset_id}.workspace_logins"

    rows = []
    for event in events:
        for e in event['events']:
            rows.append({
                'timestamp': event['timestamp'],
                'user_email': event['user'],
                'source_ip': event['ip_address'],
                'event_type': e['type'],
                'event_name': e['name'],
                'login_type': e['parameters'].get('login_type', ''),
                'is_suspicious': e['parameters'].get('is_suspicious', 'false'),
            })

    if rows:
        errors = client.insert_rows_json(table_id, rows)
        if errors:
            print(f"Errors storing events: {errors}")
        else:
            print(f"Stored {len(rows)} login events")
```

## Step 3: Track Service Account Authentication

Service account usage is particularly important to monitor because compromised service account keys are a common attack vector.

```sql
-- Find service accounts authenticating from unusual IPs
-- Compare last 24 hours against the previous 30-day baseline
WITH baseline AS (
    SELECT
        protopayload_auditlog.authenticationInfo.principalEmail AS sa_email,
        protopayload_auditlog.requestMetadata.callerIp AS ip,
        COUNT(*) AS baseline_count
    FROM `audit-project.auth_events.cloudaudit_googleapis_com_activity_*`
    WHERE protopayload_auditlog.authenticationInfo.principalEmail
          LIKE '%gserviceaccount.com'
    AND _TABLE_SUFFIX BETWEEN
        FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
        AND FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    GROUP BY sa_email, ip
),
recent AS (
    SELECT
        protopayload_auditlog.authenticationInfo.principalEmail AS sa_email,
        protopayload_auditlog.requestMetadata.callerIp AS ip,
        COUNT(*) AS recent_count,
        ARRAY_AGG(DISTINCT protopayload_auditlog.methodName LIMIT 10) AS methods
    FROM `audit-project.auth_events.cloudaudit_googleapis_com_activity_*`
    WHERE protopayload_auditlog.authenticationInfo.principalEmail
          LIKE '%gserviceaccount.com'
    AND _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    GROUP BY sa_email, ip
)
SELECT
    r.sa_email,
    r.ip AS new_source_ip,
    r.recent_count AS requests_today,
    r.methods AS api_methods_used
FROM recent r
LEFT JOIN baseline b ON r.sa_email = b.sa_email AND r.ip = b.ip
WHERE b.ip IS NULL  -- IP not seen in baseline period
AND r.ip NOT IN ('private', 'gce-internal')
ORDER BY r.recent_count DESC;
```

## Step 4: Build Real-Time Authentication Alerts

Set up Cloud Functions triggered by Pub/Sub to process authentication events in real time.

```python
import json
import base64
from collections import defaultdict
from google.cloud import firestore

db = firestore.Client()

def process_auth_event(event, context):
    """Process authentication events for real-time alerting."""
    message = json.loads(base64.b64decode(event['data']).decode())

    audit_log = message.get('protoPayload', {})
    auth_info = audit_log.get('authenticationInfo', {})
    request_meta = audit_log.get('requestMetadata', {})

    principal = auth_info.get('principalEmail', 'unknown')
    source_ip = request_meta.get('callerIp', 'unknown')
    method = audit_log.get('methodName', 'unknown')
    status = audit_log.get('status', {})

    # Check for failed authentication
    if status.get('code', 0) != 0:
        handle_failed_auth(principal, source_ip, method)

    # Check for service account key creation
    if 'CreateServiceAccountKey' in method:
        alert_sa_key_creation(principal, audit_log)

    # Check for unusual authentication patterns
    check_geo_anomaly(principal, source_ip)

def handle_failed_auth(principal, source_ip, method):
    """Track failed authentication attempts and alert on threshold."""
    # Use Firestore to track failure counts
    doc_ref = db.collection('auth_failures').document(
        f"{principal}_{source_ip}".replace('@', '_at_').replace('.', '_')
    )

    doc = doc_ref.get()
    if doc.exists:
        data = doc.to_dict()
        failure_count = data.get('count', 0) + 1
    else:
        failure_count = 1

    doc_ref.set({
        'principal': principal,
        'source_ip': source_ip,
        'count': failure_count,
        'last_failure': firestore.SERVER_TIMESTAMP,
    })

    # Alert if threshold exceeded
    if failure_count >= 5:
        send_alert(
            severity='HIGH',
            title='Multiple Authentication Failures',
            detail=f'{principal} has {failure_count} failed auth attempts '
                   f'from {source_ip}',
        )

def alert_sa_key_creation(principal, audit_log):
    """Alert when a service account key is created."""
    resource = audit_log.get('resourceName', 'unknown')
    send_alert(
        severity='MEDIUM',
        title='Service Account Key Created',
        detail=f'{principal} created a service account key for {resource}. '
               f'Verify this was authorized.',
    )

def check_geo_anomaly(principal, source_ip):
    """Check for impossible travel or unusual login locations."""
    # Look up the previous login for this user
    doc_ref = db.collection('last_login').document(
        principal.replace('@', '_at_').replace('.', '_')
    )
    doc = doc_ref.get()

    if doc.exists:
        last_data = doc.to_dict()
        last_ip = last_data.get('ip', '')

        # If the IP changed, check the geo distance
        if last_ip != source_ip:
            # Use a GeoIP lookup to check for impossible travel
            last_country = geoip_lookup(last_ip)
            current_country = geoip_lookup(source_ip)

            if last_country != current_country:
                time_diff = calculate_time_diff(
                    last_data.get('timestamp'), datetime.utcnow()
                )
                # Alert if login from different country in less than 2 hours
                if time_diff < 7200:
                    send_alert(
                        severity='HIGH',
                        title='Impossible Travel Detected',
                        detail=f'{principal} logged in from {current_country} '
                               f'({source_ip}) shortly after logging in from '
                               f'{last_country} ({last_ip})',
                    )

    # Update last login record
    doc_ref.set({
        'ip': source_ip,
        'timestamp': firestore.SERVER_TIMESTAMP,
    })
```

## Step 5: Generate Compliance Reports

Create scheduled reports that summarize authentication activity for compliance auditors.

```python
from google.cloud import bigquery

def generate_auth_compliance_report(project_id, start_date, end_date):
    """Generate an authentication compliance report."""
    client = bigquery.Client(project=project_id)

    report_sections = {}

    # Section 1: Login activity summary
    query = f"""
    SELECT
        COUNT(DISTINCT protopayload_auditlog.authenticationInfo.principalEmail) AS unique_users,
        COUNT(*) AS total_auth_events,
        COUNTIF(protopayload_auditlog.status.code != 0) AS failed_events,
        COUNTIF(protopayload_auditlog.status.code = 0) AS successful_events
    FROM `audit-project.auth_events.cloudaudit_googleapis_com_activity_*`
    WHERE _TABLE_SUFFIX BETWEEN
        FORMAT_DATE('%Y%m%d', DATE('{start_date}'))
        AND FORMAT_DATE('%Y%m%d', DATE('{end_date}'))
    """
    result = list(client.query(query).result())
    report_sections['summary'] = {
        'unique_users': result[0].unique_users,
        'total_events': result[0].total_auth_events,
        'failed_events': result[0].failed_events,
        'success_rate': f"{(result[0].successful_events / max(result[0].total_auth_events, 1)) * 100:.1f}%",
    }

    # Section 2: Service account key usage
    query = f"""
    SELECT
        protopayload_auditlog.authenticationInfo.principalEmail AS sa_email,
        COUNT(DISTINCT protopayload_auditlog.requestMetadata.callerIp) AS unique_ips,
        COUNT(*) AS total_requests,
        MIN(timestamp) AS first_seen,
        MAX(timestamp) AS last_seen
    FROM `audit-project.auth_events.cloudaudit_googleapis_com_activity_*`
    WHERE protopayload_auditlog.authenticationInfo.principalEmail
          LIKE '%gserviceaccount.com'
    AND _TABLE_SUFFIX BETWEEN
        FORMAT_DATE('%Y%m%d', DATE('{start_date}'))
        AND FORMAT_DATE('%Y%m%d', DATE('{end_date}'))
    GROUP BY sa_email
    ORDER BY total_requests DESC
    LIMIT 50
    """
    sa_results = list(client.query(query).result())
    report_sections['service_accounts'] = [
        {
            'email': r.sa_email,
            'unique_ips': r.unique_ips,
            'total_requests': r.total_requests,
        }
        for r in sa_results
    ]

    return report_sections
```

Monitoring authentication events across your GCP organization gives you the visibility needed to detect compromised credentials, insider threats, and unauthorized access attempts. The combination of comprehensive audit logging, real-time alerting, and scheduled compliance reports ensures that you catch security issues early and have the evidence auditors require.
