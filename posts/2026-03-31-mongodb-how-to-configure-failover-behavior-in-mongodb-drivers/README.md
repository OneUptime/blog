# How to Configure Failover Behavior in MongoDB Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Driver, High Availability, Failover

Description: Learn how to configure MongoDB driver settings for automatic failover, including serverSelectionTimeout, retryWrites, and read preference options.

---

## Understanding MongoDB Failover

When a MongoDB replica set primary goes down, a new primary is elected automatically. MongoDB drivers handle this transition by detecting the topology change and routing operations to the new primary. Proper driver configuration ensures your application survives failover events with minimal disruption.

The key driver settings that affect failover behavior are:

- `serverSelectionTimeoutMS` - how long the driver waits to find a suitable server
- `heartbeatFrequencyMS` - how often the driver checks server health
- `retryWrites` - whether to retry failed write operations
- `retryReads` - whether to retry failed read operations

## Configuring the Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0', {
  // How long to wait for server selection during failover
  serverSelectionTimeoutMS: 30000,

  // How frequently the driver checks server health
  heartbeatFrequencyMS: 10000,

  // Automatically retry writes on network errors (default: true)
  retryWrites: true,

  // Automatically retry reads on network errors (default: true)
  retryReads: true,

  // Socket timeout for operations
  socketTimeoutMS: 45000,

  // Connection timeout
  connectTimeoutMS: 10000,
});
```

## Configuring Read Preference for Failover

Read preference controls which replica set member the driver reads from. This directly impacts failover behavior for read operations.

```javascript
const { MongoClient, ReadPreference } = require('mongodb');

const client = new MongoClient('mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0', {
  // primaryPreferred allows reads from secondaries when primary is unavailable
  readPreference: ReadPreference.PRIMARY_PREFERRED,

  // Tag-based read preference for targeted reads
  // readPreference: new ReadPreference('secondary', [{ region: 'us-east' }]),
});

async function readWithFailover() {
  const db = client.db('mydb');
  const collection = db.collection('users');

  // This read will fall back to secondary if primary is unavailable
  const users = await collection.find({}).toArray();
  return users;
}
```

## Python Driver (PyMongo) Configuration

```python
from pymongo import MongoClient, ReadPreference
from pymongo.errors import ConnectionFailure, OperationFailure

client = MongoClient(
    'mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0',
    # Wait up to 30 seconds for server selection
    serverSelectionTimeoutMS=30000,
    # Check server health every 10 seconds
    heartbeatFrequencyMS=10000,
    # Retry writes automatically
    retryWrites=True,
    # Retry reads automatically
    retryReads=True,
    # Connection timeout
    connectTimeoutMS=10000,
    # Socket timeout
    socketTimeoutMS=45000,
    # Read from primary, fallback to secondary
    readPreference='primaryPreferred',
)

def read_with_failover_handling():
    try:
        db = client['mydb']
        return list(db.users.find({}))
    except ConnectionFailure as e:
        print(f'Connection failed during failover: {e}')
        raise
```

## Java Driver Configuration

```java
import com.mongodb.MongoClientSettings;
import com.mongodb.ReadPreference;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyToClusterSettings(builder ->
        builder.hosts(Arrays.asList(
            new ServerAddress("host1", 27017),
            new ServerAddress("host2", 27017),
            new ServerAddress("host3", 27017)
        ))
        .serverSelectionTimeout(30, TimeUnit.SECONDS)
    )
    .applyToSocketSettings(builder ->
        builder.connectTimeout(10, TimeUnit.SECONDS)
               .readTimeout(45, TimeUnit.SECONDS)
    )
    .applyToServerSettings(builder ->
        builder.heartbeatFrequency(10, TimeUnit.SECONDS)
    )
    .retryWrites(true)
    .retryReads(true)
    .readPreference(ReadPreference.primaryPreferred())
    .build();

MongoClient mongoClient = MongoClients.create(settings);
```

## Testing Failover Behavior

You can simulate failover to test your driver configuration:

```bash
# Step down the current primary (from the primary's mongo shell)
rs.stepDown(60)

# Check replica set status
rs.status()

# Verify a new primary was elected
db.hello()
```

Monitor your application logs during the stepdown to verify:
1. The driver detects the topology change within `heartbeatFrequencyMS`
2. Operations waiting for a primary complete within `serverSelectionTimeoutMS`
3. Retryable writes succeed after the new primary is elected

## Handling Failover Errors in Application Code

```javascript
async function writeWithRetry(collection, document, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await collection.insertOne(document);
      return result;
    } catch (error) {
      const isRetryable = [
        'NotWritablePrimary',
        'InterruptedDueToReplStateChange',
        'PrimarySteppedDown',
      ].includes(error.codeName);

      if (isRetryable && attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying after failover...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

## Summary

Configuring MongoDB driver failover behavior involves setting appropriate timeouts (`serverSelectionTimeoutMS`, `heartbeatFrequencyMS`), enabling retryable writes and reads, and choosing a suitable read preference like `primaryPreferred`. Testing your configuration by simulating primary stepdowns ensures your application handles real failover events gracefully.
