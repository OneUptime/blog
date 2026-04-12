# How to Monitor Election Frequency in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Election, Monitoring, Metric

Description: Learn how to monitor MongoDB replica set election frequency using serverStatus metrics, logs, and external monitoring tools to detect instability.

---

## Why Monitor Election Frequency?

A healthy MongoDB replica set should rarely hold elections - ideally only during planned maintenance or genuine hardware failure. Frequent elections are a strong signal of instability: network partitions, resource exhaustion, or misconfiguration. Tracking election frequency gives you early warning before issues escalate to data-impacting outages.

## Using serverStatus Election Metrics

MongoDB exposes election counters through `db.adminCommand({ serverStatus: 1 })` under the `electionMetrics` field:

```javascript
const status = db.adminCommand({ serverStatus: 1 });
printjson(status.electionMetrics);
```

Sample output:

```json
{
  "numStepDownsCausedByHigherTerm": 2,
  "numCatchUps": 1,
  "numCatchUpsSucceeded": 1,
  "numCatchUpsAlreadyCaughtUp": 0,
  "numCatchUpsSkipped": 0,
  "numCatchUpsTimedOut": 0,
  "numCatchUpsFailedWithError": 0,
  "numCatchUpsFailedWithNewTerm": 0,
  "numCatchUpsFailedWithReplSetAbortPrimaryCatchUpCmd": 0
}
```

The `numStepDownsCausedByHigherTerm` counter increments each time the current primary yields to a new election. Track this value over time to measure frequency.

## Checking the Replica Set Term

The term number in `rs.status()` increments with every election. Compare it across monitoring intervals:

```javascript
const prev = 12;  // term from last check
const current = rs.status().term;
if (current > prev + 1) {
  print(`WARNING: ${current - prev} elections occurred since last check`);
}
```

You can automate this check with a scheduled script or integrate it into a monitoring pipeline.

## Parsing MongoDB Logs for Election Events

MongoDB logs election-related messages at the `I REPL` component. Extract them from the structured JSON log:

```bash
grep '"c":"REPL"' /var/log/mongodb/mongod.log | grep -iE '"election|stepdown|won election"' | tail -20
```

For legacy text logs:

```bash
grep -E "Starting an election|won election|stepping down|not electable" /var/log/mongodb/mongod.log
```

Build a time-series count of these lines to detect surges.

## Prometheus and MongoDB Exporter

The `mongodb_exporter` exposes replica set metrics as Prometheus gauges and counters. After deploying it, query election-related metrics:

```bash
# Scrape metrics endpoint
curl -s http://localhost:9216/metrics | grep replset_member

# Key metric: replset election state changes
mongodb_replset_member_election_date
```

A Grafana alert rule for detecting frequent elections:

```yaml
groups:
  - name: mongodb_elections
    rules:
      - alert: MongoDBFrequentElections
        expr: increase(mongodb_replset_member_replicationLag[5m]) > 0 and changes(mongodb_replset_member_state[10m]) > 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB replica set member changed state more than twice in 10 minutes"
```

## Tracking Elections with SDAM Events

For application-level election detection, listen to driver SDAM (Server Discovery and Monitoring) events:

```javascript
const client = new MongoClient(uri);
let electionCount = 0;
let lastElectionTime = null;

client.on("serverDescriptionChanged", (event) => {
  if (
    event.previousDescription.type === "RSPrimary" &&
    event.newDescription.type !== "RSPrimary"
  ) {
    electionCount++;
    lastElectionTime = new Date();
    console.log(`Election #${electionCount} at ${lastElectionTime.toISOString()}`);
    // Send to your metrics system (StatsD, Prometheus pushgateway, etc.)
  }
});

await client.connect();
```

## Setting Baseline and Alert Thresholds

```text
Healthy:    0-1 elections per month (planned maintenance)
Warning:    2-5 elections per week
Critical:   Any unplanned election or 2+ elections per day
```

Set alerts at the Warning threshold and investigate logs, host metrics (CPU, I/O, network), and oplog replication lag whenever an unplanned election occurs.

## Summary

Monitoring MongoDB election frequency involves tracking `serverStatus` replication election counters, parsing structured logs for election keywords, using the MongoDB Prometheus exporter with Grafana alerts, and instrumenting application drivers with SDAM event listeners. Combining these signals lets you detect replica set instability early and correlate elections with infrastructure events for rapid root-cause analysis.
