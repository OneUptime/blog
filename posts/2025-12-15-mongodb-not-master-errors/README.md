# How to Fix "not master" Errors in MongoDB Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Replica Set, Troubleshooting, High Availability

Description: Learn how to diagnose and fix MongoDB "not master" errors in replica sets, including causes like elections, network partitions, and misconfigured read preferences, with practical solutions.

---

The "not master" error in MongoDB occurs when your application attempts to write to a secondary node in a replica set. Only the primary node accepts writes, so this error indicates either a connection issue, an ongoing election, or a misconfigured replica set. Understanding replica set dynamics is key to resolving these errors.

## Understanding the Error

When MongoDB returns "not master" (or the newer "not primary"), it means:

```
Error: not master
Error: not master and slaveOk=false
MongoError: not primary
```

```mermaid
flowchart TD
    subgraph "Replica Set"
        P[Primary - Accepts Writes]
        S1[Secondary 1 - Read Only]
        S2[Secondary 2 - Read Only]
    end

    A[Application] -->|Write Request| S1
    S1 -->|"Error: not master"| A

    A -->|Write Request| P
    P -->|Success| A

    P -.->|Replication| S1
    P -.->|Replication| S2
```

## Common Causes

### 1. Primary Election in Progress

During failover, there may be no primary for a brief period:

```javascript
// Error during election
// MongoError: not primary and secondaryOk=false
```

**Solution: Wait for election to complete**

```javascript
const client = new MongoClient(uri, {
  // Allow more time for elections
  serverSelectionTimeoutMS: 30000,

  // Retry writes during transient failures
  retryWrites: true,
  retryReads: true
});

// Implement retry logic
async function writeWithRetry(operation, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isNotMasterError(error) && attempt < maxRetries) {
        console.log(`Not master error, attempt ${attempt}/${maxRetries}`);
        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 100);
        continue;
      }
      throw error;
    }
  }
}

function isNotMasterError(error) {
  return error.code === 10107 ||  // NotMaster
         error.code === 13435 ||  // NotMasterNoSlaveOk
         error.code === 10058 ||  // NotMasterOrSecondary
         error.message?.includes('not master') ||
         error.message?.includes('not primary');
}
```

### 2. Connected to Secondary Without slaveOk

Direct connections to secondaries reject writes:

```javascript
// Wrong: Connecting directly to secondary
const client = new MongoClient('mongodb://secondary1:27017/mydb');

// Correct: Use replica set connection string
const client = new MongoClient(
  'mongodb://primary:27017,secondary1:27017,secondary2:27017/mydb?replicaSet=rs0'
);
```

### 3. Network Partition

Network issues can isolate the primary or your application:

```mermaid
flowchart LR
    subgraph "Data Center 1"
        A[Application]
        P[Primary]
    end

    subgraph "Data Center 2"
        S1[Secondary 1]
        S2[Secondary 2]
    end

    A x--x|Network Partition| S1
    A x--x|Network Partition| S2
    P x--x|Network Partition| S1
    P x--x|Network Partition| S2

    S1 <--> S2
    S1 -->|Election| NP[New Primary]
```

**Solution: Verify network connectivity and replica set health**

```javascript
// Check replica set status
async function checkReplicaSetHealth(client) {
  const admin = client.db('admin');

  try {
    const status = await admin.command({ replSetGetStatus: 1 });

    console.log('Replica Set:', status.set);
    console.log('Members:');

    for (const member of status.members) {
      console.log(`  ${member.name}:`);
      console.log(`    State: ${member.stateStr}`);
      console.log(`    Health: ${member.health === 1 ? 'OK' : 'UNHEALTHY'}`);
      console.log(`    Uptime: ${member.uptime}s`);

      if (member.lastHeartbeatRecv) {
        const lastHeartbeat = new Date() - new Date(member.lastHeartbeatRecv);
        console.log(`    Last heartbeat: ${lastHeartbeat}ms ago`);
      }
    }

    // Find primary
    const primary = status.members.find(m => m.stateStr === 'PRIMARY');
    if (!primary) {
      console.error('WARNING: No primary found!');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to get replica set status:', error);
    return false;
  }
}
```

### 4. Step Down or Maintenance

A primary may step down due to manual intervention or priority changes:

```javascript
// Admin steps down primary
db.adminCommand({ replSetStepDown: 60 });

// Application receives "not master" until new primary elected
```

**Solution: Handle step down gracefully**

```javascript
const client = new MongoClient(uri, {
  // Enable monitoring for topology changes
  monitorCommands: true
});

// Monitor topology changes
client.on('serverDescriptionChanged', (event) => {
  console.log('Server changed:', event.address);
  console.log('  Previous type:', event.previousDescription.type);
  console.log('  New type:', event.newDescription.type);
});

client.on('topologyDescriptionChanged', (event) => {
  const newPrimary = Array.from(event.newDescription.servers.values())
    .find(s => s.type === 'RSPrimary');

  if (newPrimary) {
    console.log('New primary:', newPrimary.address);
  } else {
    console.warn('No primary available');
  }
});
```

### 5. Read Preference Misconfiguration

Writes always go to primary, but reads can be configured wrong:

```javascript
// Wrong: Sending writes with secondary read preference won't help
// The driver still routes writes to primary

// But if your read preference is "secondary" and you're
// reading-then-writing, you might hit stale data issues

// Correct: Use appropriate read preferences
const client = new MongoClient(uri, {
  readPreference: 'primaryPreferred'  // Reads prefer primary but can use secondary
});

// For specific operations
const cursor = db.collection('data')
  .find({})
  .readPreference('secondary');  // Explicitly read from secondary

// Writes always go to primary automatically
await db.collection('data').insertOne({ key: 'value' });
```

## Diagnosing Not Master Errors

### Check Current Primary

```javascript
// From mongo shell
rs.status()
rs.isMaster()

// From application
async function getCurrentPrimary(client) {
  const admin = client.db('admin');
  const result = await admin.command({ isMaster: 1 });

  return {
    isPrimary: result.ismaster,
    primary: result.primary,
    hosts: result.hosts,
    setName: result.setName,
    me: result.me
  };
}
```

### Check Connection String

Ensure you're using a replica set connection string:

```javascript
// Correct format
const uri = 'mongodb://host1:27017,host2:27017,host3:27017/dbname?replicaSet=rs0';

// With authentication
const uri = 'mongodb://user:pass@host1:27017,host2:27017,host3:27017/dbname?replicaSet=rs0&authSource=admin';

// Parse and verify
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri);
await client.connect();

const topology = client.topology;
console.log('Topology type:', topology.description.type);
// Should be 'ReplicaSetWithPrimary' or 'ReplicaSetNoPrimary'
```

### Monitor Elections

```javascript
// Track primary changes
let currentPrimary = null;

async function monitorPrimary(client) {
  setInterval(async () => {
    try {
      const info = await client.db('admin').command({ isMaster: 1 });

      if (info.primary !== currentPrimary) {
        console.log(`Primary changed: ${currentPrimary} -> ${info.primary}`);
        currentPrimary = info.primary;
      }
    } catch (error) {
      console.error('Failed to check primary:', error.message);
    }
  }, 5000);
}
```

## Solutions Summary

### 1. Use Proper Connection String

```javascript
// Include all replica set members
const uri = 'mongodb://rs0-0:27017,rs0-1:27017,rs0-2:27017/mydb?replicaSet=rs0';
```

### 2. Enable Retry Writes

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  retryReads: true
});
```

### 3. Set Appropriate Timeouts

```javascript
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,  // Wait for primary election
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000
});
```

### 4. Implement Application-Level Retry

```javascript
async function resilientWrite(collection, operation) {
  const maxRetries = 5;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation(collection);
    } catch (error) {
      lastError = error;

      if (error.code === 10107 || error.code === 13435) {
        // Not master - wait and retry
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Usage
await resilientWrite(db.collection('orders'), async (col) => {
  return col.insertOne({ item: 'widget', qty: 100 });
});
```

### 5. Use Transactions for Critical Operations

```javascript
// Transactions automatically retry on not-master errors
async function transferFunds(client, from, to, amount) {
  const session = client.startSession();

  try {
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });

    await db.accounts.updateOne(
      { _id: from },
      { $inc: { balance: -amount } },
      { session }
    );

    await db.accounts.updateOne(
      { _id: to },
      { $inc: { balance: amount } },
      { session }
    );

    // commitTransaction has built-in retry for transient errors
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

## Preventing Not Master Errors

1. **Deploy proper replica sets** - Minimum 3 members for fault tolerance

2. **Use read preferences wisely** - `primaryPreferred` for most read operations

3. **Monitor replica set health** - Alert on missing primary

4. **Configure proper timeouts** - Allow time for elections

5. **Test failover scenarios** - Ensure your application handles elections

6. **Implement circuit breakers** - Prevent cascade failures during elections

```javascript
class MongoCircuitBreaker {
  constructor(threshold = 5, resetTimeout = 30000) {
    this.failures = 0;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.lastFailure = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF-OPEN';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(error) {
    if (isNotMasterError(error)) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
    }
  }
}
```

## Summary

"Not master" errors indicate your application is trying to write to a secondary node. Fix them by:

1. **Using replica set connection strings** - Include all members
2. **Enabling retryWrites** - Handle transient failures automatically
3. **Setting proper timeouts** - Allow time for elections
4. **Implementing retry logic** - Application-level resilience
5. **Monitoring replica set health** - Detect issues early

With proper configuration and error handling, your application will gracefully handle primary elections and network issues.
