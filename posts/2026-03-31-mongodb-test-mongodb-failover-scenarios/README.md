# How to Test MongoDB Failover Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Failover, Testing, Replica Set, Resilience

Description: Learn how to test MongoDB failover scenarios by simulating primary elections, network partitions, and node failures to validate your application's resilience.

---

Testing MongoDB failover scenarios before they happen in production gives you confidence that your replica set configuration, driver settings, and application retry logic work correctly under pressure. Systematic failover testing uncovers hidden assumptions and configuration gaps.

## Test 1: Trigger a Manual Primary Step-Down

The simplest failover test is forcing the primary to step down and observing how quickly a new primary is elected.

```bash
# Connect to the primary and step it down for 60 seconds
mongosh --host mongo1:27017 --eval "rs.stepDown(60)"
```

```javascript
// Monitor election from another node
const checkPrimary = async () => {
  const status = rs.status();
  const primary = status.members.find(m => m.stateStr === "PRIMARY");
  console.log(primary ? `New primary: ${primary.name}` : "No primary yet");
};

// Poll every 500ms
const interval = setInterval(checkPrimary, 500);
setTimeout(() => clearInterval(interval), 30000);
```

Measure the time between calling `stepDown` and when `checkPrimary` first returns a new primary.

## Test 2: Kill the Primary Process

Simulate a hard failure by killing the mongod process directly.

```bash
# On the primary server - find and kill the process
sudo kill -9 $(pgrep mongod)

# From another terminal, watch election time
while true; do
  mongosh --host mongo2:27017 --quiet --eval \
    "rs.status().members.find(m => m.stateStr === 'PRIMARY')?.name || 'electing...'"
  sleep 0.5
done
```

This simulates an OS crash or OOM kill and tests whether your application handles the reconnection gracefully.

## Test 3: Simulate a Network Partition with iptables

Partition the primary from the rest of the replica set using firewall rules.

```bash
# On the primary server - block traffic to/from secondaries
sudo iptables -A INPUT -s mongo2 -j DROP
sudo iptables -A INPUT -s mongo3 -j DROP
sudo iptables -A OUTPUT -d mongo2 -j DROP
sudo iptables -A OUTPUT -d mongo3 -j DROP

# Wait for secondaries to elect a new primary (mongo2 or mongo3)
# Then restore network
sudo iptables -F
```

After restoring the network, verify that the old primary rejoins as a secondary without data divergence.

## Test 4: Validate Application Behavior During Failover

Run a continuous write loop in your application while triggering failover and observe the error behavior.

```javascript
async function continuousWriteTest() {
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < 60000) {
    try {
      await db.collection("failover_test").insertOne({
        ts: new Date(),
        value: Math.random()
      });
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`Write failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`Success: ${successCount}, Errors: ${errorCount}`);
  console.log(`Error rate: ${((errorCount / (successCount + errorCount)) * 100).toFixed(2)}%`);
}
```

With `retryWrites: true` enabled, you should see near-zero errors during a clean step-down.

## Test 5: Chaos Testing with mtools

Use `mtools` to orchestrate complex failover scenarios against a local replica set.

```bash
# Install mtools with mlaunch dependencies
pip install mtools[mlaunch]

# Start a 3-node replica set for testing
mlaunch init --replicaset --nodes 3

# Kill one node to simulate failure
mlaunch kill --port 27018

# Check replica set status
mongosh --eval "rs.status()"

# Restart the failed node
mlaunch start --port 27018
```

## Automate Failover Tests in CI

Include failover tests in your CI pipeline using Docker Compose to manage a local replica set.

```yaml
services:
  mongo1:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
  mongo2:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
  mongo3:
    image: mongo:7.0
    command: mongod --replSet rs0 --bind_ip_all
```

Your test suite can then call `rs.stepDown()` and assert that write operations resume within your SLA window.

## Summary

Testing MongoDB failover scenarios involves progressively more severe failure simulations: manual step-down, process kill, and network partition. Measure election time and application error rate during each test, then compare against your availability SLA. Automating these tests in CI with a local Docker-based replica set ensures that changes to driver configuration or application retry logic do not silently break failover resilience.
