# How to Create Terraform State Locking Custom

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IaC, State-Management, Locking

Description: Learn how to implement custom state locking mechanisms in Terraform to prevent concurrent modifications and ensure infrastructure consistency.

---

Terraform state locking prevents multiple users or processes from modifying your infrastructure simultaneously. While cloud backends like S3 with DynamoDB provide built-in locking, there are scenarios where you need a custom solution. This guide walks you through implementing your own state locking mechanism.

## Why Custom State Locking?

Default backends work well for most cases, but custom locking becomes necessary when:

- Your organization uses an unsupported backend storage
- You need fine-grained control over lock behavior
- You want to integrate with existing internal tools
- You are building a custom Terraform workflow orchestrator
- You need cross-region or multi-cloud state coordination

## How Terraform State Locking Works

Before building a custom solution, understand the locking flow:

```mermaid
sequenceDiagram
    participant User as Terraform User
    participant TF as Terraform CLI
    participant Lock as Lock Backend
    participant State as State Storage

    User->>TF: terraform apply
    TF->>Lock: Acquire Lock
    alt Lock Available
        Lock-->>TF: Lock Acquired (Lock ID)
        TF->>State: Read State
        State-->>TF: Current State
        TF->>TF: Plan & Apply Changes
        TF->>State: Write New State
        TF->>Lock: Release Lock
        Lock-->>TF: Lock Released
        TF-->>User: Apply Complete
    else Lock Held
        Lock-->>TF: Lock Denied (Holder Info)
        TF-->>User: Error: State Locked
    end
```

## Lock Information Structure

Every Terraform lock contains specific information:

```mermaid
classDiagram
    class LockInfo {
        +string ID
        +string Operation
        +string Who
        +string Version
        +string Created
        +string Path
    }
```

The lock info includes:

| Field | Description |
|-------|-------------|
| ID | Unique identifier for this lock |
| Operation | The Terraform operation (plan, apply, destroy) |
| Who | User and host information |
| Version | Terraform version |
| Created | Timestamp when lock was acquired |
| Path | State file path being locked |

## Building a Custom HTTP Backend with Locking

Terraform supports HTTP backends that can implement custom locking. Here is a complete implementation using Go:

### Backend Server Implementation

Create the main server that handles state storage and locking:

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "sync"
    "time"
)

type LockInfo struct {
    ID        string `json:"ID"`
    Operation string `json:"Operation"`
    Who       string `json:"Who"`
    Version   string `json:"Version"`
    Created   string `json:"Created"`
    Path      string `json:"Path"`
}

type StateStore struct {
    mu       sync.RWMutex
    state    []byte
    lockInfo *LockInfo
}

var store = &StateStore{}

func main() {
    http.HandleFunc("/state", handleState)
    http.HandleFunc("/lock", handleLock)
    http.HandleFunc("/unlock", handleUnlock)

    log.Println("Starting Terraform state server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleState(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        getState(w, r)
    case http.MethodPost:
        setState(w, r)
    case http.MethodDelete:
        deleteState(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}

func getState(w http.ResponseWriter, r *http.Request) {
    store.mu.RLock()
    defer store.mu.RUnlock()

    if store.state == nil {
        http.Error(w, "State not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(store.state)
}

func setState(w http.ResponseWriter, r *http.Request) {
    lockID := r.URL.Query().Get("ID")

    store.mu.Lock()
    defer store.mu.Unlock()

    // Verify lock ownership
    if store.lockInfo != nil && store.lockInfo.ID != lockID {
        w.WriteHeader(http.StatusLocked)
        json.NewEncoder(w).Encode(store.lockInfo)
        return
    }

    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    store.state = body
    w.WriteHeader(http.StatusOK)
}

func deleteState(w http.ResponseWriter, r *http.Request) {
    store.mu.Lock()
    defer store.mu.Unlock()

    store.state = nil
    w.WriteHeader(http.StatusOK)
}

func handleLock(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost && r.Method != http.MethodLock {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    store.mu.Lock()
    defer store.mu.Unlock()

    // Check if already locked
    if store.lockInfo != nil {
        w.WriteHeader(http.StatusLocked)
        json.NewEncoder(w).Encode(store.lockInfo)
        return
    }

    // Set the lock
    lockInfo.Created = time.Now().UTC().Format(time.RFC3339)
    store.lockInfo = &lockInfo

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(lockInfo)
}

func handleUnlock(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost && r.Method != http.MethodUnlock {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    store.mu.Lock()
    defer store.mu.Unlock()

    // Verify lock ownership before unlocking
    if store.lockInfo == nil {
        w.WriteHeader(http.StatusOK)
        return
    }

    if store.lockInfo.ID != lockInfo.ID {
        w.WriteHeader(http.StatusConflict)
        json.NewEncoder(w).Encode(store.lockInfo)
        return
    }

    store.lockInfo = nil
    w.WriteHeader(http.StatusOK)
}
```

### Terraform Configuration

Configure Terraform to use your custom backend:

```hcl
terraform {
  backend "http" {
    address        = "http://localhost:8080/state"
    lock_address   = "http://localhost:8080/lock"
    unlock_address = "http://localhost:8080/unlock"
    lock_method    = "POST"
    unlock_method  = "POST"
  }
}

resource "null_resource" "example" {
  triggers = {
    timestamp = timestamp()
  }
}
```

## Building a Redis-Based Lock Backend

For distributed systems, Redis provides a robust foundation for state locking. Here is an implementation using Redis:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "time"

    "github.com/redis/go-redis/v9"
)

type LockInfo struct {
    ID        string `json:"ID"`
    Operation string `json:"Operation"`
    Who       string `json:"Who"`
    Version   string `json:"Version"`
    Created   string `json:"Created"`
    Path      string `json:"Path"`
}

var (
    rdb *redis.Client
    ctx = context.Background()
)

const (
    stateKey     = "terraform:state"
    lockKey      = "terraform:lock"
    lockTTL      = 15 * time.Minute
)

func main() {
    rdb = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    http.HandleFunc("/state", handleState)
    http.HandleFunc("/lock", handleLock)
    http.HandleFunc("/unlock", handleUnlock)

    log.Println("Starting Terraform state server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleLock(w http.ResponseWriter, r *http.Request) {
    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    lockInfo.Created = time.Now().UTC().Format(time.RFC3339)
    lockData, _ := json.Marshal(lockInfo)

    // Try to acquire lock using SET NX (only if not exists)
    success, err := rdb.SetNX(ctx, lockKey, lockData, lockTTL).Result()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    if !success {
        // Lock exists, return current lock holder
        existingLock, _ := rdb.Get(ctx, lockKey).Bytes()
        w.WriteHeader(http.StatusLocked)
        w.Write(existingLock)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(lockInfo)
}

func handleUnlock(w http.ResponseWriter, r *http.Request) {
    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Use Lua script for atomic check-and-delete
    script := redis.NewScript(`
        local current = redis.call("GET", KEYS[1])
        if current == false then
            return 1
        end
        local lockData = cjson.decode(current)
        if lockData.ID == ARGV[1] then
            redis.call("DEL", KEYS[1])
            return 1
        end
        return 0
    `)

    result, err := script.Run(ctx, rdb, []string{lockKey}, lockInfo.ID).Int()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    if result == 0 {
        existingLock, _ := rdb.Get(ctx, lockKey).Bytes()
        w.WriteHeader(http.StatusConflict)
        w.Write(existingLock)
        return
    }

    w.WriteHeader(http.StatusOK)
}

func handleState(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        state, err := rdb.Get(ctx, stateKey).Bytes()
        if err == redis.Nil {
            http.Error(w, "State not found", http.StatusNotFound)
            return
        }
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        w.Write(state)

    case http.MethodPost:
        lockID := r.URL.Query().Get("ID")

        // Verify lock ownership
        existingLock, err := rdb.Get(ctx, lockKey).Bytes()
        if err == nil {
            var currentLock LockInfo
            json.Unmarshal(existingLock, &currentLock)
            if currentLock.ID != lockID {
                w.WriteHeader(http.StatusLocked)
                w.Write(existingLock)
                return
            }
        }

        body, _ := io.ReadAll(r.Body)
        if err := rdb.Set(ctx, stateKey, body, 0).Err(); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusOK)

    case http.MethodDelete:
        rdb.Del(ctx, stateKey)
        w.WriteHeader(http.StatusOK)
    }
}
```

## Building a PostgreSQL-Based Lock Backend

For organizations already using PostgreSQL, here is an implementation using advisory locks:

```go
package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "hash/fnv"
    "io"
    "log"
    "net/http"
    "time"

    _ "github.com/lib/pq"
)

type LockInfo struct {
    ID        string `json:"ID"`
    Operation string `json:"Operation"`
    Who       string `json:"Who"`
    Version   string `json:"Version"`
    Created   string `json:"Created"`
    Path      string `json:"Path"`
}

var db *sql.DB

func main() {
    var err error
    db, err = sql.Open("postgres", "postgres://user:pass@localhost/terraform?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }

    // Create tables
    createTables()

    http.HandleFunc("/state", handleState)
    http.HandleFunc("/lock", handleLock)
    http.HandleFunc("/unlock", handleUnlock)

    log.Println("Starting Terraform state server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func createTables() {
    _, err := db.Exec(`
        CREATE TABLE IF NOT EXISTS terraform_state (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            state JSONB,
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS terraform_locks (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            lock_info JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `)
    if err != nil {
        log.Fatal(err)
    }
}

func handleLock(w http.ResponseWriter, r *http.Request) {
    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    lockInfo.Created = time.Now().UTC().Format(time.RFC3339)
    lockData, _ := json.Marshal(lockInfo)

    // Try to insert lock record
    _, err := db.Exec(`
        INSERT INTO terraform_locks (name, lock_info)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
    `, "default", lockData)

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Check if our lock was the one that got inserted
    var existingLock []byte
    err = db.QueryRow(`
        SELECT lock_info FROM terraform_locks WHERE name = $1
    `, "default").Scan(&existingLock)

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    var currentLock LockInfo
    json.Unmarshal(existingLock, &currentLock)

    if currentLock.ID != lockInfo.ID {
        w.WriteHeader(http.StatusLocked)
        w.Write(existingLock)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(lockInfo)
}

func handleUnlock(w http.ResponseWriter, r *http.Request) {
    var lockInfo LockInfo
    if err := json.NewDecoder(r.Body).Decode(&lockInfo); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Delete only if lock ID matches
    result, err := db.Exec(`
        DELETE FROM terraform_locks
        WHERE name = $1
        AND lock_info->>'ID' = $2
    `, "default", lockInfo.ID)

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        // Lock exists but belongs to someone else
        var existingLock []byte
        db.QueryRow(`
            SELECT lock_info FROM terraform_locks WHERE name = $1
        `, "default").Scan(&existingLock)

        if existingLock != nil {
            w.WriteHeader(http.StatusConflict)
            w.Write(existingLock)
            return
        }
    }

    w.WriteHeader(http.StatusOK)
}

func handleState(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        var state []byte
        err := db.QueryRow(`
            SELECT state FROM terraform_state WHERE name = $1
        `, "default").Scan(&state)

        if err == sql.ErrNoRows {
            http.Error(w, "State not found", http.StatusNotFound)
            return
        }
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        w.Write(state)

    case http.MethodPost:
        body, _ := io.ReadAll(r.Body)

        _, err := db.Exec(`
            INSERT INTO terraform_state (name, state, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (name) DO UPDATE SET state = $2, updated_at = NOW()
        `, "default", body)

        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusOK)
    }
}
```

## Architecture Overview

Here is how a production-ready custom locking system fits together:

```mermaid
flowchart TB
    subgraph Clients
        TF1[Terraform Client 1]
        TF2[Terraform Client 2]
        TF3[Terraform Client N]
    end

    subgraph Load Balancer
        LB[HAProxy / nginx]
    end

    subgraph Lock Service Cluster
        LS1[Lock Service 1]
        LS2[Lock Service 2]
    end

    subgraph Storage Layer
        direction TB
        Redis[(Redis Cluster)]
        PG[(PostgreSQL)]
        S3[(S3 / Object Storage)]
    end

    TF1 --> LB
    TF2 --> LB
    TF3 --> LB

    LB --> LS1
    LB --> LS2

    LS1 --> Redis
    LS2 --> Redis
    LS1 --> PG
    LS2 --> PG
    LS1 --> S3
    LS2 --> S3
```

## Handling Lock Timeouts and Stale Locks

Stale locks occur when a Terraform process crashes without releasing its lock. Here is how to handle them:

```go
package main

import (
    "encoding/json"
    "time"
)

const maxLockAge = 30 * time.Minute

type LockManager struct {
    // ... existing fields
}

func (lm *LockManager) isLockStale(lockInfo *LockInfo) bool {
    created, err := time.Parse(time.RFC3339, lockInfo.Created)
    if err != nil {
        return false
    }

    return time.Since(created) > maxLockAge
}

func (lm *LockManager) acquireLockWithStaleCheck(newLock LockInfo) (*LockInfo, error) {
    lm.mu.Lock()
    defer lm.mu.Unlock()

    if lm.currentLock != nil {
        if lm.isLockStale(lm.currentLock) {
            // Log the stale lock for auditing
            log.Printf("Breaking stale lock: %+v", lm.currentLock)
            lm.currentLock = nil
        } else {
            return lm.currentLock, fmt.Errorf("lock held by another process")
        }
    }

    newLock.Created = time.Now().UTC().Format(time.RFC3339)
    lm.currentLock = &newLock
    return &newLock, nil
}

// Add an admin endpoint to force-unlock
func handleForceUnlock(w http.ResponseWriter, r *http.Request) {
    // Require authentication
    apiKey := r.Header.Get("X-API-Key")
    if !validateAdminKey(apiKey) {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    store.mu.Lock()
    defer store.mu.Unlock()

    if store.lockInfo != nil {
        log.Printf("Force unlocking: %+v", store.lockInfo)
        store.lockInfo = nil
    }

    w.WriteHeader(http.StatusOK)
}
```

## Testing Your Custom Backend

Create a test script to verify your implementation:

```bash
#!/bin/bash

# test_backend.sh

SERVER_URL="http://localhost:8080"

echo "=== Testing State Operations ==="

# Test state not found
echo "Testing GET state (should be 404)..."
curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/state"
echo ""

# Test state write
echo "Testing POST state..."
curl -s -X POST "$SERVER_URL/state" \
  -H "Content-Type: application/json" \
  -d '{"version": 4, "serial": 1}' \
  -w "%{http_code}"
echo ""

# Test state read
echo "Testing GET state..."
curl -s "$SERVER_URL/state"
echo ""

echo "=== Testing Lock Operations ==="

# Test acquiring lock
echo "Testing acquire lock..."
LOCK_RESPONSE=$(curl -s -X POST "$SERVER_URL/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "test-lock-123",
    "Operation": "apply",
    "Who": "test@localhost",
    "Version": "1.5.0",
    "Path": "terraform.tfstate"
  }')
echo "Lock response: $LOCK_RESPONSE"

# Test acquiring same lock again (should fail)
echo "Testing acquire lock again (should be 423)..."
curl -s -X POST "$SERVER_URL/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "different-lock-456",
    "Operation": "plan",
    "Who": "other@localhost",
    "Version": "1.5.0",
    "Path": "terraform.tfstate"
  }' \
  -w "\nHTTP Status: %{http_code}"
echo ""

# Test releasing lock
echo "Testing unlock..."
curl -s -X POST "$SERVER_URL/unlock" \
  -H "Content-Type: application/json" \
  -d '{"ID": "test-lock-123"}' \
  -w "HTTP Status: %{http_code}"
echo ""

echo "=== Tests Complete ==="
```

## Deploying to Production

### Kubernetes Deployment

Deploy your custom backend as a Kubernetes service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terraform-state-backend
  namespace: terraform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: terraform-state-backend
  template:
    metadata:
      labels:
        app: terraform-state-backend
    spec:
      containers:
        - name: backend
          image: myregistry/terraform-state-backend:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: terraform-backend-secrets
                  key: redis-url
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: terraform-state-backend
  namespace: terraform
spec:
  selector:
    app: terraform-state-backend
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### Terraform Configuration for Production

```hcl
terraform {
  backend "http" {
    address        = "https://terraform-backend.internal.company.com/state/myproject"
    lock_address   = "https://terraform-backend.internal.company.com/lock/myproject"
    unlock_address = "https://terraform-backend.internal.company.com/unlock/myproject"
    lock_method    = "POST"
    unlock_method  = "POST"

    # Authentication
    username = "terraform"
    password = var.backend_password

    # Retry configuration
    retry_max      = 4
    retry_wait_min = 1
    retry_wait_max = 30
  }
}
```

## Best Practices

1. **Always implement lock timeouts** - Prevent indefinite locks from crashed processes
2. **Use atomic operations** - Redis SETNX or database transactions ensure consistency
3. **Add comprehensive logging** - Track who locks what and when for debugging
4. **Implement health checks** - Monitor your backend availability
5. **Use TLS in production** - Encrypt state data in transit
6. **Add authentication** - Protect your state and lock endpoints
7. **Plan for high availability** - Use Redis Cluster or PostgreSQL replication
8. **Implement backup strategies** - State files are critical infrastructure

## Common Pitfalls to Avoid

| Pitfall | Solution |
|---------|----------|
| Race conditions on lock acquisition | Use atomic operations (SETNX, transactions) |
| Stale locks blocking all operations | Implement TTL and force-unlock capability |
| Lost state on backend failure | Use persistent storage with replication |
| Unauthorized access to state | Add authentication and authorization |
| Lock contention in CI/CD | Use separate state files per environment |

---

Custom state locking gives you full control over how Terraform coordinates concurrent access. Whether you use Redis for speed, PostgreSQL for durability, or a custom solution for specific requirements, the key is ensuring atomic lock operations and proper timeout handling. Start with a simple implementation, test thoroughly, and add features like stale lock detection as your needs grow.
