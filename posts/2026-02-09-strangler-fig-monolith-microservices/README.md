# How to Modernize Monolithic Applications into Kubernetes Microservices with Strangler Fig Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Microservices, Migration

Description: Learn how to incrementally migrate monolithic applications to microservices on Kubernetes using the Strangler Fig pattern for risk-managed decomposition.

---

The Strangler Fig pattern enables incremental migration from monoliths to microservices by gradually replacing functionality while keeping the original system running. Named after strangler fig vines that eventually replace their host trees, this pattern minimizes risk during modernization. This guide shows you how to apply the Strangler Fig pattern to migrate monolithic applications to Kubernetes microservices.

## Understanding the Strangler Fig Pattern

The pattern involves routing traffic selectively between the monolith and new microservices.

```yaml
# High-level architecture
apiVersion: v1
kind: ConfigMap
metadata:
  name: strangler-architecture
  namespace: migration
data:
  pattern.md: |
    # Strangler Fig Migration Pattern

    Phase 1: Monolith Only
    [Client] -> [Monolith]

    Phase 2: Proxy Introduction
    [Client] -> [Router/Proxy] -> [Monolith]

    Phase 3: First Microservice
    [Client] -> [Router/Proxy] -> [User Service (new)]
                                -> [Monolith (other features)]

    Phase 4: Progressive Migration
    [Client] -> [Router/Proxy] -> [User Service]
                                -> [Order Service]
                                -> [Product Service]
                                -> [Monolith (remaining)]

    Phase 5: Monolith Retired
    [Client] -> [API Gateway] -> [User Service]
                               -> [Order Service]
                               -> [Product Service]
```

Traffic routing is the key to this pattern's success.

## Deploying the Monolith on Kubernetes

Start by containerizing the existing monolith.

```yaml
# monolith-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-monolith
  namespace: migration
  labels:
    app: monolith
    version: legacy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monolith
  template:
    metadata:
      labels:
        app: monolith
        version: legacy
    spec:
      containers:
      - name: monolith
        image: legacy-app:v1.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "4"
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: monolith
  namespace: migration
spec:
  selector:
    app: monolith
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

The monolith runs alongside new microservices during migration.

## Setting Up the Strangler Proxy

Deploy a proxy that routes traffic between monolith and microservices.

```yaml
# strangler-proxy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-strangler-config
  namespace: migration
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }

    http {
        upstream monolith {
            server monolith.migration.svc.cluster.local:80;
        }

        upstream user_service {
            server user-service.migration.svc.cluster.local:80;
        }

        upstream order_service {
            server order-service.migration.svc.cluster.local:80;
        }

        server {
            listen 80;

            # Route user endpoints to new microservice
            location /api/users {
                proxy_pass http://user_service;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }

            location /api/auth {
                proxy_pass http://user_service;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }

            # Route order endpoints to new microservice
            location /api/orders {
                proxy_pass http://order_service;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }

            # All other requests go to monolith
            location / {
                proxy_pass http://monolith;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: strangler-proxy
  namespace: migration
spec:
  replicas: 2
  selector:
    matchLabels:
      app: strangler-proxy
  template:
    metadata:
      labels:
        app: strangler-proxy
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: config
        configMap:
          name: nginx-strangler-config
---
apiVersion: v1
kind: Service
metadata:
  name: strangler-proxy
  namespace: migration
spec:
  selector:
    app: strangler-proxy
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

This proxy intercepts requests and routes them based on path patterns.

## Extracting the First Microservice

Identify and extract a bounded context from the monolith.

```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: migration
  labels:
    app: user-service
    component: microservice
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
        component: microservice
    spec:
      containers:
      - name: service
        image: user-service:v1.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: user-db-credentials
              key: url
        - name: MONOLITH_URL
          value: "http://monolith.migration.svc.cluster.local"
        resources:
          requests:
            cpu: "500m"
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: migration
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 8080
```

The new microservice initially calls back to the monolith for functionality not yet extracted.

## Implementing Data Migration Strategy

Handle database decomposition carefully to avoid data inconsistency.

```yaml
# Shared database approach (Phase 1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: data-migration-strategy
  namespace: migration
data:
  phase1.md: |
    # Phase 1: Shared Database
    - User service reads from monolith database
    - Both systems write to same database
    - Coordination through database transactions

  phase2.md: |
    # Phase 2: Database Views
    - Create database views for user service
    - User service owns user tables
    - Monolith accesses via views with sync logic

  phase3.md: |
    # Phase 3: Dual Writes
    - User service has own database
    - Writes happen to both databases
    - Background job synchronizes data

  phase4.md: |
    # Phase 4: Event-Driven Sync
    - User service publishes events on changes
    - Monolith subscribes to sync its cache
    - Eventually consistent

  phase5.md: |
    # Phase 5: Full Separation
    - User service is source of truth
    - Monolith calls API for user data
    - No direct database access
---
# Dual-write coordination example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-sync-service
  namespace: migration
spec:
  replicas: 1
  selector:
    matchLabels:
      app: data-sync
  template:
    spec:
      containers:
      - name: sync
        image: data-sync:v1.0
        env:
        - name: SOURCE_DB
          value: "user-service-db"
        - name: TARGET_DB
          value: "monolith-db"
        - name: SYNC_TABLES
          value: "users,profiles,permissions"
        command:
        - /app/sync-daemon
        - --interval=60s
        - --bidirectional=true
```

Data migration is often the most complex part of decomposition.

## Implementing Anti-Corruption Layer

Protect new microservices from monolith complexity.

```go
// Anti-corruption layer in user service
package main

import (
    "encoding/json"
    "net/http"
)

// MonolithClient wraps calls to legacy system
type MonolithClient struct {
    baseURL string
}

// Legacy monolith response structure
type LegacyUserResponse struct {
    UserID     string `json:"user_id"`     // Different field names
    FullName   string `json:"full_name"`
    EmailAddr  string `json:"email_addr"`
    StatusCode int    `json:"status_code"` // Different status semantics
}

// Modern microservice domain model
type User struct {
    ID     string `json:"id"`
    Name   string `json:"name"`
    Email  string `json:"email"`
    Active bool   `json:"active"`
}

// Translate legacy response to modern domain model
func (c *MonolithClient) GetUser(id string) (*User, error) {
    resp, err := http.Get(c.baseURL + "/users/" + id)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var legacy LegacyUserResponse
    if err := json.NewDecoder(resp.Body).Decode(&legacy); err != nil {
        return nil, err
    }

    // Translation layer: convert legacy format to modern format
    return &User{
        ID:     legacy.UserID,
        Name:   legacy.FullName,
        Email:  legacy.EmailAddr,
        Active: legacy.StatusCode == 1, // Translate status code to boolean
    }, nil
}

// OrderService calls through anti-corruption layer
func (s *UserService) GetUserOrders(userID string) ([]Order, error) {
    // Get user from our service
    user, err := s.repo.GetUser(userID)
    if err != nil {
        return nil, err
    }

    // Call monolith through anti-corruption layer
    legacyOrders, err := s.monolithClient.GetOrdersForUser(userID)
    if err != nil {
        return nil, err
    }

    // Translate to our domain model
    return translateOrders(legacyOrders), nil
}
```

The anti-corruption layer isolates microservices from monolith implementation details.

## Progressive Traffic Shifting

Gradually increase traffic to new microservices using canary deployments.

```yaml
# Istio VirtualService for progressive traffic shift
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-api-progressive
  namespace: migration
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        subset: v1
      weight: 20  # 20% to new microservice
    - destination:
        host: monolith
        subset: legacy
      weight: 80  # 80% to monolith
---
# Update weights weekly
apiVersion: v1
kind: ConfigMap
metadata:
  name: traffic-shift-schedule
  namespace: migration
data:
  schedule.yaml: |
    week1:
      user-service: 10%
      monolith: 90%
    week2:
      user-service: 25%
      monolith: 75%
    week3:
      user-service: 50%
      monolith: 50%
    week4:
      user-service: 75%
      monolith: 25%
    week5:
      user-service: 100%
      monolith: 0%
```

Progressive traffic shifting validates new microservices under real load.

## Monitoring During Migration

Track metrics to validate microservice behavior matches monolith.

```yaml
# Prometheus rules for migration monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: strangler-migration-alerts
  namespace: monitoring
spec:
  groups:
  - name: migration_validation
    interval: 30s
    rules:
    # Compare error rates
    - record: migration:error_rate:monolith
      expr: |
        rate(http_requests_total{app="monolith",status=~"5.."}[5m]) /
        rate(http_requests_total{app="monolith"}[5m])

    - record: migration:error_rate:microservice
      expr: |
        rate(http_requests_total{app="user-service",status=~"5.."}[5m]) /
        rate(http_requests_total{app="user-service"}[5m])

    - alert: MicroserviceHigherErrorRate
      expr: |
        migration:error_rate:microservice >
        migration:error_rate:monolith * 1.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Microservice error rate significantly higher than monolith"

    # Compare latencies
    - alert: MicroserviceSlowerThanMonolith
      expr: |
        histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket{app="user-service"}[5m])
        ) >
        histogram_quantile(0.95,
          rate(http_request_duration_seconds_bucket{app="monolith",path="/api/users"}[5m])
        ) * 1.3
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Microservice P95 latency 30% higher than monolith"
```

These alerts catch regressions early during migration.

## Decommissioning Monolith Features

Remove functionality from monolith after microservice proves stable.

```bash
#!/bin/bash
# Script to retire monolith features

FEATURE="users"
MICROSERVICE="user-service"

echo "Validating $MICROSERVICE before retiring monolith $FEATURE feature..."

# Check microservice health for 7 days
START_DATE=$(date -d '7 days ago' +%s)
ERROR_COUNT=$(curl -s "http://prometheus:9090/api/v1/query_range?query=rate(http_requests_total{app='$MICROSERVICE',status=~'5..'}[5m])&start=$START_DATE&end=$(date +%s)&step=3600" | jq '[.data.result[].values[][1] | tonumber] | add')

if (( $(echo "$ERROR_COUNT > 100" | bc -l) )); then
  echo "ERROR: Microservice showing elevated errors. Not safe to retire monolith feature."
  exit 1
fi

# Check traffic distribution
MICROSERVICE_TRAFFIC=$(kubectl top pods -n migration -l app=$MICROSERVICE --containers | awk '{sum+=$3} END {print sum}')
MONOLITH_USER_TRAFFIC=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{app='monolith',path='/api/users'}[5m])" | jq -r '.data.result[0].value[1]')

if (( $(echo "$MONOLITH_USER_TRAFFIC > 0.01" | bc -l) )); then
  echo "WARNING: Monolith still receiving $FEATURE traffic. Update routing first."
  exit 1
fi

echo "Safe to remove $FEATURE from monolith"

# Deploy monolith version with feature removed
kubectl set image deployment/legacy-monolith monolith=legacy-app:v1.1-no-users -n migration
kubectl rollout status deployment/legacy-monolith -n migration

echo "Monolith $FEATURE feature retired successfully"
```

Only remove monolith features after microservices fully replace them.

## Conclusion

The Strangler Fig pattern enables safe incremental migration from monoliths to microservices. Deploy the monolith on Kubernetes as the starting point. Add a proxy layer that routes traffic between the monolith and new microservices based on request paths. Extract one bounded context at a time into microservices, starting with the least risky. Implement an anti-corruption layer to isolate microservices from monolith complexity. Handle data migration carefully, progressing from shared databases to eventual consistency through events. Use progressive traffic shifting to gradually validate microservice behavior under real load. Monitor error rates and latency to catch regressions early. Remove features from the monolith only after microservices prove stable. This gradual approach minimizes risk compared to big-bang rewrites while modernizing applications incrementally.
