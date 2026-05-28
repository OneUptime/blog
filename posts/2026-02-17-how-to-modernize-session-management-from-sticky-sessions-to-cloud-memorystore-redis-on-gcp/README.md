# How to Modernize Session Mgmt from Sticky Sessions to Cloud Memorystore Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Memorystore, Redis, Session Management, Load Balancing, Migration

Description: Learn how to move away from sticky sessions and implement centralized session management using Cloud Memorystore for Redis on Google Cloud Platform for better scalability and reliability.

---

If you have ever worked with legacy web applications, you have probably run into sticky sessions. The load balancer routes a user to the same backend instance for the duration of their session, and everything works - until that instance goes down and your users lose their state. It is one of those patterns that felt fine at small scale but falls apart as you grow.

I spent a good chunk of time migrating a production application off sticky sessions and onto Cloud Memorystore for Redis on GCP. Here is what I learned and how you can do the same.

## Why Sticky Sessions Are a Problem

Sticky sessions (also called session affinity) tie a user to a specific server instance. The main issues are:

- **Uneven load distribution**: Some instances end up overloaded while others sit idle.
- **Poor fault tolerance**: When an instance crashes, every user session on that instance is gone.
- **Scaling difficulties**: You cannot easily add or remove instances because users are pinned to specific ones.
- **Rolling deployments become painful**: You have to drain sessions before taking an instance out of rotation.

The fix is straightforward in concept - externalize your session state so any instance can serve any request. Cloud Memorystore for Redis is an excellent fit for this on GCP.

## What Is Cloud Memorystore for Redis?

Cloud Memorystore is a fully managed Redis service on Google Cloud. You get a Redis instance without having to manage the underlying infrastructure, handle patching, or worry about failover configuration. It integrates with your VPC, supports high availability with automatic failover, and scales from basic tier (single node) to standard tier (with replicas).

For session storage, Redis is a natural choice. Sessions are key-value data with TTLs, and Redis handles that workload extremely well with sub-millisecond latency.

## Setting Up Cloud Memorystore

First, create a Memorystore Redis instance. You can do this through the console or the CLI. Here is the gcloud command to provision a standard-tier instance with high availability.

```bash
# Create a standard-tier Redis instance with 1GB memory in your VPC

gcloud redis instances create session-store \
  --size=1 \
  --region=us-central1 \
  --zone=us-central1-a \
  --alternative-zone=us-central1-b \
  --tier=standard \
  --redis-version=redis_7_2 \
  --network=default \
  --connect-mode=private-service-access
```

Standard tier gives you a replica and automatic failover. Specifying an alternative zone places the replica in a different zone, so if the primary goes down, failover is automatic. The private service access connect mode also requires Private Service Access to be configured for the VPC first. For session data, this is exactly what you want.

After the instance is created, grab the host and port:

```bash
# Get the connection details for your Redis instance
gcloud redis instances describe session-store --region=us-central1 \
  --format="value(host,port)"
```

## Updating Your Application Code

The application changes depend on your framework, but the pattern is the same everywhere - swap the in-memory session store for a Redis-backed one. Here is an example with a Node.js Express application.

```javascript
// Install dependencies: npm install express-session connect-redis redis

const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');

const app = express();
app.set('trust proxy', 1);

// Create Redis client pointing to your Memorystore instance
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST, // Memorystore private IP
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  // Memorystore uses VPC-level auth, no password needed by default
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

// Configure session middleware with Redis store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 1800000, // 30 minutes
  },
}));

app.get('/profile', (req, res) => {
  // Session data is now in Redis - any instance can serve this
  if (req.session.userId) {
    res.json({ userId: req.session.userId });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.listen(8080, () => console.log('Server running on port 8080'));
```

For Python Flask applications, the approach is similar:

```python
# Install: pip install flask flask-session redis

from flask import Flask, session
from flask_session import Session
import redis
import os

app = Flask(__name__)

# Point to your Memorystore Redis instance
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.Redis(
    host=os.environ.get('REDIS_HOST'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    decode_responses=False
)
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes

# Initialize the session extension
Session(app)

@app.route('/profile')
def profile():
    # Any instance can read this session from Redis
    if 'user_id' in session:
        return {'user_id': session['user_id']}
    return {'error': 'Not authenticated'}, 401
```

## Removing Sticky Session Configuration from the Load Balancer

Once your application reads and writes sessions from Redis, you need to remove the session affinity from your load balancer. If you are using a GCP HTTP(S) load balancer, update the backend service.

```bash
# Remove session affinity from the backend service
gcloud compute backend-services update my-backend-service \
  --global \
  --session-affinity=NONE
```

This tells the load balancer to use its normal backend selection policy without pinning users to specific instances.

## Network Configuration

Cloud Memorystore instances are accessible through VPC networking. This means your Compute Engine VMs, GKE pods, or Cloud Run services need network access to the Redis instance's authorized VPC network.

For GKE, no extra configuration is needed if your cluster is in the same VPC, although private service access requires a VPC-native cluster with IP aliasing enabled. For Cloud Run, one option is to set up a Serverless VPC Access connector:

```bash
# Create a VPC connector for Cloud Run to access Memorystore
gcloud compute networks vpc-access connectors create redis-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10

# Deploy Cloud Run service with the VPC connector
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-service \
  --vpc-connector=redis-connector \
  --set-env-vars="REDIS_HOST=10.0.0.3,REDIS_PORT=6379"
```

## Migration Strategy

Doing this migration without downtime takes a bit of planning. Here is the approach I recommend:

1. **Deploy Memorystore** and verify connectivity from your application instances.
2. **Update your application** to use Redis for sessions but keep sticky sessions enabled on the load balancer. If you need existing in-memory sessions to survive the cutover, add a temporary fallback that reads the old local session store and writes the session into Redis on the next request. Otherwise, plan for existing users to sign in again as their old in-memory sessions are no longer readable by the Redis-backed session middleware.
3. **Monitor for a session TTL period** (for example, 30 minutes). Watch Redis for session creation and verify everything is working.
4. **Remove sticky session configuration** from the load balancer once you are confident.
5. **Clean up** any in-memory session code paths.

The key insight is that you can keep load balancer affinity in place while the Redis-backed version rolls out, then remove affinity after you have either migrated or allowed the old in-memory sessions to expire.

## Monitoring Your Redis Instance

Keep an eye on your Memorystore instance after the migration. Cloud Monitoring gives you metrics out of the box.

```bash
# Check provisioned size and current location
gcloud redis instances describe session-store \
  --region=us-central1 \
  --format="table(memorySizeGb, host, port, currentLocationId)"
```

Watch these metrics in Cloud Monitoring:

- **Memory usage ratio**: If you are consistently above 80%, consider scaling up.
- **Connected clients**: Make sure this matches your expected instance count.
- **Cache hit ratio**: Should be high for session workloads.
- **Evicted keys**: If you see evictions, your instance is too small.

## Sizing Considerations

For session storage, a little goes a long way. A typical session object is 1-5 KB. With a 1 GB Memorystore instance, the raw payload math works out to roughly 200,000 to 1,000,000 concurrent sessions before accounting for Redis key, value, expiration, and allocator overhead. Most applications will not need more than the smallest instance size.

Start small and scale up based on actual usage. Memorystore lets you resize instances, but scaling causes a short connection reset, so your application should have Redis retry and reconnect logic.

## Wrapping Up

Moving from sticky sessions to Memorystore Redis is one of those changes that pays for itself quickly. Your load balancing becomes truly even, your instances become interchangeable, rolling deployments stop being stressful, and a single instance failure no longer means lost sessions.

The actual code changes are minimal - most frameworks have Redis session adapters that work as drop-in replacements. The harder part is the operational work of provisioning the Redis instance, getting the networking right, and executing the migration without downtime. But once it is done, you have a much more resilient foundation for scaling your application on GCP.
