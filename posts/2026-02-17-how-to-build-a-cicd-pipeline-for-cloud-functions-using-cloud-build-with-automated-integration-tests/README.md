# How to Build a CI/CD Pipeline for Cloud Functions Using Cloud Build with Automated Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Cloud Build, CI/CD, Integration Testing

Description: Learn how to build a robust CI/CD pipeline for Google Cloud Functions using Cloud Build with automated unit and integration testing for reliable serverless deployments.

---

Cloud Functions are easy to write and deploy, but without a proper CI/CD pipeline, they can also be easy to break. A quick `gcloud functions deploy` from a developer's laptop works for prototyping, but for production workloads, you need automated testing, consistent builds, and controlled deployments.

In this post, I will show you how to build a Cloud Build pipeline for Cloud Functions that runs unit tests, integration tests, and deploys with confidence.

## Project Structure

Start with a well-organized project structure:

```
my-functions/
  functions/
    process-orders/
      index.js
      package.json
      test/
        unit/
          index.test.js
        integration/
          index.integration.test.js
    send-notifications/
      main.py
      requirements.txt
      tests/
        test_main.py
        test_integration.py
  cloudbuild.yaml
  cloudbuild-pr.yaml
```

Each function lives in its own directory with its own dependencies and tests. This keeps functions independent and allows targeted deployments.

## Step 1: Write the Cloud Function with Testability in Mind

Structure your function so that the business logic is separated from the Cloud Functions handler:

```javascript
// functions/process-orders/index.js

const { Firestore } = require('@google-cloud/firestore');
const { PubSub } = require('@google-cloud/pubsub');

// Initialize clients outside the handler for connection reuse
const firestore = new Firestore();
const pubsub = new PubSub();

/**
 * Core business logic - separated for testability.
 * Processes an order and publishes a notification event.
 */
async function processOrder(orderData, db, publisher) {
  // Validate the order
  if (!orderData.orderId || !orderData.items || orderData.items.length === 0) {
    throw new Error('Invalid order: missing orderId or items');
  }

  // Calculate total
  const total = orderData.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  // Save to Firestore
  const orderRecord = {
    ...orderData,
    total,
    status: 'processing',
    createdAt: new Date().toISOString()
  };

  await db.collection('orders').doc(orderData.orderId).set(orderRecord);

  // Publish notification event
  await publisher
    .topic('order-notifications')
    .publishMessage({
      data: Buffer.from(JSON.stringify({
        orderId: orderData.orderId,
        total,
        status: 'processing'
      }))
    });

  return { orderId: orderData.orderId, total, status: 'processing' };
}

/**
 * HTTP Cloud Function handler.
 * Entry point for incoming requests.
 */
exports.handleOrder = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const result = await processOrder(req.body, firestore, pubsub);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(400).json({ error: error.message });
  }
};

// Export for testing
exports.processOrder = processOrder;
```

## Step 2: Write Unit Tests

Unit tests mock external dependencies and test the business logic:

```javascript
// functions/process-orders/test/unit/index.test.js

const { processOrder } = require('../../index');

describe('processOrder', () => {
  let mockDb;
  let mockPublisher;

  beforeEach(() => {
    // Create mock Firestore
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock PubSub
    mockPublisher = {
      topic: jest.fn().mockReturnValue({
        publishMessage: jest.fn().mockResolvedValue('message-id')
      })
    };
  });

  test('should process a valid order', async () => {
    const orderData = {
      orderId: 'order-123',
      items: [
        { name: 'Widget', price: 10.00, quantity: 2 },
        { name: 'Gadget', price: 25.00, quantity: 1 }
      ]
    };

    const result = await processOrder(orderData, mockDb, mockPublisher);

    expect(result.orderId).toBe('order-123');
    expect(result.total).toBe(45.00);
    expect(result.status).toBe('processing');

    // Verify Firestore was called
    expect(mockDb.collection).toHaveBeenCalledWith('orders');
    expect(mockDb.doc).toHaveBeenCalledWith('order-123');
    expect(mockDb.set).toHaveBeenCalled();

    // Verify PubSub was called
    expect(mockPublisher.topic).toHaveBeenCalledWith('order-notifications');
  });

  test('should reject order without orderId', async () => {
    const orderData = {
      items: [{ name: 'Widget', price: 10.00, quantity: 1 }]
    };

    await expect(processOrder(orderData, mockDb, mockPublisher))
      .rejects.toThrow('Invalid order');
  });

  test('should reject order without items', async () => {
    const orderData = {
      orderId: 'order-456',
      items: []
    };

    await expect(processOrder(orderData, mockDb, mockPublisher))
      .rejects.toThrow('Invalid order');
  });

  test('should calculate total correctly', async () => {
    const orderData = {
      orderId: 'order-789',
      items: [
        { name: 'A', price: 9.99, quantity: 3 },
        { name: 'B', price: 4.50, quantity: 2 }
      ]
    };

    const result = await processOrder(orderData, mockDb, mockPublisher);
    expect(result.total).toBeCloseTo(38.97, 2);
  });
});
```

## Step 3: Write Integration Tests

Integration tests run against real (or emulated) GCP services:

```javascript
// functions/process-orders/test/integration/index.integration.test.js

const { Firestore } = require('@google-cloud/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const { processOrder } = require('../../index');

// Use the Firestore emulator for integration tests
const firestore = new Firestore({
  projectId: 'test-project',
  host: process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080'
});

const pubsub = new PubSub({
  projectId: 'test-project',
  apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || 'localhost:8085'
});

describe('processOrder integration tests', () => {
  beforeAll(async () => {
    // Create the PubSub topic in the emulator
    try {
      await pubsub.createTopic('order-notifications');
    } catch (e) {
      // Topic might already exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    const orders = await firestore.collection('orders').listDocuments();
    const batch = firestore.batch();
    orders.forEach(doc => batch.delete(doc));
    await batch.commit();
  });

  test('should save order to Firestore and publish message', async () => {
    const orderData = {
      orderId: 'integration-test-001',
      items: [
        { name: 'Test Item', price: 15.00, quantity: 2 }
      ]
    };

    const result = await processOrder(orderData, firestore, pubsub);

    // Verify the order was saved to Firestore
    const savedOrder = await firestore
      .collection('orders')
      .doc('integration-test-001')
      .get();

    expect(savedOrder.exists).toBe(true);
    expect(savedOrder.data().total).toBe(30.00);
    expect(savedOrder.data().status).toBe('processing');

    // Verify the result
    expect(result.total).toBe(30.00);
  });
});
```

## Step 4: Create the Cloud Build Pipeline

```yaml
# cloudbuild.yaml - Full CI/CD pipeline for Cloud Functions
steps:
  # Step 1: Install dependencies for all functions
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        for dir in functions/*/; do
          if [ -f "$dir/package.json" ]; then
            echo "Installing dependencies in $dir"
            cd "$dir"
            npm ci
            cd /workspace
          fi
        done
    id: 'install'

  # Step 2: Run unit tests for all functions
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        FAILED=0
        for dir in functions/*/; do
          if [ -f "$dir/package.json" ]; then
            echo "Running unit tests in $dir"
            cd "$dir"
            npm test -- --ci --forceExit || FAILED=1
            cd /workspace
          fi
        done
        exit $FAILED
    id: 'unit-tests'
    waitFor: ['install']

  # Step 3: Start emulators and run integration tests
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Install Firebase CLI for emulators
        npm install -g firebase-tools

        # Start Firestore emulator in background
        firebase emulators:start --only firestore,pubsub --project=test-project &
        EMULATOR_PID=$!

        # Wait for emulators to be ready
        sleep 10

        export FIRESTORE_EMULATOR_HOST=localhost:8080
        export PUBSUB_EMULATOR_HOST=localhost:8085

        FAILED=0
        for dir in functions/*/; do
          if [ -f "$dir/package.json" ]; then
            cd "$dir"
            if npm run test:integration --if-present; then
              echo "Integration tests passed in $dir"
            else
              echo "Integration tests failed in $dir"
              FAILED=1
            fi
            cd /workspace
          fi
        done

        kill $EMULATOR_PID
        exit $FAILED
    id: 'integration-tests'
    waitFor: ['install']

  # Step 4: Lint code
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        for dir in functions/*/; do
          if [ -f "$dir/package.json" ]; then
            cd "$dir"
            npx eslint . --ext .js || true
            cd /workspace
          fi
        done
    id: 'lint'
    waitFor: ['install']

  # Step 5: Deploy functions (only after all tests pass)
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Deploy process-orders function
        gcloud functions deploy process-orders \
          --gen2 \
          --runtime=nodejs20 \
          --region=$_REGION \
          --source=functions/process-orders \
          --entry-point=handleOrder \
          --trigger-http \
          --allow-unauthenticated \
          --memory=256MB \
          --timeout=60s \
          --min-instances=1 \
          --max-instances=100

        echo "Deployed process-orders"
    id: 'deploy-process-orders'
    waitFor: ['unit-tests', 'integration-tests', 'lint']

  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Deploy send-notifications function
        gcloud functions deploy send-notifications \
          --gen2 \
          --runtime=python311 \
          --region=$_REGION \
          --source=functions/send-notifications \
          --entry-point=handle_notification \
          --trigger-topic=order-notifications \
          --memory=256MB \
          --timeout=120s

        echo "Deployed send-notifications"
    id: 'deploy-send-notifications'
    waitFor: ['unit-tests', 'integration-tests', 'lint']

  # Step 6: Run smoke tests against deployed functions
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the function URL
        FUNC_URL=$(gcloud functions describe process-orders \
          --gen2 --region=$_REGION \
          --format='value(serviceConfig.uri)')

        echo "Smoke testing: $FUNC_URL"

        # Test with a valid request
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNC_URL" \
          -H "Content-Type: application/json" \
          -d '{"orderId":"smoke-test-001","items":[{"name":"Test","price":1.00,"quantity":1}]}')

        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -1)

        if [ "$HTTP_CODE" == "200" ]; then
          echo "Smoke test passed: $BODY"
        else
          echo "Smoke test FAILED: HTTP $HTTP_CODE - $BODY"
          exit 1
        fi
    id: 'smoke-tests'
    waitFor: ['deploy-process-orders']

substitutions:
  _REGION: us-central1
```

## Step 5: Create Triggers

```bash
# PR trigger for testing only
gcloud builds triggers create github \
  --name="functions-pr-test" \
  --repo-name=my-functions \
  --repo-owner=my-org \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml

# Main branch trigger for deployment
gcloud builds triggers create github \
  --name="functions-deploy" \
  --repo-name=my-functions \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --substitutions="_REGION=us-central1"
```

## Step 6: Implement Rollback

Cloud Functions Gen2 supports traffic splitting for rollback:

```bash
# List recent revisions
gcloud run revisions list \
  --service=process-orders \
  --region=us-central1 \
  --platform=managed

# Roll back to a previous revision
gcloud run services update-traffic process-orders \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

## Wrapping Up

A CI/CD pipeline for Cloud Functions does not need to be complicated, but it does need to be thorough. Unit tests catch logic errors, integration tests catch issues with GCP service interactions, and smoke tests verify that the deployed function actually works. Cloud Build orchestrates all of this and only deploys when everything passes.

The key is structuring your functions for testability from the start. Separating business logic from the Cloud Functions handler makes unit testing straightforward and keeps integration tests focused on the actual service interactions.
