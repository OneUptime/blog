# How to Use Firestore Bundle Files for Preloaded Query Results in Client Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, Performance, Caching, Web Development

Description: Learn how to use Firestore data bundles to preload query results on the client side, reducing initial load times and Firestore read costs in your applications.

---

Every Firestore query costs money and adds latency. For data that does not change frequently - like product catalogs, configuration settings, or public content - there is no reason to hit the Firestore backend on every page load. Firestore data bundles let you package query results into a binary file that you serve from a CDN, so your client application loads data instantly without making a single Firestore read.

This is one of those features that not many teams know about, but it can make a huge difference for both performance and cost.

## What Are Firestore Bundles?

A Firestore bundle is a binary file that contains the results of one or more Firestore queries. You generate these bundles on the server side, upload them to Cloud Storage or a CDN, and then load them on the client. The client SDK reads the bundle and populates the local cache, so subsequent queries against the bundled data resolve instantly from the cache instead of going to the server.

Think of it as pre-warming your Firestore cache with known-good data.

## When Bundles Make Sense

Bundles work best for data that:

- Changes infrequently (hourly, daily, or less)
- Is read by many users
- Does not require real-time updates
- Represents a significant portion of your Firestore read costs

Common use cases include:
- Product listings or catalog data
- Blog posts or CMS content
- Application configuration or feature flags
- Leaderboards or trending items that update periodically
- Reference data like country lists or categories

## Generating a Bundle on the Server

Here is how to create a bundle using the Firebase Admin SDK in Node.js:

```javascript
// generate-bundle.js - Server-side script to create a Firestore bundle
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

async function generateProductBundle() {
  // Create a new bundle with a descriptive name
  const bundle = db.bundle('product-catalog');

  // Query the data you want to include
  const productsQuery = db.collection('products')
    .where('active', '==', true)
    .orderBy('name')
    .limit(500);

  const productsSnapshot = await productsQuery.get();

  // Add the named query and its results to the bundle
  bundle.add('active-products', productsSnapshot);

  // You can add multiple queries to a single bundle
  const categoriesQuery = db.collection('categories').orderBy('sortOrder');
  const categoriesSnapshot = await categoriesQuery.get();
  bundle.add('all-categories', categoriesSnapshot);

  // You can also add individual documents
  const configDoc = await db.collection('config').doc('app-settings').get();
  bundle.add(configDoc);

  // Build the bundle and write it to a file
  const bundleBuffer = bundle.build();
  fs.writeFileSync('/tmp/product-bundle', bundleBuffer);

  console.log(`Bundle created with ${productsSnapshot.size} products`);
  console.log(`Bundle size: ${bundleBuffer.length} bytes`);

  return bundleBuffer;
}

generateProductBundle().catch(console.error);
```

## Uploading to Cloud Storage

After generating the bundle, upload it to Cloud Storage where you can serve it through a CDN:

```javascript
// upload-bundle.js - Upload the bundle to Cloud Storage
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

async function uploadBundle(bundleBuffer) {
  const bucket = storage.bucket('my-app-bundles');
  const file = bucket.file('bundles/product-catalog.bundle');

  // Upload with appropriate cache headers
  await file.save(bundleBuffer, {
    metadata: {
      contentType: 'application/octet-stream',
      // Cache for 1 hour - adjust based on your update frequency
      cacheControl: 'public, max-age=3600',
    },
  });

  // Make it publicly readable if serving directly
  await file.makePublic();

  console.log('Bundle uploaded to Cloud Storage');
}
```

## Loading Bundles on the Client

On the client side, you fetch the bundle and load it into Firestore's local cache:

```javascript
// client-app.js - Load a Firestore bundle in a web application
import { getFirestore, loadBundle, namedQuery, getDocsFromCache } from 'firebase/firestore';

const db = getFirestore();

async function loadProductCatalog() {
  // Fetch the bundle from your CDN or Cloud Storage
  const response = await fetch('https://storage.googleapis.com/my-app-bundles/bundles/product-catalog.bundle');
  const bundleData = await response.arrayBuffer();

  // Load the bundle into Firestore's local cache
  const loadTask = loadBundle(db, bundleData);

  // Monitor loading progress
  loadTask.onProgress((progress) => {
    console.log(`Loaded ${progress.documentsLoaded} of ${progress.totalDocuments} documents`);
  });

  // Wait for the bundle to finish loading
  await loadTask;
  console.log('Bundle loaded successfully');
}

async function getProducts() {
  // First, make sure the bundle is loaded
  await loadProductCatalog();

  // Use the named query from the bundle - reads from cache, no server call
  const query = await namedQuery(db, 'active-products');

  if (query) {
    // Get docs from cache - this is free and instant
    const snapshot = await getDocsFromCache(query);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(`Got ${products.length} products from bundle`);
    return products;
  }

  // Fallback: query the server if bundle is not available
  console.log('Bundle not available, querying server');
  const fallbackSnapshot = await getDocs(
    collection(db, 'products'),
    where('active', '==', true),
    orderBy('name'),
    limit(500)
  );
  return fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

## Automating Bundle Generation with Cloud Functions

You probably do not want to generate bundles manually. Here is a Cloud Function that regenerates the bundle whenever the source data changes:

```javascript
// functions/index.js - Auto-regenerate bundles when data changes
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {Storage} = require('@google-cloud/storage');

admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

// Regenerate the bundle when any product changes
exports.regenerateProductBundle = functions.firestore
  .document('products/{productId}')
  .onWrite(async (change, context) => {
    // Debounce: check if we regenerated recently
    const metaDoc = await db.collection('_meta').doc('bundle-status').get();
    if (metaDoc.exists) {
      const lastGenerated = metaDoc.data().lastGenerated?.toDate();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastGenerated > fiveMinutesAgo) {
        console.log('Bundle regenerated recently, skipping');
        return;
      }
    }

    // Generate the bundle
    const bundle = db.bundle('product-catalog');

    const productsSnapshot = await db.collection('products')
      .where('active', '==', true)
      .orderBy('name')
      .get();

    bundle.add('active-products', productsSnapshot);

    const categoriesSnapshot = await db.collection('categories')
      .orderBy('sortOrder')
      .get();

    bundle.add('all-categories', categoriesSnapshot);

    const bundleBuffer = bundle.build();

    // Upload to Cloud Storage
    const bucket = storage.bucket('my-app-bundles');
    const file = bucket.file('bundles/product-catalog.bundle');

    await file.save(bundleBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        cacheControl: 'public, max-age=300',
      },
    });

    // Update metadata
    await db.collection('_meta').doc('bundle-status').set({
      lastGenerated: admin.firestore.FieldValue.serverTimestamp(),
      documentCount: productsSnapshot.size + categoriesSnapshot.size,
      bundleSize: bundleBuffer.length,
    });

    console.log(`Bundle regenerated with ${productsSnapshot.size} products`);
  });
```

## Serving Bundles Through Cloud CDN

For the best performance, serve your bundles through Cloud CDN. Set up a load balancer with a Cloud Storage backend:

```bash
# Create a backend bucket pointing to your bundle storage
gcloud compute backend-buckets create bundle-backend \
  --gcs-bucket-name=my-app-bundles \
  --enable-cdn \
  --project=my-project

# Create a URL map
gcloud compute url-maps create bundle-url-map \
  --default-backend-bucket=bundle-backend \
  --project=my-project
```

With CDN caching, the bundle is served from edge locations close to your users, meaning the initial data load is as fast as loading a static file.

## Versioning and Cache Invalidation

One thing to watch out for is stale bundles. Here is a pattern that includes versioning:

```javascript
// Include a version in the bundle name
async function generateVersionedBundle() {
  const version = Date.now().toString();
  const bundle = db.bundle(`product-catalog-v${version}`);

  // ... add queries ...

  const bundleBuffer = bundle.build();

  // Upload with the version in the filename
  const file = storage.bucket('my-app-bundles')
    .file(`bundles/product-catalog-${version}.bundle`);

  await file.save(bundleBuffer);

  // Update a manifest file that clients check for the latest version
  const manifest = storage.bucket('my-app-bundles')
    .file('bundles/manifest.json');

  await manifest.save(JSON.stringify({
    'product-catalog': {
      version: version,
      url: `bundles/product-catalog-${version}.bundle`,
      generatedAt: new Date().toISOString(),
    },
  }), {
    metadata: {
      contentType: 'application/json',
      // Short cache for the manifest so clients pick up new versions quickly
      cacheControl: 'public, max-age=60',
    },
  });
}
```

## Cost Impact

The math on bundles is compelling. If you have 10,000 daily active users and each loads 500 product documents on startup, that is 5 million Firestore reads per day, which costs about $3 per day or $90 per month just for that one query. With bundles, you generate the data once and serve it from Cloud Storage, which costs a fraction of a cent per day in storage and bandwidth.

Even accounting for the CDN costs, you are looking at 95% or more savings on read-heavy workloads with data that updates infrequently.

Monitoring these cost savings is straightforward with a tool like OneUptime, where you can track Firestore read counts before and after implementing bundles to measure the actual impact.

Bundles are an underused feature that can significantly improve both the performance and cost profile of Firestore-backed applications. If you have any data that fits the pattern of "read often, changes rarely," bundles should be in your toolkit.
