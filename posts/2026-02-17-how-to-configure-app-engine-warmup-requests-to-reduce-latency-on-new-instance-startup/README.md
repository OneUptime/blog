# How to Configure App Engine Warmup Requests to Reduce Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Warmup Requests, Latency, Performance

Description: Learn how to configure and handle warmup requests in App Engine to pre-load data and initialize connections before serving user traffic.

---

Cold starts are one of the biggest pain points with serverless platforms, and App Engine is no exception. When App Engine spins up a new instance, the first request that hits it takes extra time because the application needs to load code, initialize connections, and warm up caches. Warmup requests solve this by giving your application a heads-up before real user traffic arrives.

When you enable warmup requests for App Engine Standard services that use automatic scaling, App Engine makes a best-effort attempt to send a special `GET /_ah/warmup` request to new instances before routing user traffic to them. Your application can use this request to do expensive initialization work so that the first real user request is fast when warmup runs successfully.

## How Warmup Requests Work

The flow looks like this:

1. App Engine decides it needs a new instance (scaling up due to traffic)
2. The new instance starts and your application code loads
3. App Engine sends a `GET /_ah/warmup` request to the new instance
4. Your application handles the warmup - loading caches, opening database connections, etc.
5. When warmup runs successfully, App Engine can send user traffic to an already-initialized instance

Without warmup requests, step 3 and 4 do not happen. The first user request is also the initialization request, and that user experiences all the startup latency.

## Enabling Warmup Requests

For App Engine Standard Environment services that use automatic scaling, add `warmup` to the `inbound_services` in your `app.yaml`:

```yaml
# app.yaml - Enable warmup requests

runtime: python312

inbound_services:
  - warmup

automatic_scaling:
  min_idle_instances: 1
  max_idle_instances: 5
```

That is all you need in the configuration. App Engine will now make a best-effort attempt to send warmup requests to new automatically scaled instances.

## Implementing the Warmup Handler - Python

Here is how to handle warmup requests in a Python Flask application:

```python
# main.py - Flask application with warmup handler
import logging
from flask import Flask
from google.cloud import firestore
import redis
import os

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Global references for expensive resources
db_client = None
cache_client = None
model_data = None

def initialize_database():
    """Open database connections during warmup."""
    global db_client
    db_client = firestore.Client()
    # Execute a simple query to establish the connection
    db_client.collection("health").document("check").get()
    logger.info("Database connection initialized")

def initialize_cache():
    """Connect to Redis during warmup."""
    global cache_client
    cache_client = redis.Redis(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=6379,
        decode_responses=True
    )
    cache_client.ping()
    logger.info("Cache connection initialized")

def preload_reference_data():
    """Load frequently accessed data into memory during warmup."""
    global model_data
    # Load configuration or reference data that rarely changes
    doc = db_client.collection("config").document("app_settings").get()
    model_data = doc.to_dict() if doc.exists else {}
    logger.info("Reference data preloaded")

@app.route("/_ah/warmup")
def warmup():
    """Handle warmup requests from App Engine.
    App Engine calls this on a best-effort basis before user traffic reaches this instance.
    """
    try:
        initialize_database()
        initialize_cache()
        preload_reference_data()
        logger.info("Warmup completed successfully")
        return "Warmup complete", 200
    except Exception as e:
        logger.error(f"Warmup failed: {e}")
        # Return 200 anyway - a failed warmup should not block the instance
        # The application can still handle requests, just with cold initialization
        return "Warmup failed, continuing anyway", 200

@app.route("/")
def home():
    # These resources are already initialized from warmup
    if db_client is None or cache_client is None or model_data is None:
        # Fallback initialization if warmup did not run
        initialize_database()
        initialize_cache()
        preload_reference_data()
    return {"status": "ready", "config": model_data}
```

A few important design decisions here. The warmup handler returns 200 even if initialization fails. You do not want a temporary Redis outage to prevent instances from starting. The regular request handlers have fallback initialization in case the warmup was skipped or failed.

## Implementing the Warmup Handler - Node.js

Here is the equivalent in a Node.js Express application:

```javascript
// server.js - Express application with warmup handler
const express = require("express");
const { Firestore } = require("@google-cloud/firestore");

const app = express();
const PORT = process.env.PORT || 8080;

// Shared state that gets initialized during warmup
let dbClient = null;
let appConfig = null;
let isWarmedUp = false;

async function initializeDatabase() {
  // Create and test the database connection
  dbClient = new Firestore();
  await dbClient.collection("health").doc("check").get();
  console.log("Database connection ready");
}

async function loadConfiguration() {
  // Pre-load application configuration
  const doc = await dbClient.collection("config").doc("settings").get();
  appConfig = doc.exists ? doc.data() : {};
  console.log("Configuration loaded");
}

// Warmup endpoint - called by App Engine on a best-effort basis before user traffic arrives
app.get("/_ah/warmup", async (req, res) => {
  try {
    console.log("Starting warmup...");
    await initializeDatabase();
    await loadConfiguration();
    isWarmedUp = true;
    console.log("Warmup completed successfully");
    res.status(200).send("OK");
  } catch (err) {
    console.error("Warmup error:", err.message);
    // Still return 200 - do not block instance startup
    res.status(200).send("Warmup had errors, continuing");
  }
});

// Application routes
app.get("/", async (req, res) => {
  // Lazy initialization fallback
  if (!isWarmedUp) {
    await initializeDatabase();
    await loadConfiguration();
    isWarmedUp = true;
  }
  res.json({ status: "ready", config: appConfig });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## What to Do During Warmup

Not everything belongs in a warmup handler. Here is a breakdown of what makes sense and what does not:

Good candidates for warmup:

- Opening database connections and connection pools
- Connecting to Redis or Memorystore
- Loading configuration data from Firestore or a config file
- Initializing gRPC channels to other services
- Pre-computing data that every request needs
- Loading ML models into memory

Things to avoid during warmup:

- Writes to databases (warmup might run multiple times)
- Long-running operations that approach the request timeout
- Operations with side effects that should only happen once
- Fetching large datasets that consume too much memory

## Warmup Timeout

Warmup requests have a timeout just like regular requests. In App Engine Standard Environment, current automatic scaling HTTP requests have a 10 minute timeout. Manual and basic scaling instances do not receive `/_ah/warmup` requests; they use `/_ah/start` for startup initialization instead.

Even with that request timeout, keep warmup fast. If your warmup is slow or times out, App Engine can still serve loading requests and users can see startup latency. Parallelize independent initialization tasks:

```python
# Parallel warmup for faster independent initialization
import concurrent.futures

def warmup():
    # Initialize the database first because preload_reference_data uses db_client
    initialize_database()

    # Run independent initialization tasks in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(initialize_cache),
            executor.submit(preload_reference_data),
        ]
        # Wait for all tasks to complete
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result(timeout=30)
            except Exception as e:
                logger.error(f"Warmup task failed: {e}")

    return "Warmup complete", 200
```

## Warmup Requests and Min Idle Instances

Warmup requests work together with the `min_idle_instances` setting. When you have `min_idle_instances: 2`, App Engine keeps two additional idle instances ready for this version, and those instances can go through the warmup process when they start. Scaling events that create additional automatic scaling instances can also trigger warmup requests.

```yaml
# Optimal configuration combining warmup with idle instances
inbound_services:
  - warmup

automatic_scaling:
  min_idle_instances: 2      # Keep 2 additional idle instances ready
  max_idle_instances: 5
  min_pending_latency: 30ms
```

This gives you the best of both worlds - idle instances can be pre-warmed and ready, and new instances that spin up during traffic spikes can also be warmed up before receiving traffic when the scheduler has enough lead time.

## Monitoring Warmup Performance

Track how long your warmup takes by logging timestamps:

```python
import time

@app.route("/_ah/warmup")
def warmup():
    start = time.time()

    initialize_database()
    db_time = time.time() - start

    initialize_cache()
    cache_time = time.time() - start - db_time

    preload_reference_data()
    total_time = time.time() - start

    logger.info(f"Warmup completed in {total_time:.2f}s "
                f"(db: {db_time:.2f}s, cache: {cache_time:.2f}s)")
    return f"Warmup complete in {total_time:.2f}s", 200
```

You can then search for these log entries in Cloud Logging to track warmup performance over time. If warmup times start increasing, it usually means one of your dependencies is getting slower.

## Warmup Request Guarantees

It is important to understand that warmup requests are not guaranteed to run before user traffic in all cases. There are situations where App Engine might skip the warmup:

- During rapid scaling events when many instances need to start quickly
- When the first instance starts after the app has been serving no traffic
- When the instance starts but the warmup request times out
- In some edge cases during deployments

This is why your regular request handlers should have fallback initialization. Do not assume warmup always runs - treat it as an optimization, not a requirement.

## Summary

Warmup requests are a simple but effective way to reduce the impact of cold starts on App Engine Standard services that use automatic scaling. Enable them with a single line in `app.yaml`, implement a `/_ah/warmup` handler that initializes expensive resources, and combine them with `min_idle_instances` for the best latency profile. Always include fallback initialization in your regular handlers because warmup is not guaranteed. Keep the warmup fast by parallelizing independent tasks, and monitor warmup duration to catch performance regressions early.
