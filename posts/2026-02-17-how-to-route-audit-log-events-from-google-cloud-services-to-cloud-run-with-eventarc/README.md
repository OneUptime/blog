# How to Route Audit Log Events from Google Cloud Services to Cloud Run with Eventarc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Eventarc, Audit Logs, Cloud Run, Security

Description: Learn how to use Eventarc to route Cloud Audit Log events from any Google Cloud service to Cloud Run for automated security monitoring and compliance responses.

---

Every action in Google Cloud generates an audit log entry - creating a VM, modifying a firewall rule, changing IAM permissions, accessing a Cloud Storage object. Eventarc lets you capture these audit log events and route them to Cloud Run services in real time. This is powerful for security automation, compliance monitoring, and building reactive systems that respond to infrastructure changes.

In this post, I will show you how to set up Eventarc triggers for audit log events and build Cloud Run handlers that respond to them.

## Understanding Cloud Audit Logs

Google Cloud generates several types of audit logs:

- **Admin Activity logs**: Always on, capture admin actions like creating resources, changing configurations, modifying IAM policies
- **Data Access logs**: Must be enabled, capture data read/write operations
- **System Event logs**: Capture Google-initiated system events
- **Policy Denied logs**: Capture requests denied by VPC Service Controls or Organization Policies

Eventarc can trigger on Admin Activity and Data Access logs. Admin Activity logs are the most useful for security automation because they capture all infrastructure changes.

## Prerequisites

```bash
# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  eventarc.googleapis.com \
  logging.googleapis.com
```

For Data Access audit logs, you need to explicitly enable them.

```bash
# Enable Data Access audit logs for a specific service (e.g., Cloud Storage)
# This is done through the IAM audit configuration
gcloud projects get-iam-policy YOUR_PROJECT --format=json > /tmp/policy.json
# Edit the policy to add audit log configuration, then set it back
```

## Step 1: Build the Audit Log Handler

Create a Cloud Run service that processes audit log events.

```javascript
// server.js
// Cloud Run service that handles Cloud Audit Log events via Eventarc
const express = require("express");
const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  // CloudEvents headers
  const eventType = req.headers["ce-type"];
  const eventSubject = req.headers["ce-subject"];
  const eventId = req.headers["ce-id"];

  console.log(`Audit event: ${eventType}`);
  console.log(`Subject: ${eventSubject}`);

  // The audit log entry is in the request body
  const protoPayload = req.body.protoPayload;

  if (!protoPayload) {
    console.error("No protoPayload found in event");
    res.status(200).send("No payload");
    return;
  }

  // Extract key information from the audit log
  const serviceName = protoPayload.serviceName;
  const methodName = protoPayload.methodName;
  const principalEmail = protoPayload.authenticationInfo?.principalEmail;
  const resourceName = protoPayload.resourceName;
  const timestamp = req.body.timestamp;

  console.log(`Service: ${serviceName}`);
  console.log(`Method: ${methodName}`);
  console.log(`Principal: ${principalEmail}`);
  console.log(`Resource: ${resourceName}`);

  try {
    // Route to specific handlers based on the service and method
    await routeAuditEvent(serviceName, methodName, {
      principal: principalEmail,
      resource: resourceName,
      timestamp,
      fullPayload: protoPayload,
    });

    res.status(200).json({ status: "processed" });
  } catch (error) {
    console.error(`Error handling audit event: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

async function routeAuditEvent(service, method, details) {
  // IAM changes - high priority security event
  if (service === "iam.googleapis.com") {
    await handleIamChange(method, details);
    return;
  }

  // Compute Engine changes
  if (service === "compute.googleapis.com") {
    await handleComputeChange(method, details);
    return;
  }

  // Cloud Storage changes
  if (service === "storage.googleapis.com") {
    await handleStorageChange(method, details);
    return;
  }

  // BigQuery changes
  if (service === "bigquery.googleapis.com") {
    await handleBigQueryChange(method, details);
    return;
  }

  console.log(`Unhandled service: ${service}, method: ${method}`);
}

async function handleIamChange(method, details) {
  console.log(`IAM CHANGE DETECTED: ${method}`);
  console.log(`Principal: ${details.principal}`);
  console.log(`Resource: ${details.resource}`);

  // Alert on sensitive IAM changes
  const sensitiveActions = [
    "google.iam.admin.v1.SetIamPolicy",
    "SetIamPolicy",
    "google.iam.admin.v1.CreateServiceAccount",
    "google.iam.admin.v1.CreateServiceAccountKey",
  ];

  if (sensitiveActions.some((action) => method.includes(action))) {
    await sendSecurityAlert({
      severity: "HIGH",
      title: "Sensitive IAM Change Detected",
      description: `${details.principal} performed ${method} on ${details.resource}`,
      timestamp: details.timestamp,
    });
  }
}

async function handleComputeChange(method, details) {
  console.log(`Compute change: ${method}`);

  // Alert on firewall rule changes
  if (method.includes("firewalls")) {
    await sendSecurityAlert({
      severity: "MEDIUM",
      title: "Firewall Rule Change",
      description: `${details.principal} modified firewall rules: ${method}`,
      timestamp: details.timestamp,
    });
  }

  // Alert on external IP creation
  if (method.includes("addresses.insert")) {
    console.log("New external IP allocated");
  }
}

async function handleStorageChange(method, details) {
  console.log(`Storage change: ${method}`);

  // Alert on bucket policy changes that might make data public
  if (method.includes("SetIamPolicy") || method.includes("setIamPolicy")) {
    await sendSecurityAlert({
      severity: "HIGH",
      title: "Storage Bucket Policy Change",
      description: `${details.principal} changed IAM policy on ${details.resource}`,
      timestamp: details.timestamp,
    });
  }
}

async function handleBigQueryChange(method, details) {
  console.log(`BigQuery change: ${method}`);
}

async function sendSecurityAlert(alert) {
  console.log(`SECURITY ALERT [${alert.severity}]: ${alert.title}`);
  console.log(`Description: ${alert.description}`);

  // Send to Slack, PagerDuty, email, etc.
  // Example: send to Slack webhook
  try {
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[${alert.severity}] ${alert.title}\n${alert.description}\nTime: ${alert.timestamp}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send alert:", error);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Audit log handler on port ${PORT}`);
});
```

Deploy the service.

```bash
# Deploy the audit log handler
gcloud run deploy audit-log-handler \
  --source=. \
  --region=us-central1 \
  --no-allow-unauthenticated \
  --memory=256Mi \
  --timeout=60s \
  --set-env-vars="ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK"
```

## Step 2: Create Eventarc Triggers for Audit Logs

Create triggers for specific service audit events.

```bash
# Create service account for triggers
gcloud iam service-accounts create audit-trigger-sa \
  --display-name="Audit Log Trigger SA"

gcloud run services add-iam-policy-binding audit-log-handler \
  --region=us-central1 \
  --member="serviceAccount:audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Trigger for IAM policy changes
gcloud eventarc triggers create iam-policy-changes \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=iam.googleapis.com" \
  --event-filters="methodName=SetIamPolicy" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com

# Trigger for Compute Engine firewall changes
gcloud eventarc triggers create firewall-changes \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.firewalls.insert" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com

# Trigger for Cloud Storage bucket IAM changes
gcloud eventarc triggers create storage-iam-changes \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=storage.googleapis.com" \
  --event-filters="methodName=storage.setIamPermissions" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com
```

## Common Audit Log Triggers

Here are event filters for common security-relevant audit events.

```bash
# VM instance creation
gcloud eventarc triggers create vm-creation \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.instances.insert" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com

# Service account key creation (high security risk)
gcloud eventarc triggers create sa-key-creation \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=iam.googleapis.com" \
  --event-filters="methodName=google.iam.admin.v1.CreateServiceAccountKey" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com

# BigQuery dataset access changes
gcloud eventarc triggers create bq-access-changes \
  --location=us-central1 \
  --destination-run-service=audit-log-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=bigquery.googleapis.com" \
  --event-filters="methodName=google.iam.v1.IAMPolicy.SetIamPolicy" \
  --service-account=audit-trigger-sa@YOUR_PROJECT.iam.gserviceaccount.com
```

## Finding the Right Service and Method Names

To find the correct `serviceName` and `methodName` for your triggers, check existing audit logs.

```bash
# Search audit logs for a specific service
gcloud logging read \
  'protoPayload.serviceName="compute.googleapis.com" AND logName:"activity"' \
  --limit=10 \
  --format="table(protoPayload.serviceName, protoPayload.methodName, protoPayload.authenticationInfo.principalEmail)"

# Search for all distinct method names for a service
gcloud logging read \
  'protoPayload.serviceName="iam.googleapis.com" AND logName:"activity"' \
  --limit=50 \
  --format="value(protoPayload.methodName)" | sort -u
```

## Testing the Triggers

Trigger an audit event by performing the monitored action.

```bash
# Example: Create a firewall rule to trigger the firewall change event
gcloud compute firewall-rules create test-rule-eventarc \
  --allow=tcp:8080 \
  --source-ranges=10.0.0.0/8 \
  --description="Test rule for Eventarc trigger"

# Check the Cloud Run logs for the event
gcloud run services logs read audit-log-handler \
  --region=us-central1 \
  --limit=10

# Clean up the test rule
gcloud compute firewall-rules delete test-rule-eventarc --quiet
```

## Managing Triggers

```bash
# List all audit log triggers
gcloud eventarc triggers list --location=us-central1

# View trigger details
gcloud eventarc triggers describe iam-policy-changes --location=us-central1

# Delete a trigger
gcloud eventarc triggers delete iam-policy-changes --location=us-central1
```

## Wrapping Up

Routing audit log events to Cloud Run with Eventarc is a powerful pattern for security automation and compliance monitoring. Instead of periodically scanning logs, you get real-time notifications when sensitive actions occur. The setup involves creating a Cloud Run handler that parses audit log payloads, creating Eventarc triggers filtered by service and method, and implementing appropriate alerting for security-relevant events. Start with the highest-risk events - IAM changes, firewall modifications, and public access changes - and expand your coverage from there.
