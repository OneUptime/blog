# How to Use Firebase Cloud Functions v2 with Cloud Run Under the Hood

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firebase, Cloud Functions v2, Cloud Run, Serverless, Google Cloud

Description: Understand how Firebase Cloud Functions v2 runs on Cloud Run and learn to take advantage of Cloud Run features like concurrency, min instances, and longer timeouts.

---

Firebase Cloud Functions got a major upgrade with v2. The biggest change is what happens under the hood: v2 functions run on Cloud Run instead of the original Cloud Functions infrastructure. This is not just a backend swap - it unlocks capabilities that were previously impossible or painful to achieve with Cloud Functions v1, including higher concurrency, longer timeouts, larger instance sizes, and direct access to Cloud Run features.

This guide explains what changed, how to migrate, and how to take advantage of the Cloud Run foundations.

## What Changed from v1 to v2

Here is a comparison of the key differences:

| Feature | v1 | v2 (Cloud Run) |
|---------|-----|----------------|
| Max timeout | 9 minutes (540s) | 60 minutes (3600s) |
| Max memory | 8 GB | 32 GB |
| Max vCPUs | 2 | 8 |
| Concurrency | 1 request per instance | Up to 1000 per instance |
| Min instances | Supported | Supported (native Cloud Run) |
| Traffic splitting | Not supported | Supported |
| Regions | Limited set | All Cloud Run regions |
| Pricing | Per invocation + compute | Cloud Run pricing |

The concurrency change alone is transformative. In v1, each function instance handled exactly one request at a time. If you had 100 concurrent users, you needed 100 instances. In v2, a single instance can handle many concurrent requests, which dramatically reduces cold starts and costs.

## Setting Up a v2 Cloud Function

### Initialize a Firebase Functions Project

```bash
# Create a new Firebase project (or use existing)
mkdir my-functions-app && cd my-functions-app
firebase init functions

# Choose TypeScript or JavaScript
# Select your Firebase project
```

### Write a v2 Function

The import paths changed from v1 to v2:

```typescript
// functions/src/index.ts - v2 Cloud Functions

// v2 imports use firebase-functions/v2
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";

admin.initializeApp();

// HTTP function with v2 options
export const api = onRequest(
  {
    // Cloud Run configuration options
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 1,       // Keep one instance warm
    maxInstances: 100,     // Scale limit
    concurrency: 80,       // Handle 80 concurrent requests per instance
  },
  async (req, res) => {
    const db = admin.firestore();

    if (req.method === "GET" && req.path === "/products") {
      const snapshot = await db.collection("products").get();
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(products);
    } else if (req.method === "POST" && req.path === "/products") {
      const product = req.body;
      const docRef = await db.collection("products").add(product);
      res.status(201).json({ id: docRef.id, ...product });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  }
);

// Firestore trigger - runs when a new document is created
export const onNewOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const orderData = snapshot.data();
    console.log(`New order created: ${event.params.orderId}`);

    // Send notification, update inventory, etc.
    await admin.firestore().collection("notifications").add({
      type: "new_order",
      orderId: event.params.orderId,
      amount: orderData.total,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// Scheduled function - runs on a cron schedule
export const dailyReport = onSchedule(
  {
    schedule: "0 9 * * *",  // Every day at 9 AM
    timeZone: "America/New_York",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    console.log("Generating daily report...");

    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const orders = await db.collection("orders")
      .where("createdAt", ">=", yesterday)
      .get();

    console.log(`Found ${orders.size} orders from yesterday`);

    // Generate and store the report
    await db.collection("reports").add({
      type: "daily",
      date: yesterday.toISOString().split("T")[0],
      orderCount: orders.size,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// Pub/Sub trigger
export const processMessage = onMessagePublished(
  {
    topic: "order-events",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const message = event.data.message;
    const data = JSON.parse(
      Buffer.from(message.data, "base64").toString()
    );

    console.log("Received message:", data);
    // Process the message
  }
);
```

## Understanding Concurrency in v2

Concurrency is the biggest behavioral change. Here is how to think about it:

### v1 Behavior (Concurrency = 1)

```
Request 1 --> [Instance 1] (processing...)
Request 2 --> [Instance 2] (new instance, cold start)
Request 3 --> [Instance 3] (new instance, cold start)
```

### v2 Behavior (Concurrency = 80)

```
Request 1 --> [Instance 1] (processing...)
Request 2 --> [Instance 1] (same instance, no cold start)
Request 3 --> [Instance 1] (same instance, no cold start)
...
Request 81 -> [Instance 2] (new instance needed)
```

This means your code must be safe for concurrent execution. Watch out for:

```typescript
// BAD: Shared mutable state across requests
let requestCount = 0;  // This will be shared across concurrent requests

export const counter = onRequest(
  { concurrency: 80 },
  async (req, res) => {
    requestCount++;  // Race condition with concurrent requests
    res.json({ count: requestCount });
  }
);

// GOOD: No shared mutable state
export const counter = onRequest(
  { concurrency: 80 },
  async (req, res) => {
    // Use Firestore or another service for shared state
    const db = admin.firestore();
    const countRef = db.collection("counters").doc("requests");

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(countRef);
      const newCount = (doc.data()?.count || 0) + 1;
      transaction.set(countRef, { count: newCount });
    });

    res.json({ message: "Counted" });
  }
);
```

### Setting the Right Concurrency

```typescript
// CPU-intensive work: lower concurrency
export const imageProcessor = onRequest(
  {
    memory: "1GiB",
    cpu: 2,
    concurrency: 4,  // Few concurrent requests since each uses lots of CPU
  },
  async (req, res) => {
    // Heavy image processing
  }
);

// I/O-bound work: higher concurrency
export const apiProxy = onRequest(
  {
    memory: "256MiB",
    concurrency: 100,  // Many concurrent requests since mostly waiting on I/O
  },
  async (req, res) => {
    // Fetch from external API, mostly waiting
  }
);
```

## Min Instances for Cold Start Elimination

Cold starts are a common complaint with serverless functions. v2 lets you keep instances warm:

```typescript
// Keep one instance always warm for latency-sensitive endpoints
export const criticalApi = onRequest(
  {
    minInstances: 1,  // Always have at least one warm instance
    maxInstances: 50,
    concurrency: 80,
    memory: "512MiB",
  },
  async (req, res) => {
    // This will never have a cold start for the first ~80 concurrent users
    res.json({ fast: true });
  }
);
```

The cost of min instances is the idle Cloud Run instance cost. For a 512 MiB instance, that is roughly $15-20/month. Compare that to the user experience improvement of eliminating cold starts.

## Longer Timeouts for Heavy Processing

v2 functions can run for up to 60 minutes:

```typescript
// Long-running data export function
export const exportData = onRequest(
  {
    timeoutSeconds: 3600,  // 1 hour timeout
    memory: "2GiB",
    cpu: 2,
    concurrency: 1,  // One export at a time per instance
  },
  async (req, res) => {
    console.log("Starting large data export...");

    const db = admin.firestore();
    const allDocs = await db.collection("large_collection").get();

    // Process all documents (could take minutes)
    for (const doc of allDocs.docs) {
      // Process each document
      await processDocument(doc);
    }

    res.json({ exported: allDocs.size });
  }
);
```

## Accessing the Cloud Run Service Directly

Since v2 functions are Cloud Run services, you can see and manage them in the Cloud Run console:

```bash
# List Cloud Run services (your v2 functions appear here)
gcloud run services list --region=us-central1

# Get details about a specific function's Cloud Run service
gcloud run services describe api --region=us-central1

# View logs
gcloud run services logs read api --region=us-central1 --limit=50
```

You can even update Cloud Run-specific settings that are not exposed in the Firebase CLI:

```bash
# Update Cloud Run settings directly (use with caution)
gcloud run services update api \
  --region=us-central1 \
  --cpu-throttling \
  --execution-environment=gen2
```

## Migrating from v1 to v2

### Change Imports

```typescript
// v1
import * as functions from "firebase-functions";
export const myFunction = functions.https.onRequest((req, res) => { ... });
export const myTrigger = functions.firestore.document("path/{id}").onCreate((snap) => { ... });

// v2
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
export const myFunction = onRequest((req, res) => { ... });
export const myTrigger = onDocumentCreated("path/{id}", (event) => { ... });
```

### Handle Breaking Changes

The event object structure changed for Firestore triggers:

```typescript
// v1 - snap is a DocumentSnapshot
export const v1Trigger = functions.firestore
  .document("orders/{orderId}")
  .onCreate((snap, context) => {
    const data = snap.data();
    const orderId = context.params.orderId;
  });

// v2 - event contains the snapshot
export const v2Trigger = onDocumentCreated(
  "orders/{orderId}",
  (event) => {
    const data = event.data?.data();  // Note the nested .data()
    const orderId = event.params.orderId;
  }
);
```

### Deploy Strategy

You can run v1 and v2 functions side by side during migration:

```typescript
// Keep v1 functions running
import * as functions from "firebase-functions";
export const legacyApi = functions.https.onRequest((req, res) => { ... });

// Deploy new v2 functions alongside
import { onRequest } from "firebase-functions/v2/https";
export const newApi = onRequest({ concurrency: 80 }, (req, res) => { ... });
```

Deploy and test v2 functions before removing v1 versions.

## Deploying v2 Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy a specific function
firebase deploy --only functions:api

# Deploy with debug logging
firebase deploy --only functions --debug
```

## Monitoring v2 Functions

Since v2 functions are Cloud Run services, you get Cloud Run metrics in addition to Firebase metrics:

```bash
# View function execution logs
firebase functions:log --only api

# View Cloud Run metrics
gcloud run services describe api \
  --region=us-central1 \
  --format="table(status.traffic)"
```

In the Cloud Console, check:
- Cloud Run dashboard for request latency, instance count, and error rates
- Cloud Monitoring for custom metrics
- Error Reporting for function crashes

## Cost Considerations

v2 pricing follows Cloud Run pricing instead of v1 Cloud Functions pricing:

- **CPU allocation**: Charged per vCPU-second
- **Memory allocation**: Charged per GiB-second
- **Requests**: $0.40 per million requests
- **Min instances**: You pay for idle instances

The concurrency improvement often makes v2 cheaper than v1 because fewer instances are needed. A single v2 instance handling 80 requests replaces 80 v1 instances.

## Best Practices

1. **Set appropriate concurrency** - For I/O-bound functions, set concurrency to 80-100. For CPU-bound, keep it low (1-10).

2. **Use min instances for user-facing endpoints** - The cost is small compared to the user experience improvement.

3. **Handle concurrent state carefully** - Avoid shared mutable state between requests. Use databases for shared data.

4. **Set memory and CPU together** - Cloud Run allocates CPU proportional to memory. If you need more CPU, increase memory too.

5. **Use the gen2 execution environment** - It provides better performance and compatibility.

6. **Monitor your Cloud Run dashboard** - The Cloud Run metrics give you deeper insight than the Firebase Functions dashboard alone.

## Wrapping Up

Firebase Cloud Functions v2 is a significant improvement over v1, and understanding the Cloud Run foundation is key to using it effectively. The combination of higher concurrency, longer timeouts, larger instances, and direct access to Cloud Run features makes v2 suitable for workloads that were previously impossible with serverless functions. Start new functions on v2 and migrate existing v1 functions when you have the bandwidth. The performance and cost improvements make it worth the effort.
