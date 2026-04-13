# How to Use MongoDB with Fluent Bit for Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Fluent Bit, Logging, Kubernetes, DevOps

Description: Learn how to configure Fluent Bit to collect and forward logs to MongoDB using a custom output plugin or HTTP endpoint for lightweight log aggregation.

---

## Overview

Fluent Bit is a lightweight, high-performance log processor often used in Kubernetes environments where Fluentd's resource footprint is too large. While Fluent Bit does not have a native MongoDB output plugin, you can forward logs to MongoDB via an HTTP output plugin combined with a lightweight receiver, or use Fluent Bit to forward to Fluentd which writes to MongoDB.

## Architecture Options

```text
Option A: Fluent Bit -> Fluentd (aggregator) -> MongoDB
Option B: Fluent Bit -> HTTP endpoint -> MongoDB (custom receiver)
Option C: Fluent Bit -> MongoDB via exec output (scripted)
```

## Option A - Fluent Bit Forwarding to Fluentd

Configure Fluent Bit to forward logs to a Fluentd aggregator:

```ini
[SERVICE]
    Flush        5
    Log_Level    info

[INPUT]
    Name   tail
    Path   /var/log/containers/*.log
    Parser docker
    Tag    kube.*

[FILTER]
    Name   kubernetes
    Match  kube.*
    Kube_URL https://kubernetes.default.svc:443

[OUTPUT]
    Name          forward
    Match         *
    Host          fluentd-aggregator.logging.svc.cluster.local
    Port          24224
```

The Fluentd aggregator then writes to MongoDB using `fluent-plugin-mongo` as described in the Fluentd guide.

## Option B - HTTP Output to a Custom Receiver

Write a minimal Node.js HTTP receiver that inserts logs into MongoDB:

```javascript
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('logs');
const collection = db.collection('fluent_bit_logs');

app.post('/logs', async (req, res) => {
  const logs = Array.isArray(req.body) ? req.body : [req.body];
  const docs = logs.map(log => ({ ...log, receivedAt: new Date() }));
  await collection.insertMany(docs);
  res.status(200).json({ inserted: docs.length });
});

client.connect().then(() => app.listen(8080));
```

Configure Fluent Bit to use HTTP output:

```ini
[OUTPUT]
    Name        http
    Match       *
    Host        log-receiver.logging.svc.cluster.local
    Port        8080
    URI         /logs
    Format      json
    tls         off
```

## Kubernetes DaemonSet Deployment

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:3.0
        volumeMounts:
        - name: config
          mountPath: /fluent-bit/etc/
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: fluent-bit-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

## Adding Metadata Enrichment

```ini
[FILTER]
    Name    record_modifier
    Match   *
    Record  cluster_name production
    Record  region us-east-1

[FILTER]
    Name   grep
    Match  *
    Regex  level (error|warn|fatal)
```

## Verifying Logs in MongoDB

```javascript
db.fluent_bit_logs.find().sort({ receivedAt: -1 }).limit(5)
db.fluent_bit_logs.countDocuments({ level: "error" })
```

## Best Practices

- Use Fluent Bit as the per-node agent (DaemonSet) and Fluentd as the aggregator to get the best of both: low resource usage on nodes and the full MongoDB plugin ecosystem on the aggregator.
- Set memory and CPU limits on the Fluent Bit DaemonSet to prevent log collection from starving application pods.
- Use the `grep` filter to drop debug/trace logs at the Fluent Bit level before they reach MongoDB, reducing write volume.

## Summary

Fluent Bit collects logs efficiently on Kubernetes nodes and forwards them to MongoDB either through a Fluentd aggregator or a custom HTTP receiver. This architecture keeps the per-node agent lightweight while leveraging MongoDB's flexible schema for rich log storage.
