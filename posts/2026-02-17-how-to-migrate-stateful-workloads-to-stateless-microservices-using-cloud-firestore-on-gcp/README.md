# How to Migrate Stateful Workloads to Stateless Microservices Using Cloud Firestore on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Firestore, Microservices, Stateless Architecture, Migration, Cloud Run

Description: Externalize application state from in-memory storage to Cloud Firestore to transform stateful services into stateless microservices that scale horizontally on Google Cloud Platform.

---

One of the biggest obstacles when moving to microservices is dealing with state. Your monolith probably keeps things in memory - shopping carts, user preferences, workflow progress, draft documents. That in-memory state ties users to specific instances and makes horizontal scaling painful. The fix is to externalize that state to a managed data store, and Cloud Firestore is a solid option for many use cases on GCP.

This post covers the practical steps for identifying stateful patterns in your application, extracting that state to Firestore, and ending up with services that can scale freely.

## Why Stateless Matters

A stateless service treats every request independently. It does not store anything between requests in its own memory. This means:

- Any instance can handle any request from any user
- You can scale up and down without losing data
- Rolling deployments are seamless because new instances start fresh
- Instance failures do not cause data loss

The trade-off is latency - reading from an external store is slower than reading from local memory. Firestore typically responds in single-digit milliseconds, which is acceptable for most applications.

## Identifying Stateful Patterns

Before you start migrating, audit your code for these common stateful patterns:

```python
# Pattern 1: In-memory caches
product_cache = {}  # Cached across requests

# Pattern 2: Session data stored in the process
from flask import session  # File or memory-based sessions

# Pattern 3: Workflow state kept in variables
class OrderWorkflow:
    def __init__(self):
        self.current_step = 'pending'  # Lost on restart
        self.collected_data = {}

# Pattern 4: Rate limiting with local counters
request_counts = defaultdict(int)  # Per-instance, not global

# Pattern 5: Background task queues in memory
task_queue = Queue()  # Lost on restart
```

Each of these needs a different approach to externalization.

## Setting Up Firestore

Create your Firestore database in native mode:

```bash
# Create a Firestore database in native mode
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native

# The database is ready immediately - no provisioning wait time
```

Firestore in native mode gives you real-time listeners, offline support, and automatic scaling. For microservice state management, the document-based model maps naturally to most state objects.

## Migrating In-Memory Caches

Replace in-memory dictionaries with Firestore-backed storage. Wrap it in a class that handles caching locally with a short TTL:

```python
# state_store.py - Firestore-backed state with local caching
from google.cloud import firestore
import time
import threading

class StateStore:
    """Replaces in-memory dictionaries with Firestore-backed storage."""

    def __init__(self, collection_name, local_cache_ttl=30):
        self.db = firestore.Client()
        self.collection = collection_name
        self.cache_ttl = local_cache_ttl
        self._cache = {}
        self._lock = threading.Lock()

    def get(self, key, default=None):
        """Fetch a value, using local cache if fresh enough."""
        # Check local cache first
        with self._lock:
            cached = self._cache.get(key)
            if cached and (time.time() - cached['ts']) < self.cache_ttl:
                return cached['value']

        # Cache miss - fetch from Firestore
        doc = self.db.collection(self.collection).document(key).get()
        if not doc.exists:
            return default

        value = doc.to_dict().get('value')

        # Update local cache
        with self._lock:
            self._cache[key] = {'value': value, 'ts': time.time()}

        return value

    def set(self, key, value, ttl_seconds=None):
        """Store a value in Firestore with optional TTL."""
        data = {'value': value, 'updated_at': firestore.SERVER_TIMESTAMP}

        if ttl_seconds:
            # Set an expiry timestamp for cleanup
            from datetime import datetime, timedelta
            data['expires_at'] = datetime.utcnow() + timedelta(seconds=ttl_seconds)

        self.db.collection(self.collection).document(key).set(data)

        # Update local cache
        with self._lock:
            self._cache[key] = {'value': value, 'ts': time.time()}

    def delete(self, key):
        """Remove a value from Firestore and local cache."""
        self.db.collection(self.collection).document(key).delete()
        with self._lock:
            self._cache.pop(key, None)
```

Now replace in-memory usage:

```python
# Before: in-memory cache (lost on restart, per-instance only)
# product_cache = {}
# product_cache[product_id] = product_data

# After: Firestore-backed cache (persisted, shared across instances)
product_cache = StateStore('product_cache', local_cache_ttl=60)
product_cache.set(product_id, product_data, ttl_seconds=3600)
product = product_cache.get(product_id)
```

## Migrating Workflow State

Workflow state is trickier because it involves transitions and needs consistency. Firestore transactions handle this well:

```python
# workflow_manager.py - Firestore-backed workflow state machine
from google.cloud import firestore
from enum import Enum

class OrderStatus(Enum):
    PENDING = 'pending'
    PAYMENT_PROCESSING = 'payment_processing'
    PAID = 'paid'
    SHIPPING = 'shipping'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

# Valid state transitions
VALID_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED],
    OrderStatus.PAYMENT_PROCESSING: [OrderStatus.PAID, OrderStatus.PENDING],
    OrderStatus.PAID: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
    OrderStatus.SHIPPING: [OrderStatus.DELIVERED],
}

db = firestore.Client()

def transition_order(order_id, new_status):
    """Atomically transition an order to a new status."""

    @firestore.transactional
    def update_in_transaction(transaction, order_ref):
        snapshot = order_ref.get(transaction=transaction)

        if not snapshot.exists:
            raise ValueError(f'Order {order_id} not found')

        current_status = OrderStatus(snapshot.to_dict()['status'])

        # Validate the transition
        allowed = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise ValueError(
                f'Cannot transition from {current_status.value} to {new_status.value}'
            )

        # Update the status atomically
        transaction.update(order_ref, {
            'status': new_status.value,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'status_history': firestore.ArrayUnion([{
                'from': current_status.value,
                'to': new_status.value,
                'timestamp': firestore.SERVER_TIMESTAMP,
            }]),
        })

    order_ref = db.collection('orders').document(order_id)
    transaction = db.transaction()
    update_in_transaction(transaction, order_ref)
```

## Migrating Rate Limiting

In-memory rate limiting only works per instance. With Firestore, you can implement global rate limiting:

```python
# rate_limiter.py - Distributed rate limiting with Firestore
from google.cloud import firestore
from datetime import datetime, timedelta

db = firestore.Client()

def check_rate_limit(user_id, max_requests=100, window_seconds=60):
    """Check if a user has exceeded the rate limit using Firestore."""
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)
    bucket_key = f'{user_id}:{now.strftime("%Y%m%d%H%M")}'

    counter_ref = db.collection('rate_limits').document(bucket_key)

    @firestore.transactional
    def increment(transaction):
        snapshot = counter_ref.get(transaction=transaction)

        if snapshot.exists:
            count = snapshot.to_dict().get('count', 0)
            if count >= max_requests:
                return False  # Rate limit exceeded

            transaction.update(counter_ref, {
                'count': firestore.Increment(1),
            })
        else:
            transaction.set(counter_ref, {
                'user_id': user_id,
                'count': 1,
                'window_start': now,
                'expires_at': now + timedelta(seconds=window_seconds * 2),
            })

        return True

    transaction = db.transaction()
    return increment(transaction)
```

## Cleaning Up Expired Data

Since Firestore does not have built-in TTL (unlike Redis), set up a scheduled cleanup job:

```python
# cleanup.py - Cloud Function triggered by Cloud Scheduler
from google.cloud import firestore
from datetime import datetime

db = firestore.Client()

def cleanup_expired(event, context):
    """Remove documents that have passed their expiry time."""
    now = datetime.utcnow()

    collections_to_clean = ['product_cache', 'rate_limits', 'session_data']

    for collection_name in collections_to_clean:
        # Query for expired documents
        expired = db.collection(collection_name) \
            .where('expires_at', '<', now) \
            .limit(500) \
            .stream()

        # Delete in batches
        batch = db.batch()
        count = 0
        for doc in expired:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()

        if count % 500 != 0:
            batch.commit()

        print(f'Cleaned {count} expired documents from {collection_name}')
```

Schedule the cleanup to run every 15 minutes:

```bash
# Schedule the cleanup function to run every 15 minutes
gcloud scheduler jobs create http cleanup-expired-state \
  --schedule="*/15 * * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/cleanup-expired" \
  --http-method=POST \
  --oidc-service-account-email=cleanup@my-project.iam.gserviceaccount.com
```

## Deploying Stateless Services on Cloud Run

With all state externalized, your services can run on Cloud Run with aggressive scaling:

```bash
# Deploy a stateless service that scales to zero when idle
gcloud run deploy order-service \
  --image=us-central1-docker.pkg.dev/my-project/services/order-service:latest \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=100 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=my-project" \
  --allow-unauthenticated=false
```

The service can scale to zero when idle because there is no state to lose, and scale to 100 instances during traffic spikes because any instance can serve any request.

## Performance Considerations

Firestore adds latency compared to in-memory access. Here is how to minimize the impact:

- **Use local caching** with short TTLs (as shown in the StateStore class) for data that tolerates slight staleness
- **Batch reads and writes** when possible - Firestore batch operations are more efficient than individual calls
- **Design documents wisely** - keep frequently accessed data in fewer documents to reduce read operations
- **Use Firestore in the same region** as your compute services to minimize network latency

## Wrapping Up

Migrating from stateful to stateless services is about externalizing every piece of data that your application stores in memory between requests. Cloud Firestore handles this well for most patterns - caches, workflow state, rate limits, and session data. The local caching layer bridges the performance gap for read-heavy workloads. Once your services are truly stateless, you unlock effortless horizontal scaling, zero-downtime deployments, and the ability to scale to zero on Cloud Run. Start by auditing your code for stateful patterns, replace them one at a time, and verify that each change works before moving to the next.
