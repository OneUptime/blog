# How to Use MongoDB with Google Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Google Cloud, Serverless, Function, Mongoose

Description: Learn how to connect MongoDB from Google Cloud Functions using connection caching, VPC connector setup, and proper error handling for serverless environments.

---

Google Cloud Functions share the same serverless connection challenge as AWS Lambda - each cold start incurs a new TCP connection to MongoDB unless you cache the connection in global scope. This guide covers connection caching, environment setup, and deploying with the gcloud CLI.

## Installing Dependencies

```bash
npm install @google-cloud/functions-framework mongoose
```

## Connection Caching

Cloud Functions reuse the global scope across warm invocations within the same instance:

```javascript
const mongoose = require('mongoose');

let connection = null;

async function getConnection() {
  if (connection && mongoose.connection.readyState === 1) {
    return connection;
  }

  connection = await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  return connection;
}
```

## HTTP Function Handler

```javascript
const functions = require('@google-cloud/functions-framework');
const Product = require('./models/Product');

functions.http('products', async (req, res) => {
  await getConnection();

  res.set('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const products = await Product.find({ active: true }).limit(50).lean();
    return res.json(products);
  }

  if (req.method === 'POST') {
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await Product.findByIdAndDelete(id);
    return res.status(204).send();
  }

  res.status(405).json({ error: 'Method not allowed' });
});
```

## Background (Pub/Sub Trigger) Function

```javascript
functions.cloudEvent('processOrder', async (cloudEvent) => {
  await getConnection();

  const message = JSON.parse(
    Buffer.from(cloudEvent.data.message.data, 'base64').toString()
  );

  await Order.findByIdAndUpdate(
    message.orderId,
    { $set: { status: 'processing', processedAt: new Date() } }
  );

  console.log(`Order ${message.orderId} marked as processing`);
});
```

## Deploying the Function

```bash
# Deploy HTTP function
gcloud functions deploy products \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=products \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars MONGODB_URI="mongodb+srv://..." \
  --memory=256Mi \
  --timeout=60s
```

## Connecting via VPC Connector

For connecting to MongoDB Atlas over a private endpoint, use a VPC Serverless Connector:

```bash
# Create a VPC connector
gcloud compute networks vpc-access connectors create mongodb-connector \
  --region=us-central1 \
  --subnet=default \
  --subnet-project=my-project

# Deploy function with VPC connector
gcloud functions deploy products \
  --gen2 \
  --vpc-connector=mongodb-connector \
  --egress-settings=private-ranges-only \
  ...
```

## Environment Variables via Secret Manager

Store the connection string in Google Secret Manager:

```bash
# Create the secret
echo -n "mongodb+srv://..." | \
  gcloud secrets create MONGODB_URI --data-file=-

# Grant access to the function service account
gcloud secrets add-iam-policy-binding MONGODB_URI \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then deploy the function with the secret:

```bash
gcloud functions deploy products \
  --gen2 \
  --set-secrets 'MONGODB_URI=MONGODB_URI:latest' \
  ...
```

## Summary

Connection caching in global scope is essential for efficient MongoDB use in Cloud Functions. Keep `maxPoolSize` low (2-5) to avoid hitting Atlas connection limits, use VPC connectors for private network access, and store the connection string in Secret Manager instead of environment variables for improved security.
