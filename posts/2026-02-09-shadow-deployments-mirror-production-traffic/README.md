# How to Implement Shadow Deployments That Mirror Production Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Shadow Deployments, Testing

Description: Learn how to implement shadow deployments in Kubernetes that mirror production traffic to new versions without affecting users, enabling safe testing with real workloads before full rollout.

---

You want to test a new version with real production traffic patterns, but you can't risk affecting actual users. Load testing with synthetic data doesn't capture the complexity and edge cases that real users create.

Shadow deployments solve this by sending a copy of production traffic to the new version while only returning responses from the stable version to users.

## How Shadow Deployments Work

In a shadow deployment:

1. Production traffic goes to the stable version as normal
2. A copy of each request is sent to the shadow version
3. Users receive only responses from the stable version
4. The shadow version's responses are logged and analyzed
5. The shadow version processes requests with real data and workload patterns

This lets you validate that the new version handles production traffic correctly before actually serving users.

## Basic Architecture

Deploy both stable and shadow versions:

```yaml
# Stable version - serves users
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-stable
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: stable
  template:
    metadata:
      labels:
        app: api
        version: stable
    spec:
      containers:
      - name: api
        image: myregistry.io/api:v1.5.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-stable
spec:
  selector:
    app: api
    version: stable
  ports:
  - port: 80
    targetPort: 8080
---
# Shadow version - receives mirrored traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-shadow
spec:
  replicas: 3  # Can be smaller than stable
  selector:
    matchLabels:
      app: api
      version: shadow
  template:
    metadata:
      labels:
        app: api
        version: shadow
    spec:
      containers:
      - name: api
        image: myregistry.io/api:v2.0.0-beta
        ports:
        - containerPort: 8080
        env:
        - name: SHADOW_MODE
          value: "true"  # Application can detect shadow mode
---
apiVersion: v1
kind: Service
metadata:
  name: api-shadow
spec:
  selector:
    app: api
    version: shadow
  ports:
  - port: 80
    targetPort: 8080
```

## Traffic Mirroring with Istio

Istio provides built-in traffic mirroring:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: api-stable
        port:
          number: 80
      weight: 100
    # Mirror to shadow version
    mirror:
      host: api-shadow
      port:
        number: 80
    mirrorPercentage:
      value: 100.0  # Mirror 100% of traffic
```

This configuration:
- Routes all user requests to api-stable
- Sends a copy of each request to api-shadow
- Users only see responses from api-stable
- Shadow version processes requests but responses are discarded

Test it:

```bash
# Send a request
curl https://api.example.com/users/123

# Check stable version handled it
kubectl logs -l app=api,version=stable | grep "GET /users/123"

# Check shadow version also received it
kubectl logs -l app=api,version=shadow | grep "GET /users/123"
```

## Traffic Mirroring with Nginx Ingress

Nginx doesn't have built-in mirroring, but you can use a sidecar proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-stable-with-mirror
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: stable
  template:
    metadata:
      labels:
        app: api
        version: stable
    spec:
      containers:
      # Main application
      - name: api
        image: myregistry.io/api:v1.5.0
        ports:
        - containerPort: 8080

      # Mirroring proxy sidecar
      - name: mirror-proxy
        image: nginx:1.21
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf

      volumes:
      - name: nginx-config
        configMap:
          name: mirror-proxy-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mirror-proxy-config
data:
  nginx.conf: |
    events {
      worker_connections 1024;
    }

    http {
      upstream stable {
        server localhost:8080;
      }

      upstream shadow {
        server api-shadow.default.svc.cluster.local;
      }

      server {
        listen 80;

        location / {
          # Send to stable
          proxy_pass http://stable;

          # Mirror to shadow
          mirror /mirror;
          mirror_request_body on;
        }

        location = /mirror {
          internal;
          proxy_pass http://shadow$request_uri;
          proxy_set_header X-Mirrored-Request "true";
        }
      }
    }
```

## Sampling Traffic

Mirror only a percentage of traffic to reduce load on shadow version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: api-stable
        port:
          number: 80
    mirror:
      host: api-shadow
      port:
        number: 80
    mirrorPercentage:
      value: 25.0  # Mirror only 25% of traffic
```

This is useful when:
- Shadow version has limited capacity
- You want to reduce cost
- You have high traffic volume and don't need every request mirrored

## Comparing Responses

Log and compare responses from both versions to detect differences:

```javascript
// In the shadow version, log responses for comparison
const express = require('express');
const app = express();

app.use((req, res, next) => {
  // Check if this is a mirrored request
  const isMirrored = req.headers['x-mirrored-request'] === 'true';

  if (isMirrored) {
    // Capture response for logging
    const originalSend = res.send;
    res.send = function(data) {
      // Log the response
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        response: data,
        duration: Date.now() - req.startTime
      }));

      return originalSend.apply(res, arguments);
    };
  }

  req.startTime = Date.now();
  next();
});

app.get('/users/:id', async (req, res) => {
  // Your handler code
  const user = await getUser(req.params.id);
  res.json(user);
});

app.listen(8080);
```

Collect and compare logs from stable and shadow versions:

```bash
# Extract responses from both versions for the same request
stable_response=$(kubectl logs -l version=stable | grep "GET /users/123" | jq .response)
shadow_response=$(kubectl logs -l version=shadow | grep "GET /users/123" | jq .response)

# Compare
diff <(echo "$stable_response") <(echo "$shadow_response")
```

## Automated Comparison Service

Deploy a service that automatically compares responses:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shadow-comparator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shadow-comparator
  template:
    metadata:
      labels:
        app: shadow-comparator
    spec:
      containers:
      - name: comparator
        image: myregistry.io/shadow-comparator:latest
        env:
        - name: ELASTICSEARCH_URL
          value: http://elasticsearch:9200
        - name: ALERT_WEBHOOK
          value: https://hooks.slack.com/services/YOUR/WEBHOOK
```

The comparator:
1. Reads logs from both versions
2. Matches requests by ID or timestamp
3. Compares responses
4. Alerts on significant differences

```javascript
// shadow-comparator service
const elasticsearch = require('@elastic/elasticsearch');
const client = new elasticsearch.Client({
  node: process.env.ELASTICSEARCH_URL
});

async function compareResponses() {
  // Query logs from the last minute
  const results = await client.search({
    index: 'application-logs-*',
    body: {
      query: {
        range: {
          timestamp: {
            gte: 'now-1m'
          }
        }
      }
    }
  });

  // Group by request ID
  const requests = {};
  results.body.hits.hits.forEach(hit => {
    const log = hit._source;
    const requestId = log.requestId;

    if (!requests[requestId]) {
      requests[requestId] = {};
    }

    requests[requestId][log.version] = log.response;
  });

  // Compare responses
  for (const [requestId, versions] of Object.entries(requests)) {
    if (versions.stable && versions.shadow) {
      const diff = compareJSON(versions.stable, versions.shadow);

      if (diff.length > 0) {
        await alertDifference(requestId, diff);
      }
    }
  }
}

function compareJSON(obj1, obj2) {
  // Deep comparison logic
  const differences = [];

  // Implementation details...

  return differences;
}

async function alertDifference(requestId, differences) {
  // Send to Slack or monitoring system
  console.log(`Differences found for request ${requestId}:`, differences);
}

// Run every minute
setInterval(compareResponses, 60000);
```

## Handling Side Effects

Shadow deployments need special handling for operations with side effects:

```javascript
// Application code that detects shadow mode
const isShadowMode = process.env.SHADOW_MODE === 'true';

app.post('/orders', async (req, res) => {
  const order = req.body;

  if (isShadowMode) {
    // In shadow mode, don't actually create the order
    // but validate everything and log what would happen
    const validation = await validateOrder(order);

    if (validation.valid) {
      console.log('Shadow mode: would create order', order);
      // Return mock response
      res.json({
        id: 'shadow-' + Date.now(),
        status: 'created',
        shadow: true
      });
    } else {
      console.error('Shadow mode: order validation failed', validation.errors);
      res.status(400).json({ errors: validation.errors });
    }
  } else {
    // Normal mode, actually create the order
    const created = await createOrder(order);
    res.json(created);
  }
});
```

For database operations in shadow mode:

```javascript
class Database {
  constructor() {
    this.isShadowMode = process.env.SHADOW_MODE === 'true';

    if (this.isShadowMode) {
      // Use read-replica for shadow mode
      this.connection = connectToReadReplica();
    } else {
      this.connection = connectToPrimary();
    }
  }

  async insert(table, data) {
    if (this.isShadowMode) {
      // Don't actually insert, just validate
      await this.validateInsert(table, data);
      return { id: 'shadow-id', ...data };
    }

    return this.connection.insert(table, data);
  }

  async query(sql, params) {
    // Reads are safe in shadow mode
    return this.connection.query(sql, params);
  }
}
```

## Monitoring Shadow Deployment Health

Track metrics for shadow version separately:

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-shadow
spec:
  selector:
    matchLabels:
      app: api
      version: shadow
  endpoints:
  - port: metrics
    interval: 30s
```

Alert on anomalies in shadow version:

```yaml
groups:
- name: shadow_deployment
  rules:
  - alert: ShadowVersionErrorRate
    expr: |
      rate(http_requests_total{version="shadow",status=~"5.."}[5m])
        /
      rate(http_requests_total{version="shadow"}[5m])
      > 0.01
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Shadow version has elevated error rate"

  - alert: ShadowVersionLatency
    expr: |
      histogram_quantile(0.99,
        rate(http_request_duration_seconds_bucket{version="shadow"}[5m])
      ) > 1.0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Shadow version has high latency"
```

## Graduating from Shadow to Canary

Once shadow testing passes, promote to canary deployment:

```bash
# Step 1: Run shadow deployment
kubectl apply -f shadow-deployment.yaml

# Wait and monitor for 24-48 hours
# Verify no errors or significant differences

# Step 2: Convert to canary (5% real traffic)
kubectl apply -f canary-deployment.yaml

# Step 3: Gradually increase canary percentage
# 5% -> 10% -> 25% -> 50% -> 100%
```

Your progression might look like:
1. Shadow (0% user impact, 100% mirrored)
2. Canary 5% (5% user impact)
3. Canary 25% (25% user impact)
4. Canary 50% (50% user impact)
5. Full rollout (100% user impact)

## Best Practices

**Run shadow deployments for at least 24 hours**. This captures daily traffic patterns and edge cases.

**Monitor resource usage**. Shadow deployments double your traffic processing, so watch CPU and memory.

**Sample when necessary**. If you have very high traffic, mirror 10-25% instead of 100%.

**Block side effects**. Make absolutely sure shadow versions don't modify data, send emails, charge cards, etc.

**Compare responses automatically**. Don't rely on manual log review; build automated comparison.

**Clean up shadow deployments**. Don't leave them running indefinitely; they consume resources.

**Document differences**. When you find discrepancies, document whether they're acceptable or need fixing.

## Conclusion

Shadow deployments provide the ultimate testing environment: real production traffic with zero user impact. You can validate that new versions handle actual workloads, discover edge cases that staging environments miss, and build confidence before exposing users to changes.

Combine shadow deployments with canary rollouts for a complete safety strategy. Start with shadow testing to validate basic functionality, then progress to canary deployments for gradual user exposure, and finally roll out to all users once both stages pass successfully.
