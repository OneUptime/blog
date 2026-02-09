# How to Implement Graceful Shutdown Handlers for Long-Running Kubernetes Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Graceful Shutdown, Lifecycle Management, Best Practices

Description: Implement graceful shutdown handlers that allow long-running processes to complete work cleanly before termination, preventing data loss and ensuring clean pod lifecycle management in Kubernetes.

---

When Kubernetes terminates a pod, it sends a SIGTERM signal and waits for the process to exit. Applications that ignore this signal or take too long to shut down face forceful termination via SIGKILL. This abrupt termination can corrupt data, lose in-flight work, and leave external systems in inconsistent states.

Graceful shutdown handlers respond to termination signals by stopping new work, completing ongoing operations, closing connections cleanly, and exiting within the grace period. This allows your applications to shut down cleanly during deployments, scaling operations, and node maintenance.

The key is designing shutdown handlers that balance completing important work with meeting Kubernetes termination deadlines. Work that cannot complete within the grace period needs to be persisted for resumption after restart.

## Understanding Kubernetes Termination Sequence

Kubernetes follows a specific sequence when terminating pods. Understanding this sequence helps you design effective shutdown handlers.

The termination process:

1. Pod is marked for deletion
2. PreStop hook executes (if configured)
3. SIGTERM signal sent to main container process
4. Grace period countdown begins (default 30 seconds)
5. After grace period expires, SIGKILL sent to remaining processes

Configure appropriate termination grace periods based on your application needs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-app
spec:
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: worker
        image: worker-app:v1.0.0
```

This gives the application 60 seconds to shut down gracefully before forced termination. Choose grace periods that match your longest normal operation duration plus cleanup time.

## Implementing Graceful Shutdown in Go

Go applications handle shutdown through context cancellation and signal handling. The pattern involves listening for termination signals, canceling contexts, and waiting for goroutines to complete.

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

type Application struct {
    server *http.Server
}

func (app *Application) Start() error {
    // Start HTTP server in goroutine
    go func() {
        if err := app.server.ListenAndServe(); err != http.ErrServerClosed {
            fmt.Printf("HTTP server error: %v\n", err)
        }
    }()

    // Wait for termination signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    fmt.Println("Received termination signal, starting graceful shutdown...")

    // Create shutdown context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Shutdown HTTP server gracefully
    if err := app.server.Shutdown(ctx); err != nil {
        return fmt.Errorf("server shutdown failed: %w", err)
    }

    fmt.Println("Server shut down successfully")
    return nil
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("healthy"))
    })

    app := &Application{
        server: &http.Server{
            Addr:    ":8080",
            Handler: mux,
        },
    }

    if err := app.Start(); err != nil {
        fmt.Printf("Application error: %v\n", err)
        os.Exit(1)
    }
}
```

For worker applications processing jobs:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

type Worker struct {
    jobs    chan Job
    wg      sync.WaitGroup
    ctx     context.Context
    cancel  context.CancelFunc
}

type Job struct {
    ID   string
    Data string
}

func NewWorker() *Worker {
    ctx, cancel := context.WithCancel(context.Background())
    return &Worker{
        jobs:   make(chan Job, 100),
        ctx:    ctx,
        cancel: cancel,
    }
}

func (w *Worker) Start(numWorkers int) {
    // Start worker goroutines
    for i := 0; i < numWorkers; i++ {
        w.wg.Add(1)
        go w.process()
    }

    // Wait for termination signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    fmt.Println("Shutting down workers...")

    // Stop accepting new jobs
    close(w.jobs)

    // Cancel context to signal workers
    w.cancel()

    // Wait for all workers to finish with timeout
    done := make(chan struct{})
    go func() {
        w.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        fmt.Println("All workers finished gracefully")
    case <-time.After(25 * time.Second):
        fmt.Println("Workers did not finish within grace period")
    }
}

func (w *Worker) process() {
    defer w.wg.Done()

    for {
        select {
        case job, ok := <-w.jobs:
            if !ok {
                // Channel closed, no more jobs
                return
            }
            w.handleJob(job)
        case <-w.ctx.Done():
            // Shutdown signal received
            return
        }
    }
}

func (w *Worker) handleJob(job Job) {
    fmt.Printf("Processing job %s\n", job.ID)
    time.Sleep(2 * time.Second) // Simulate work
    fmt.Printf("Completed job %s\n", job.ID)
}

func main() {
    worker := NewWorker()

    // Simulate adding jobs
    go func() {
        for i := 0; i < 10; i++ {
            worker.jobs <- Job{ID: fmt.Sprintf("job-%d", i)}
            time.Sleep(1 * time.Second)
        }
    }()

    worker.Start(3)
}
```

## Implementing Graceful Shutdown in Python

Python applications handle shutdown through signal handlers. Register handlers for SIGTERM and SIGINT to trigger cleanup.

```python
import signal
import sys
import time
from typing import Optional

class GracefulShutdown:
    def __init__(self):
        self.shutdown_requested = False
        self.shutdown_complete = False

    def request_shutdown(self, signum, frame):
        print(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True

    def is_shutdown_requested(self) -> bool:
        return self.shutdown_requested

def process_work(item: str, shutdown: GracefulShutdown) -> bool:
    """Process a work item, checking for shutdown periodically."""
    print(f"Processing {item}...")

    # Simulate work with periodic shutdown checks
    for i in range(10):
        if shutdown.is_shutdown_requested():
            print(f"Shutdown requested, abandoning work on {item}")
            return False
        time.sleep(0.5)

    print(f"Completed {item}")
    return True

def main():
    shutdown = GracefulShutdown()

    # Register signal handlers
    signal.signal(signal.SIGTERM, shutdown.request_shutdown)
    signal.signal(signal.SIGINT, shutdown.request_shutdown)

    # Simulate work queue
    work_items = [f"task-{i}" for i in range(20)]
    current_index = 0

    print("Worker started, processing items...")

    while current_index < len(work_items) and not shutdown.is_shutdown_requested():
        item = work_items[current_index]
        if process_work(item, shutdown):
            current_index += 1
        else:
            # Work interrupted, persist state
            print(f"Persisting checkpoint at item {current_index}")
            break

    print("Graceful shutdown complete")
    sys.exit(0)

if __name__ == "__main__":
    main()
```

For web applications using FastAPI:

```python
from fastapi import FastAPI
import uvicorn
import signal
import sys

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/data")
async def get_data():
    return {"data": "example"}

def shutdown_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

    # Run server with graceful shutdown
    config = uvicorn.Config(app, host="0.0.0.0", port=8080)
    server = uvicorn.Server(config)
    server.run()
```

## Using PreStop Hooks for Additional Cleanup

PreStop hooks execute before Kubernetes sends SIGTERM, providing additional time for cleanup operations like deregistering from service discovery or draining connections.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: api-service:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Wait for load balancer to remove pod from rotation
                sleep 15
                # Notify application to stop accepting new requests
                curl -X POST localhost:8080/shutdown
                # Allow existing requests to complete
                sleep 10
        ports:
        - containerPort: 8080
```

The preStop hook delays SIGTERM, giving load balancers time to remove the pod from rotation before the application begins shutdown. This prevents connection errors during rolling updates.

For applications requiring complex cleanup:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shutdown-script
data:
  shutdown.sh: |
    #!/bin/bash
    echo "PreStop hook executing..."

    # Deregister from external service discovery
    curl -X DELETE http://consul:8500/v1/agent/service/deregister/$(hostname)

    # Flush metrics to remote storage
    curl -X POST localhost:9090/api/v1/admin/tsdb/snapshot

    # Wait for in-flight requests to complete
    sleep 20

    echo "PreStop hook complete"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 90
      containers:
      - name: app
        image: app:latest
        lifecycle:
          preStop:
            exec:
              command: ["/scripts/shutdown.sh"]
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: shutdown-script
          defaultMode: 0755
```

## Handling Long-Running Operations

Some operations legitimately take longer than typical grace periods. For these cases, implement checkpoint and resume patterns rather than trying to complete everything during shutdown.

```go
type JobProcessor struct {
    checkpointFile string
}

func (jp *JobProcessor) ProcessWithCheckpointing(ctx context.Context, jobs []Job) error {
    // Load checkpoint if exists
    startIndex := jp.loadCheckpoint()

    for i := startIndex; i < len(jobs); i++ {
        select {
        case <-ctx.Done():
            // Shutdown requested, save checkpoint
            fmt.Printf("Saving checkpoint at job %d\n", i)
            jp.saveCheckpoint(i)
            return ctx.Err()
        default:
            if err := jp.processJob(jobs[i]); err != nil {
                return err
            }
            // Periodically save progress
            if i%10 == 0 {
                jp.saveCheckpoint(i + 1)
            }
        }
    }

    return nil
}

func (jp *JobProcessor) saveCheckpoint(index int) error {
    data := fmt.Sprintf("%d", index)
    return os.WriteFile(jp.checkpointFile, []byte(data), 0644)
}

func (jp *JobProcessor) loadCheckpoint() int {
    data, err := os.ReadFile(jp.checkpointFile)
    if err != nil {
        return 0
    }
    var index int
    fmt.Sscanf(string(data), "%d", &index)
    return index
}
```

This pattern allows work to resume after restart rather than losing progress when shutdown interrupts processing.

Graceful shutdown handlers are essential for production Kubernetes applications. By implementing proper signal handling, respecting termination grace periods, and using preStop hooks effectively, you ensure clean pod lifecycle management that prevents data loss and maintains system consistency during normal operations. The investment in proper shutdown handling pays dividends through improved reliability and reduced operational issues.
