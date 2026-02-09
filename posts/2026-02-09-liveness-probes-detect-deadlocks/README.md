# How to Use Liveness Probes to Detect Deadlocks in Application Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Deadlocks

Description: Configure liveness probes with heartbeat mechanisms to detect deadlocked application threads and goroutines, enabling automatic recovery from threading issues that leave processes alive but unresponsive.

---

Deadlocks occur when threads or goroutines wait indefinitely for resources held by each other. The process stays running but becomes completely unresponsive. Standard liveness probes checking HTTP endpoints won't catch this if the HTTP server runs in a separate thread. This guide shows you how to detect deadlocks using heartbeat-based liveness checks.

## Understanding Deadlock Detection

A deadlock causes application logic to freeze while the process continues running. To detect this, your liveness check must verify that critical application threads are making progress, not just that the process is alive.

The solution is a heartbeat mechanism where worker threads periodically update a timestamp, and the liveness probe verifies this timestamp is recent.

## Implementing Heartbeat-Based Liveness Checks

Create a heartbeat system in Go:

```go
package main

import (
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

type HeartbeatMonitor struct {
    mu            sync.RWMutex
    lastHeartbeat time.Time
    threshold     time.Duration
}

func NewHeartbeatMonitor(threshold time.Duration) *HeartbeatMonitor {
    return &HeartbeatMonitor{
        lastHeartbeat: time.Now(),
        threshold:     threshold,
    }
}

// Beat updates the heartbeat timestamp
func (hm *HeartbeatMonitor) Beat() {
    hm.mu.Lock()
    defer hm.mu.Unlock()
    hm.lastHeartbeat = time.Now()
}

// IsAlive checks if the last heartbeat is within threshold
func (hm *HeartbeatMonitor) IsAlive() bool {
    hm.mu.RLock()
    defer hm.mu.RUnlock()
    return time.Since(hm.lastHeartbeat) < hm.threshold
}

var heartbeat = NewHeartbeatMonitor(30 * time.Second)

func main() {
    // Start worker goroutines
    go worker1()
    go worker2()
    go criticalProcessor()

    // Health check endpoint
    http.HandleFunc("/healthz", livenessHandler)
    http.ListenAndServe(":8080", nil)
}

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    if heartbeat.IsAlive() {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Alive"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Deadlocked or stalled"))
    }
}

// Example worker that updates heartbeat
func criticalProcessor() {
    for {
        // Do critical work
        processMessage()

        // Update heartbeat to show we're alive
        heartbeat.Beat()

        time.Sleep(5 * time.Second)
    }
}
```

Configure the liveness probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-deadlock-detection
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3  # 30 seconds without heartbeat = restart
```

## Monitoring Multiple Critical Threads

Track heartbeats from multiple components:

```go
type ComponentHeartbeats struct {
    mu         sync.RWMutex
    components map[string]time.Time
    threshold  time.Duration
}

func NewComponentHeartbeats(threshold time.Duration) *ComponentHeartbeats {
    return &ComponentHeartbeats{
        components: make(map[string]time.Time),
        threshold:  threshold,
    }
}

func (ch *ComponentHeartbeats) Beat(component string) {
    ch.mu.Lock()
    defer ch.mu.Unlock()
    ch.components[component] = time.Now()
}

func (ch *ComponentHeartbeats) CheckAll() map[string]bool {
    ch.mu.RLock()
    defer ch.mu.RUnlock()

    status := make(map[string]bool)
    for component, lastBeat := range ch.components {
        status[component] = time.Since(lastBeat) < ch.threshold
    }
    return status
}

var heartbeats = NewComponentHeartbeats(60 * time.Second)

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    status := heartbeats.CheckAll()

    allAlive := true
    for _, alive := range status {
        if !alive {
            allAlive = false
            break
        }
    }

    w.Header().Set("Content-Type", "application/json")
    if allAlive {
        w.WriteHeader(http.StatusOK)
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
    }

    json.NewEncoder(w).Encode(map[string]interface{}{
        "alive":      allAlive,
        "components": status,
    })
}

// Critical components update heartbeats
func messageProcessor() {
    for {
        msg := receiveMessage()
        processMessage(msg)
        heartbeats.Beat("message_processor")
        time.Sleep(1 * time.Second)
    }
}

func databaseSync() {
    for {
        syncDatabase()
        heartbeats.Beat("database_sync")
        time.Sleep(30 * time.Second)
    }
}
```

## Python Implementation with Threading

Detect deadlocks in Python applications:

```python
import threading
import time
from flask import Flask, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)

class HeartbeatMonitor:
    def __init__(self, threshold_seconds=60):
        self.lock = threading.Lock()
        self.components = {}
        self.threshold = timedelta(seconds=threshold_seconds)

    def beat(self, component):
        with self.lock:
            self.components[component] = datetime.now()

    def is_alive(self, component):
        with self.lock:
            if component not in self.components:
                return False
            last_beat = self.components[component]
            return datetime.now() - last_beat < self.threshold

    def check_all(self):
        with self.lock:
            status = {}
            for component, last_beat in self.components.items():
                alive = datetime.now() - last_beat < self.threshold
                status[component] = {
                    'alive': alive,
                    'last_heartbeat': last_beat.isoformat(),
                    'seconds_since': (datetime.now() - last_beat).total_seconds()
                }
            return status

heartbeat = HeartbeatMonitor(threshold_seconds=60)

def message_processor():
    """Critical worker thread"""
    while True:
        try:
            # Process messages
            process_messages()

            # Update heartbeat
            heartbeat.beat('message_processor')

            time.sleep(5)
        except Exception as e:
            print(f"Error in message processor: {e}")
            time.sleep(1)

def database_sync():
    """Another critical thread"""
    while True:
        try:
            sync_database()
            heartbeat.beat('database_sync')
            time.sleep(30)
        except Exception as e:
            print(f"Error in database sync: {e}")
            time.sleep(5)

@app.route('/healthz')
def liveness():
    status = heartbeat.check_all()

    all_alive = all(comp['alive'] for comp in status.values())

    if all_alive and len(status) > 0:
        return jsonify({'status': 'alive', 'components': status}), 200
    else:
        return jsonify({'status': 'deadlocked', 'components': status}), 503

# Start worker threads
threading.Thread(target=message_processor, daemon=True).start()
threading.Thread(target=database_sync, daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Detecting Lock Contention

Monitor for excessive lock wait times:

```go
type LockMonitor struct {
    mu              sync.RWMutex
    lockAcquisitions map[string]time.Duration
    threshold       time.Duration
}

func (lm *LockMonitor) RecordLockWait(lockName string, waitTime time.Duration) {
    lm.mu.Lock()
    defer lm.mu.Unlock()
    lm.lockAcquisitions[lockName] = waitTime
}

func (lm *LockMonitor) CheckLockHealth() bool {
    lm.mu.RLock()
    defer lm.mu.RUnlock()

    for _, waitTime := range lm.lockAcquisitions {
        if waitTime > lm.threshold {
            return false  // Lock contention detected
        }
    }
    return true
}

// Instrumented lock acquisition
func acquireLockWithMonitoring(lock *sync.Mutex, lockName string) {
    start := time.Now()
    lock.Lock()
    waitTime := time.Since(start)

    lockMonitor.RecordLockWait(lockName, waitTime)
}
```

## Simulating Deadlock for Testing

Create test endpoints to trigger deadlocks:

```go
var (
    lock1 sync.Mutex
    lock2 sync.Mutex
)

// Test endpoint to trigger deadlock
func triggerDeadlockHandler(w http.ResponseWriter, r *http.Request) {
    go func() {
        lock1.Lock()
        time.Sleep(100 * time.Millisecond)
        lock2.Lock()  // Will deadlock
        lock2.Unlock()
        lock1.Unlock()
    }()

    go func() {
        lock2.Lock()
        time.Sleep(100 * time.Millisecond)
        lock1.Lock()  // Will deadlock
        lock1.Unlock()
        lock2.Unlock()
    }()

    w.Write([]byte("Deadlock triggered"))
}
```

Test deadlock detection:

```bash
# Trigger deadlock
curl http://localhost:8080/test/deadlock

# Check if liveness probe detects it
sleep 60
curl http://localhost:8080/healthz
# Should return 503
```

## Monitoring Goroutine Count

Detect goroutine leaks that might lead to deadlocks:

```go
func checkGoroutineHealth() CheckResult {
    numGoroutines := runtime.NumGoroutine()

    status := "healthy"
    message := ""

    if numGoroutines > 10000 {
        status = "unhealthy"
        message = "Goroutine leak detected"
    } else if numGoroutines > 5000 {
        status = "degraded"
        message = "High goroutine count"
    }

    return CheckResult{
        Status:  status,
        Message: message,
        Details: map[string]interface{}{
            "goroutines": numGoroutines,
        },
    }
}
```

## Deadlock Detection with Timeouts

Use timeouts to detect stuck operations:

```go
func processWithTimeout(data []byte) error {
    done := make(chan error, 1)

    go func() {
        done <- processData(data)
    }()

    select {
    case err := <-done:
        heartbeat.Beat("processor")
        return err
    case <-time.After(30 * time.Second):
        // Operation timed out, likely deadlocked
        return fmt.Errorf("operation timed out, possible deadlock")
    }
}
```

## Best Practices

Follow these guidelines:

```yaml
# DO: Set heartbeat threshold > than normal operation time
# If processing takes 10s max, use 30s threshold

# DO: Update heartbeat in critical loops
for msg := range messages {
    process(msg)
    heartbeat.Beat("processor")  # Beat after each message
}

# DON'T: Update heartbeat before work
# BAD
heartbeat.Beat()
doWork()  # If this deadlocks, beat already happened

# GOOD
doWork()
heartbeat.Beat()  # Beat after work completes

# DO: Monitor multiple critical components
heartbeats.Beat("worker1")
heartbeats.Beat("worker2")
heartbeats.Beat("scheduler")

# DON'T: Share heartbeat with non-critical threads
# Only beat from threads that must stay alive
```

## Conclusion

Heartbeat-based liveness probes detect deadlocks and stalled application logic that simple HTTP checks miss. By having critical threads update timestamps regularly and checking these in your liveness endpoint, Kubernetes can automatically restart containers stuck in deadlocks, maintaining application availability even when threading issues occur.
