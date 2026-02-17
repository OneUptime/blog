# How to Migrate Azure Functions to Google Cloud Functions with Runtime Parity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Functions, Azure Functions, Serverless, Cloud Migration

Description: A practical walkthrough for migrating Azure Functions to Google Cloud Functions, covering trigger conversion, binding translation, and achieving runtime parity across platforms.

---

Azure Functions and Google Cloud Functions are both serverless compute platforms, but they differ in how they handle triggers, bindings, and configuration. Azure Functions has a rich binding system that lets you declaratively connect to services like Cosmos DB, Service Bus, and Blob Storage. Cloud Functions takes a simpler approach where you explicitly use client libraries to interact with services.

This guide covers the practical steps to migrate your functions while maintaining equivalent functionality.

## Service Comparison

| Feature | Azure Functions | Google Cloud Functions |
|---------|----------------|----------------------|
| Runtimes | .NET, Node.js, Python, Java, PowerShell | Node.js, Python, Go, Java, .NET, Ruby, PHP |
| Trigger types | HTTP, Timer, Queue, Blob, Cosmos DB, Event Hub, etc. | HTTP, Pub/Sub, Cloud Storage, Firestore, Eventarc |
| Bindings | Input/output bindings (declarative) | Explicit SDK calls |
| Config | function.json + host.json | Deploy-time config |
| Local dev | Azure Functions Core Tools | Functions Framework |
| Gen2 | N/A | Cloud Functions 2nd gen (Cloud Run-based) |
| Cold start | Variable by plan | Variable by tier |

## Step 1: Inventory Your Azure Functions

List all your function apps and their configurations.

```bash
# List all function apps
az functionapp list \
  --query '[*].{Name:name,Runtime:siteConfig.linuxFxVersion,Region:location,Plan:appServicePlanId}' \
  --output table

# List functions within a function app
az functionapp function list \
  --name my-function-app \
  --resource-group my-rg \
  --query '[*].{Name:name,Trigger:config.bindings[0].type}' \
  --output table

# Export function app settings
az functionapp config appsettings list \
  --name my-function-app \
  --resource-group my-rg \
  --output json
```

## Step 2: Convert HTTP Triggers

HTTP-triggered functions are the most straightforward to migrate.

Azure Functions (Node.js):

```javascript
// Azure Functions HTTP trigger
// function.json defines the trigger configuration
module.exports = async function (context, req) {
    context.log('Processing HTTP request');

    const name = req.query.name || (req.body && req.body.name);

    if (name) {
        context.res = {
            status: 200,
            body: { message: `Hello, ${name}!` }
        };
    } else {
        context.res = {
            status: 400,
            body: { error: 'Please provide a name' }
        };
    }
};
```

Google Cloud Functions equivalent:

```javascript
// Google Cloud Functions HTTP trigger
const functions = require('@google-cloud/functions-framework');

// Register the HTTP function
functions.http('hello', (req, res) => {
    console.log('Processing HTTP request');

    const name = req.query.name || (req.body && req.body.name);

    if (name) {
        res.status(200).json({ message: `Hello, ${name}!` });
    } else {
        res.status(400).json({ error: 'Please provide a name' });
    }
});
```

Deploy the function:

```bash
gcloud functions deploy hello \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=hello \
  --trigger-http \
  --allow-unauthenticated
```

## Step 3: Convert Timer Triggers

Azure Functions timer triggers become Cloud Scheduler jobs that invoke HTTP-triggered Cloud Functions.

Azure Functions timer trigger:

```python
# Azure Functions timer trigger
import azure.functions as func
import logging

def main(mytimer: func.TimerRequest) -> None:
    if mytimer.past_due:
        logging.info('Timer is past due')

    logging.info('Running scheduled cleanup')
    cleanup_old_records()
```

Cloud Functions equivalent:

```python
# Cloud Function triggered by Cloud Scheduler via HTTP
import functions_framework
from datetime import datetime

@functions_framework.http
def scheduled_cleanup(request):
    """HTTP function triggered by Cloud Scheduler."""
    print(f'Running scheduled cleanup at {datetime.now()}')
    cleanup_old_records()
    return 'Cleanup complete', 200
```

Set up the scheduler:

```bash
# Deploy the function
gcloud functions deploy scheduled-cleanup \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=scheduled_cleanup \
  --trigger-http \
  --no-allow-unauthenticated \
  --service-account=scheduler-sa@my-project.iam.gserviceaccount.com

# Create Cloud Scheduler job (equivalent to Azure timer trigger with cron)
gcloud scheduler jobs create http cleanup-job \
  --schedule="0 */6 * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/scheduled-cleanup" \
  --http-method=POST \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --location=us-central1
```

## Step 4: Convert Queue/Topic Triggers

Azure Functions queue triggers (Service Bus, Storage Queue) map to Pub/Sub-triggered Cloud Functions.

Azure Functions Service Bus trigger:

```python
# Azure Functions Service Bus queue trigger
import azure.functions as func
import json
import logging

def main(msg: func.ServiceBusMessage):
    message_body = msg.get_body().decode('utf-8')
    data = json.loads(message_body)
    logging.info(f'Processing order: {data["order_id"]}')
    process_order(data)
```

Cloud Functions with Pub/Sub trigger:

```python
# Cloud Function triggered by Pub/Sub message
import functions_framework
import base64
import json

@functions_framework.cloud_event
def process_order(cloud_event):
    """Process order events from Pub/Sub."""
    # Decode the message payload
    message_data = base64.b64decode(cloud_event.data['message']['data']).decode('utf-8')
    data = json.loads(message_data)

    print(f'Processing order: {data["order_id"]}')
    handle_order(data)
```

Deploy with Pub/Sub trigger:

```bash
gcloud functions deploy process-order \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_order \
  --trigger-topic=order-events \
  --service-account=order-processor@my-project.iam.gserviceaccount.com
```

## Step 5: Convert Blob/Storage Triggers

Azure Functions blob triggers map to Cloud Storage-triggered Cloud Functions.

Azure Functions blob trigger:

```javascript
// Azure Functions blob trigger
module.exports = async function (context, myBlob) {
    context.log(`Processing blob: ${context.bindingData.name}`);
    context.log(`Blob size: ${myBlob.length} bytes`);

    // Process the uploaded file
    const result = await processImage(myBlob);

    // Output binding writes to another container
    context.bindings.outputBlob = result;
};
```

Cloud Functions with Cloud Storage trigger:

```javascript
// Cloud Function triggered by Cloud Storage events
const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

// Register the Cloud Storage event handler
functions.cloudEvent('processUpload', async (cloudEvent) => {
    const file = cloudEvent.data;
    console.log(`Processing file: ${file.name} in bucket: ${file.bucket}`);

    // Download the file
    const bucket = storage.bucket(file.bucket);
    const [contents] = await bucket.file(file.name).download();
    console.log(`File size: ${contents.length} bytes`);

    // Process the file
    const result = await processImage(contents);

    // Write output to another bucket (replaces output binding)
    const outputBucket = storage.bucket('processed-files');
    await outputBucket.file(`processed-${file.name}`).save(result);
});
```

Deploy:

```bash
gcloud functions deploy process-upload \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processUpload \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-upload-bucket" \
  --service-account=file-processor@my-project.iam.gserviceaccount.com
```

## Step 6: Replace Azure Bindings with SDK Calls

Azure Functions' declarative bindings (input/output) do not have equivalents in Cloud Functions. Replace them with explicit SDK calls.

Azure Functions with Cosmos DB input binding:

```javascript
// Azure Functions with Cosmos DB input binding (defined in function.json)
module.exports = async function (context, req, inputDocument) {
    // inputDocument is automatically fetched by the binding
    if (!inputDocument) {
        context.res = { status: 404, body: 'Not found' };
        return;
    }
    context.res = { status: 200, body: inputDocument };
};
```

Cloud Functions with Firestore SDK call:

```javascript
// Cloud Function with explicit Firestore read
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore();

functions.http('getDocument', async (req, res) => {
    const docId = req.query.id;

    // Explicit Firestore read (replaces input binding)
    const doc = await firestore.collection('items').doc(docId).get();

    if (!doc.exists) {
        res.status(404).json({ error: 'Not found' });
        return;
    }

    res.status(200).json(doc.data());
});
```

## Step 7: Migrate Configuration

Azure Functions use local.settings.json and Application Settings. Cloud Functions use environment variables and Secret Manager.

```bash
# Set environment variables during deployment
gcloud functions deploy my-function \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=myFunction \
  --trigger-http \
  --set-env-vars=API_URL=https://api.example.com,LOG_LEVEL=info \
  --set-secrets=DB_PASSWORD=db-password:latest
```

## Step 8: Test and Validate

Test your migrated functions locally using the Functions Framework:

```bash
# Install the functions framework for local testing
npm install @google-cloud/functions-framework

# Run locally
npx functions-framework --target=hello --port=8080

# Test with curl
curl http://localhost:8080?name=test
```

For Python:

```bash
pip install functions-framework
functions-framework --target=process_order --port=8080
```

## Summary

The migration from Azure Functions to Cloud Functions is primarily about two things: converting triggers and replacing declarative bindings with explicit SDK calls. HTTP triggers are nearly identical. Timer triggers need Cloud Scheduler as an intermediary. Queue and blob triggers map well to Pub/Sub and Cloud Storage events. The loss of declarative bindings means more code, but it also means more control and easier debugging. Use Cloud Functions 2nd gen for better performance, longer timeout support, and Cloud Run-based infrastructure under the hood.
