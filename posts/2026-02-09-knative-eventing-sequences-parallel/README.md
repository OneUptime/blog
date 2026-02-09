# How to Build Serverless Workflows with Knative Eventing Sequences and Parallel Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Serverless, Event-Driven, Workflows

Description: Learn to orchestrate complex serverless workflows using Knative Eventing Sequences for sequential processing and Parallel for concurrent event processing.

---

Knative Eventing provides powerful primitives for building serverless workflows. Sequences enable you to chain multiple processing steps together, while Parallel resources allow concurrent processing of events through multiple branches. This guide shows you how to build sophisticated event-driven workflows using these components.

## Understanding Sequences and Parallel Processing

A Sequence in Knative defines an ordered list of processing steps. Events flow through each step sequentially, with the output of one step becoming the input to the next. This pattern is perfect for ETL pipelines, data enrichment workflows, and multi-stage validation.

Parallel resources split events across multiple branches that execute concurrently. Each branch processes the event independently, and results can be aggregated. This enables fan-out patterns, concurrent validations, and parallel enrichment.

Both primitives use the CloudEvents standard, ensuring consistent event handling across your workflow.

## Setting Up Knative Eventing

Before building workflows, ensure Knative Eventing is installed:

```bash
# Install Knative Eventing
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/eventing-crds.yaml
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/eventing-core.yaml

# Install in-memory channel (for development)
kubectl apply -f https://github.com/knative/eventing/releases/latest/download/in-memory-channel.yaml

# Verify installation
kubectl get pods -n knative-eventing
```

For production, use Kafka or NATS channels instead of in-memory channels for durability.

## Creating Your First Sequence

A Sequence chains multiple Knative Services together. Here's a data processing pipeline that validates, enriches, and stores user registration events:

```yaml
# user-registration-sequence.yaml
apiVersion: flows.knative.dev/v1
kind: Sequence
metadata:
  name: user-registration-pipeline
  namespace: default
spec:
  # Channel template for communication between steps
  channelTemplate:
    apiVersion: messaging.knative.dev/v1
    kind: InMemoryChannel

  # Sequential processing steps
  steps:
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: validate-user
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: enrich-user-data
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: store-user

  # Final destination after all steps complete
  reply:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: registration-complete-handler
```

Each service in the sequence receives a CloudEvent, processes it, and returns a modified CloudEvent:

```javascript
// validate-user/server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  const event = req.body;

  // Validate user data
  if (!event.email || !event.email.includes('@')) {
    return res.status(400).json({
      error: 'Invalid email address'
    });
  }

  if (!event.password || event.password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters'
    });
  }

  // Add validation status
  event.validated = true;
  event.validatedAt = new Date().toISOString();

  console.log(`Validated user: ${event.email}`);

  // Return modified event as CloudEvent
  res.set('Content-Type', 'application/json');
  res.status(200).json(event);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Validation service on ${PORT}`));
```

The enrichment service adds additional data:

```javascript
// enrich-user-data/server.js
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  const event = req.body;

  try {
    // Call external service to get user location from IP
    const geoData = await axios.get(`http://geoip-service/lookup/${event.ip}`);

    // Enrich event with location data
    event.location = {
      country: geoData.data.country,
      region: geoData.data.region,
      city: geoData.data.city
    };

    // Add risk score based on location
    event.riskScore = calculateRiskScore(event.location);
    event.enrichedAt = new Date().toISOString();

    console.log(`Enriched user: ${event.email} from ${event.location.country}`);

    res.status(200).json(event);
  } catch (error) {
    console.error('Enrichment failed:', error.message);
    // Pass through without enrichment on error
    event.enrichmentFailed = true;
    res.status(200).json(event);
  }
});

function calculateRiskScore(location) {
  // Your risk calculation logic
  return location.country === 'US' ? 'low' : 'medium';
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Enrichment service on ${PORT}`));
```

Deploy these services:

```yaml
# validation-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: validate-user
spec:
  template:
    spec:
      containers:
      - image: your-registry/validate-user:latest
        ports:
        - containerPort: 8080
---
# enrichment-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: enrich-user-data
spec:
  template:
    spec:
      containers:
      - image: your-registry/enrich-user-data:latest
        ports:
        - containerPort: 8080
---
# storage-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: store-user
spec:
  template:
    spec:
      containers:
      - image: your-registry/store-user:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

## Sending Events to Your Sequence

Send events to the Sequence using a Broker and Trigger, or directly to the Sequence address:

```bash
# Get the Sequence address
kubectl get sequence user-registration-pipeline -o jsonpath='{.status.address.url}'

# Send a test event
curl -X POST \
  -H "Ce-Id: 001" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: user.registration" \
  -H "Ce-Source: web-app" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password-123",
    "ip": "192.168.1.100"
  }' \
  http://user-registration-pipeline-kn-sequence.default.svc.cluster.local
```

## Building Parallel Workflows

Parallel resources execute multiple branches concurrently. Here's an example that performs multiple checks on an uploaded document:

```yaml
# document-processing-parallel.yaml
apiVersion: flows.knative.dev/v1
kind: Parallel
metadata:
  name: document-analysis
  namespace: default
spec:
  # Channel template
  channelTemplate:
    apiVersion: messaging.knative.dev/v1
    kind: InMemoryChannel

  # Parallel branches
  branches:
    - subscriber:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: virus-scanner
      reply:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: result-aggregator

    - subscriber:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: content-classifier
      reply:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: result-aggregator

    - subscriber:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: ocr-extractor
      reply:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: result-aggregator

    - subscriber:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: metadata-extractor
      reply:
        ref:
          apiVersion: serving.knative.dev/v1
          kind: Service
          name: result-aggregator

  # Optional filter to pre-process events
  reply:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: final-processor
```

Each branch processes the document independently:

```python
# virus-scanner/app.py
from flask import Flask, request, jsonify
import hashlib
import requests

app = Flask(__name__)

@app.route('/', methods=['POST'])
def scan_document():
    event = request.get_json()
    document_url = event.get('documentUrl')

    # Download and scan document
    try:
        response = requests.get(document_url)
        file_hash = hashlib.sha256(response.content).hexdigest()

        # Check against virus database
        is_safe = check_virus_database(file_hash)

        # Return scan results
        result = {
            'branch': 'virus-scanner',
            'documentId': event.get('documentId'),
            'safe': is_safe,
            'hash': file_hash,
            'scannedAt': datetime.now().isoformat()
        }

        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            'branch': 'virus-scanner',
            'error': str(e),
            'documentId': event.get('documentId')
        }), 200  # Return 200 to not fail the workflow

def check_virus_database(file_hash):
    # Check against virus signature database
    # Return True if safe, False if malware detected
    return True

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

The result aggregator collects responses from all branches:

```javascript
// result-aggregator/server.js
const express = require('express');
const app = express();
app.use(express.json());

// Store partial results
const results = new Map();

app.post('/', (req, res) => {
  const result = req.body;
  const docId = result.documentId;

  // Store this branch's result
  if (!results.has(docId)) {
    results.set(docId, []);
  }
  results.get(docId).push(result);

  // Check if we have all results (4 branches)
  const docResults = results.get(docId);
  if (docResults.length === 4) {
    // All branches completed
    const aggregated = aggregateResults(docResults);

    // Clean up
    results.delete(docId);

    // Return aggregated result
    return res.status(200).json(aggregated);
  }

  // More results pending
  res.status(200).json({ status: 'partial', count: docResults.length });
});

function aggregateResults(branchResults) {
  const aggregated = {
    documentId: branchResults[0].documentId,
    timestamp: new Date().toISOString(),
    results: {}
  };

  // Combine results from all branches
  branchResults.forEach(result => {
    aggregated.results[result.branch] = result;
  });

  // Determine overall document status
  aggregated.safe = branchResults.every(r => r.safe !== false);
  aggregated.processed = branchResults.every(r => !r.error);

  return aggregated;
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Aggregator on ${PORT}`));
```

## Combining Sequences and Parallel

Build complex workflows by nesting Sequences within Parallel branches or vice versa:

```yaml
# complex-workflow.yaml
apiVersion: flows.knative.dev/v1
kind: Sequence
metadata:
  name: order-processing
spec:
  channelTemplate:
    apiVersion: messaging.knative.dev/v1
    kind: InMemoryChannel
  steps:
    # Step 1: Validate order
    - ref:
        kind: Service
        apiVersion: serving.knative.dev/v1
        name: validate-order

    # Step 2: Parallel processing for inventory, payment, shipping
    - ref:
        kind: Parallel
        apiVersion: flows.knative.dev/v1
        name: order-parallel-checks

    # Step 3: Finalize order
    - ref:
        kind: Service
        apiVersion: serving.knative.dev/v1
        name: finalize-order
```

## Monitoring and Debugging Workflows

Track workflow execution:

```bash
# Check Sequence status
kubectl get sequence user-registration-pipeline -o yaml

# View Sequence channel status
kubectl get channels

# Check Parallel status
kubectl get parallel document-analysis -o yaml

# View logs from a specific step
kubectl logs -l serving.knative.dev/service=validate-user -c user-container

# Trace events through the workflow
kubectl get events --sort-by='.lastTimestamp'
```

## Error Handling and Retries

Implement error handling at each step:

```javascript
// error-handling-service.js
app.post('/', async (req, res) => {
  const event = req.body;
  const attemptCount = parseInt(event.attemptCount || '0');

  try {
    const result = await processEvent(event);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Processing failed (attempt ${attemptCount}):`, error);

    if (attemptCount < 3) {
      // Increment retry count and return for retry
      event.attemptCount = (attemptCount + 1).toString();
      event.lastError = error.message;
      return res.status(500).json(event);
    } else {
      // Send to dead letter queue after max retries
      event.failed = true;
      event.error = error.message;
      res.status(200).json(event);
    }
  }
});
```

## Best Practices

Design idempotent services. Each step in your workflow may be called multiple times due to retries. Use request IDs to detect and handle duplicate processing.

Keep services focused. Each step should perform a single, well-defined operation. This makes workflows easier to understand, test, and modify.

Use appropriate timeouts. Configure reasonable timeout values for each service based on expected processing time. Long-running operations should use async patterns with status checks.

Implement comprehensive logging. Log event IDs and workflow steps to enable end-to-end tracing. Use structured logging to facilitate debugging.

Handle partial failures gracefully. In Parallel workflows, don't fail the entire workflow if one branch fails. Aggregate results and make decisions based on what succeeded.

## Conclusion

Knative Eventing Sequences and Parallel resources provide powerful building blocks for serverless workflows. By combining sequential and parallel processing, you can orchestrate complex event-driven applications that scale automatically and handle failures gracefully. Start with simple workflows and gradually add complexity as your requirements evolve. The CloudEvents standard ensures your services remain loosely coupled and easy to test independently.
