# How to Implement Startup Probes with Extended Timeout for Database Initialization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Database

Description: Configure startup probes with appropriate timeouts for applications that run database migrations or initialization scripts at startup, preventing premature container restarts.

---

Applications that run database migrations, schema updates, or data loading at startup need extended initialization time. Startup probes protect these applications from being killed during legitimate startup activities.

## Why Database Initialization Needs Startup Probes

Database migrations can take minutes to complete. Setting a long `initialDelaySeconds` on liveness probes delays detection of real startup failures. Startup probes solve this by allowing long initialization while maintaining aggressive liveness checking after startup completes.

## Basic Configuration for Migration Scripts

Allow time for database migrations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-with-migrations
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api-server:latest
        env:
        - name: RUN_MIGRATIONS
          value: "true"
        ports:
        - containerPort: 8080

        # Allow up to 10 minutes for migrations
        startupProbe:
          httpGet:
            path: /startup
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 60  # 10 minutes total

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 10
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 2
```

## Implementing Startup Tracking Endpoints

Track migration progress:

```go
package main

import (
    "encoding/json"
    "net/http"
    "sync/atomic"
    "time"
)

var (
    startupComplete int32 = 0
    migrationPhase  int32 = 0
)

const (
    PhaseConnecting = iota
    PhaseMigrating
    PhaseSeeding
    PhaseComplete
)

func main() {
    // Run migrations in background
    go runStartupTasks()

    http.HandleFunc("/startup", startupHandler)
    http.HandleFunc("/healthz", healthHandler)
    http.HandleFunc("/ready", readyHandler)

    http.ListenAndServe(":8080", nil)
}

func startupHandler(w http.ResponseWriter, r *http.Request) {
    complete := atomic.LoadInt32(&startupComplete)
    phase := atomic.LoadInt32(&migrationPhase)

    if complete == 1 {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "status": "complete",
            "phase":  "ready",
        })
        return
    }

    // Return 200 during startup to show progress
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status": "initializing",
        "phase":  phaseName(phase),
    })
}

func runStartupTasks() {
    atomic.StoreInt32(&migrationPhase, PhaseConnecting)
    connectToDatabase()

    atomic.StoreInt32(&migrationPhase, PhaseMigrating)
    runMigrations()

    atomic.StoreInt32(&migrationPhase, PhaseSeeding)
    seedData()

    atomic.StoreInt32(&migrationPhase, PhaseComplete)
    atomic.StoreInt32(&startupComplete, 1)
}

func phaseName(phase int32) string {
    switch phase {
    case PhaseConnecting:
        return "connecting"
    case PhaseMigrating:
        return "running_migrations"
    case PhaseSeeding:
        return "seeding_data"
    case PhaseComplete:
        return "complete"
    default:
        return "unknown"
    }
}
```

## Using Init Containers for Migrations

Run migrations in init containers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      initContainers:
      # Run migrations before main container starts
      - name: migrations
        image: api-server:latest
        command:
        - /app/migrate
        - up
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url

      containers:
      - name: api
        image: api-server:latest
        ports:
        - containerPort: 8080

        # Shorter startup time since migrations already ran
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 5
          failureThreshold: 12  # 1 minute

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 10
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 2
```

## Handling Migration Failures

Detect and report migration errors:

```python
import sys
import time
from flask import Flask, jsonify

app = Flask(__name__)

migration_status = {
    'complete': False,
    'phase': 'starting',
    'error': None
}

def run_migrations():
    global migration_status

    try:
        migration_status['phase'] = 'connecting'
        connect_to_database()

        migration_status['phase'] = 'running_migrations'
        apply_migrations()

        migration_status['phase'] = 'creating_indexes'
        create_indexes()

        migration_status['phase'] = 'complete'
        migration_status['complete'] = True

    except Exception as e:
        migration_status['phase'] = 'failed'
        migration_status['error'] = str(e)
        # Exit with error code so container restarts
        sys.exit(1)

@app.route('/startup')
def startup():
    if migration_status['complete']:
        return jsonify({
            'status': 'ready',
            'phase': 'complete'
        }), 200

    if migration_status['error']:
        return jsonify({
            'status': 'failed',
            'phase': migration_status['phase'],
            'error': migration_status['error']
        }), 503

    # Still initializing
    return jsonify({
        'status': 'initializing',
        'phase': migration_status['phase']
    }), 200

if __name__ == '__main__':
    import threading
    threading.Thread(target=run_migrations, daemon=True).start()
    app.run(host='0.0.0.0', port=8080)
```

## Best Practices

```yaml
# DO: Use init containers for migrations when possible
initContainers:
- name: migrations
  image: app:latest
  command: ["/app/migrate"]

# DO: Set realistic startup timeouts
startupProbe:
  periodSeconds: 15
  failureThreshold: 40  # 10 minutes for large migrations

# DON'T: Run migrations in every pod
# Use init containers or dedicated migration jobs

# DO: Track migration progress
# Return detailed status from startup endpoint

# DON'T: Use same timeout for dev and prod
# Production databases are larger
```

## Conclusion

Startup probes with appropriate timeouts protect applications that run database migrations from premature restarts. Use init containers when possible, track migration progress in startup endpoints, handle failures gracefully, and set realistic timeouts based on actual migration duration in production.
