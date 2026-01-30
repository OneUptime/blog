# How to Implement Kubernetes Leader Election

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Distributed Systems, High Availability, Go

Description: Implement leader election in Kubernetes using lease objects for single-leader workloads, controllers, and scheduled tasks in high-availability deployments.

---

## Why Leader Election Matters

When you deploy multiple replicas of an application in Kubernetes, you often face a coordination problem. Some workloads require exactly one instance to perform a specific task at any given time. Consider these scenarios:

- A scheduler that dispatches jobs to workers
- A controller that reconciles cluster state
- A cron-like service that runs periodic tasks
- A cache warmer that pre-populates data

Running these tasks on multiple replicas simultaneously leads to duplicate work, race conditions, or corrupted state. Leader election solves this by ensuring only one replica (the leader) performs the work while others remain on standby.

### Active-Passive vs Active-Active

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Active-Passive | One leader performs work, others wait | Schedulers, controllers, singleton tasks |
| Active-Active | All replicas share the workload | Stateless web servers, workers with external queues |

Leader election implements the active-passive pattern. The leader handles all responsibilities until it fails or loses connectivity, at which point a standby replica takes over.

## Understanding Kubernetes Lease Objects

Kubernetes provides a native resource called `Lease` specifically designed for distributed coordination. Leases live in the `coordination.k8s.io/v1` API group and offer several advantages over older approaches like ConfigMap or Endpoint-based locks.

### Lease vs ConfigMap-Based Locks

| Feature | Lease | ConfigMap |
|---------|-------|-----------|
| Purpose-built | Yes | No (repurposed) |
| API overhead | Lower | Higher |
| Garbage collection | Built-in | Manual |
| Semantic clarity | Clear | Confusing |
| RBAC scoping | Narrow | Broad |

Here is what a Lease object looks like:

```yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  name: my-app-leader
  namespace: default
spec:
  holderIdentity: pod-abc-12345
  leaseDurationSeconds: 15
  acquireTime: "2026-01-30T10:00:00Z"
  renewTime: "2026-01-30T10:00:10Z"
  leaseTransitions: 3
```

The key fields are:

- **holderIdentity**: The current leader's unique identifier (typically pod name)
- **leaseDurationSeconds**: How long the lease is valid without renewal
- **acquireTime**: When the current holder first acquired the lease
- **renewTime**: When the holder last renewed the lease
- **leaseTransitions**: Counter tracking leadership changes

## Setting Up the Project

Let's build a complete leader election example. First, initialize a Go module:

```bash
mkdir leader-election-demo
cd leader-election-demo
go mod init leader-election-demo
go get k8s.io/client-go@latest
go get k8s.io/apimachinery@latest
```

Your `go.mod` should include these dependencies:

```go
module leader-election-demo

go 1.21

require (
    k8s.io/apimachinery v0.29.0
    k8s.io/client-go v0.29.0
)
```

## Basic Leader Election Implementation

The `client-go` library provides the `leaderelection` package with everything needed for robust leader election. Here is a minimal working example:

```go
package main

import (
    "context"
    "flag"
    "os"
    "os/signal"
    "syscall"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/tools/leaderelection"
    "k8s.io/client-go/tools/leaderelection/resourcelock"
    "k8s.io/klog/v2"
)

func main() {
    // Parse command line flags for configuration
    var kubeconfig string
    var leaseName string
    var leaseNamespace string
    var identity string

    flag.StringVar(&kubeconfig, "kubeconfig", "", "path to kubeconfig file")
    flag.StringVar(&leaseName, "lease-name", "my-app-leader", "name of the lease object")
    flag.StringVar(&leaseNamespace, "lease-namespace", "default", "namespace for the lease")
    flag.StringVar(&identity, "identity", "", "unique identity for this candidate")
    flag.Parse()

    // Generate identity from hostname if not provided
    if identity == "" {
        hostname, err := os.Hostname()
        if err != nil {
            klog.Fatalf("failed to get hostname: %v", err)
        }
        identity = hostname
    }

    klog.Infof("Starting leader election with identity: %s", identity)

    // Build Kubernetes client configuration
    config, err := buildConfig(kubeconfig)
    if err != nil {
        klog.Fatalf("failed to build config: %v", err)
    }

    // Create the Kubernetes clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        klog.Fatalf("failed to create clientset: %v", err)
    }

    // Set up context with cancellation for graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle termination signals
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-sigCh
        klog.Info("Received termination signal, shutting down")
        cancel()
    }()

    // Run the leader election loop
    runLeaderElection(ctx, clientset, leaseName, leaseNamespace, identity)
}

// buildConfig creates a Kubernetes client config from kubeconfig or in-cluster
func buildConfig(kubeconfig string) (*rest.Config, error) {
    if kubeconfig != "" {
        return clientcmd.BuildConfigFromFlags("", kubeconfig)
    }
    return rest.InClusterConfig()
}
```

## Configuring the Leader Election Loop

The leader election loop requires careful tuning of timing parameters. Here is the core configuration:

```go
// runLeaderElection starts the leader election process
func runLeaderElection(
    ctx context.Context,
    clientset *kubernetes.Clientset,
    leaseName, leaseNamespace, identity string,
) {
    // Create the lease lock using the Lease resource type
    // This is the recommended lock type for Kubernetes 1.14+
    lock := &resourcelock.LeaseLock{
        LeaseMeta: metav1.ObjectMeta{
            Name:      leaseName,
            Namespace: leaseNamespace,
        },
        Client: clientset.CoordinationV1(),
        LockConfig: resourcelock.ResourceLockConfig{
            Identity: identity,
        },
    }

    // Configure leader election parameters
    // These values balance responsiveness with stability
    leaderConfig := leaderelection.LeaderElectionConfig{
        Lock:            lock,
        ReleaseOnCancel: true,  // Release leadership when context is cancelled
        LeaseDuration:   15 * time.Second,  // How long a lease is valid
        RenewDeadline:   10 * time.Second,  // How long to try renewing before giving up
        RetryPeriod:     2 * time.Second,   // How often to retry acquiring the lease
        Callbacks: leaderelection.LeaderCallbacks{
            OnStartedLeading: onStartedLeading,
            OnStoppedLeading: onStoppedLeading,
            OnNewLeader:      onNewLeader,
        },
    }

    // Start the leader election loop
    // This function blocks until the context is cancelled
    leaderelection.RunOrDie(ctx, leaderConfig)
}
```

### Understanding Timing Parameters

The timing parameters require careful consideration:

| Parameter | Recommended Value | Description |
|-----------|------------------|-------------|
| LeaseDuration | 15s | Maximum time a lease remains valid without renewal |
| RenewDeadline | 10s | Time leader spends trying to renew before stepping down |
| RetryPeriod | 2s | Interval between acquisition attempts |

The relationship between these values matters:

- `LeaseDuration` must be greater than `RenewDeadline`
- `RenewDeadline` must be greater than `RetryPeriod`
- Shorter durations mean faster failover but more API server load
- Longer durations reduce load but increase failover time

## Implementing Leader Callbacks

The callbacks define what happens during leadership transitions. This is where your application logic lives:

```go
// onStartedLeading is called when this instance becomes the leader
// The context passed here is cancelled when leadership is lost
func onStartedLeading(ctx context.Context) {
    klog.Info("Acquired leadership, starting work")

    // Start your leader-specific work here
    // This runs until the context is cancelled (leadership lost)
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            klog.Info("Leadership lost, stopping work")
            return
        case <-ticker.C:
            performLeaderWork()
        }
    }
}

// onStoppedLeading is called when this instance loses leadership
// This is useful for cleanup that must happen after OnStartedLeading returns
func onStoppedLeading() {
    klog.Info("Lost leadership, performing cleanup")
    // Perform any necessary cleanup
    // Note: OnStartedLeading has already returned at this point
}

// onNewLeader is called when a new leader is elected
// This is called on ALL instances, including the new leader
func onNewLeader(identity string) {
    klog.Infof("New leader elected: %s", identity)
}

// performLeaderWork contains the actual work the leader should do
func performLeaderWork() {
    klog.Info("Performing leader work...")
    // Your business logic here:
    // - Process queued jobs
    // - Reconcile state
    // - Run scheduled tasks
}
```

## Production-Ready Implementation

Here is a more complete implementation suitable for production use:

```go
package main

import (
    "context"
    "flag"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/tools/leaderelection"
    "k8s.io/client-go/tools/leaderelection/resourcelock"
    "k8s.io/klog/v2"
)

// LeaderElector wraps the leader election logic with additional features
type LeaderElector struct {
    clientset      *kubernetes.Clientset
    leaseName      string
    leaseNamespace string
    identity       string
    isLeader       bool
    mu             sync.RWMutex
    onStart        func(context.Context)
    onStop         func()
}

// NewLeaderElector creates a new LeaderElector instance
func NewLeaderElector(
    clientset *kubernetes.Clientset,
    leaseName, leaseNamespace, identity string,
    onStart func(context.Context),
    onStop func(),
) *LeaderElector {
    return &LeaderElector{
        clientset:      clientset,
        leaseName:      leaseName,
        leaseNamespace: leaseNamespace,
        identity:       identity,
        onStart:        onStart,
        onStop:         onStop,
    }
}

// IsLeader returns whether this instance is currently the leader
func (le *LeaderElector) IsLeader() bool {
    le.mu.RLock()
    defer le.mu.RUnlock()
    return le.isLeader
}

// setLeader updates the leadership status thread-safely
func (le *LeaderElector) setLeader(isLeader bool) {
    le.mu.Lock()
    defer le.mu.Unlock()
    le.isLeader = isLeader
}

// Run starts the leader election process
func (le *LeaderElector) Run(ctx context.Context) error {
    lock := &resourcelock.LeaseLock{
        LeaseMeta: metav1.ObjectMeta{
            Name:      le.leaseName,
            Namespace: le.leaseNamespace,
        },
        Client: le.clientset.CoordinationV1(),
        LockConfig: resourcelock.ResourceLockConfig{
            Identity: le.identity,
        },
    }

    config := leaderelection.LeaderElectionConfig{
        Lock:            lock,
        ReleaseOnCancel: true,
        LeaseDuration:   15 * time.Second,
        RenewDeadline:   10 * time.Second,
        RetryPeriod:     2 * time.Second,
        Callbacks: leaderelection.LeaderCallbacks{
            OnStartedLeading: func(ctx context.Context) {
                le.setLeader(true)
                klog.Info("Became leader")
                if le.onStart != nil {
                    le.onStart(ctx)
                }
            },
            OnStoppedLeading: func() {
                le.setLeader(false)
                klog.Info("Lost leadership")
                if le.onStop != nil {
                    le.onStop()
                }
            },
            OnNewLeader: func(identity string) {
                if identity == le.identity {
                    return
                }
                klog.Infof("New leader: %s", identity)
            },
        },
    }

    leaderelection.RunOrDie(ctx, config)
    return nil
}
```

## Adding Health Check Endpoints

Production deployments need health endpoints for Kubernetes probes. Here is how to add them:

```go
// HealthServer provides HTTP endpoints for health checks
type HealthServer struct {
    leaderElector *LeaderElector
    server        *http.Server
}

// NewHealthServer creates a health server bound to the given address
func NewHealthServer(addr string, le *LeaderElector) *HealthServer {
    mux := http.NewServeMux()
    hs := &HealthServer{
        leaderElector: le,
        server: &http.Server{
            Addr:    addr,
            Handler: mux,
        },
    }

    // Liveness probe - always returns OK if the process is running
    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("ok"))
    })

    // Readiness probe - returns OK only if this instance is the leader
    mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
        if hs.leaderElector.IsLeader() {
            w.WriteHeader(http.StatusOK)
            w.Write([]byte("leader"))
        } else {
            w.WriteHeader(http.StatusServiceUnavailable)
            w.Write([]byte("not leader"))
        }
    })

    // Leader check endpoint - returns leadership status as JSON
    mux.HandleFunc("/leader", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        isLeader := hs.leaderElector.IsLeader()
        fmt.Fprintf(w, `{"isLeader":%t,"identity":"%s"}`,
            isLeader, hs.leaderElector.identity)
    })

    return hs
}

// Start begins serving health check endpoints
func (hs *HealthServer) Start() error {
    klog.Infof("Starting health server on %s", hs.server.Addr)
    return hs.server.ListenAndServe()
}

// Shutdown gracefully stops the health server
func (hs *HealthServer) Shutdown(ctx context.Context) error {
    return hs.server.Shutdown(ctx)
}
```

## Kubernetes Deployment Configuration

Deploy your leader election-enabled application with proper RBAC and pod configuration:

```yaml
# rbac.yaml
# Create a ServiceAccount for the application
apiVersion: v1
kind: ServiceAccount
metadata:
  name: leader-election-demo
  namespace: default
---
# Role granting permissions to manage Lease objects
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-election-role
  namespace: default
rules:
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["get", "create", "update"]
---
# Bind the role to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leader-election-rolebinding
  namespace: default
subjects:
- kind: ServiceAccount
  name: leader-election-demo
  namespace: default
roleRef:
  kind: Role
  name: leader-election-role
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: leader-election-demo
  namespace: default
spec:
  replicas: 3  # Multiple replicas for high availability
  selector:
    matchLabels:
      app: leader-election-demo
  template:
    metadata:
      labels:
        app: leader-election-demo
    spec:
      serviceAccountName: leader-election-demo
      containers:
      - name: app
        image: leader-election-demo:latest
        args:
        - --lease-name=my-app-leader
        - --lease-namespace=default
        ports:
        - containerPort: 8080
          name: health
        # Liveness probe ensures the container is restarted if unresponsive
        livenessProbe:
          httpGet:
            path: /healthz
            port: health
          initialDelaySeconds: 5
          periodSeconds: 10
        # Readiness probe removes non-leaders from service endpoints
        readinessProbe:
          httpGet:
            path: /readyz
            port: health
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        # Use the pod name as the unique identity
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Graceful Leader Transitions

Proper shutdown handling prevents work from being interrupted or duplicated:

```go
// WorkerManager handles starting and stopping worker goroutines
type WorkerManager struct {
    wg     sync.WaitGroup
    ctx    context.Context
    cancel context.CancelFunc
}

// NewWorkerManager creates a manager for leader work
func NewWorkerManager() *WorkerManager {
    return &WorkerManager{}
}

// Start begins all worker goroutines
func (wm *WorkerManager) Start(parentCtx context.Context) {
    wm.ctx, wm.cancel = context.WithCancel(parentCtx)

    // Start multiple workers that perform leader responsibilities
    wm.wg.Add(3)
    go wm.runScheduler()
    go wm.runReconciler()
    go wm.runMetricsCollector()
}

// Stop gracefully shuts down all workers
func (wm *WorkerManager) Stop() {
    klog.Info("Stopping all workers...")
    wm.cancel()

    // Wait for all workers to finish with a timeout
    done := make(chan struct{})
    go func() {
        wm.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        klog.Info("All workers stopped gracefully")
    case <-time.After(30 * time.Second):
        klog.Warning("Timeout waiting for workers to stop")
    }
}

// runScheduler dispatches jobs to workers
func (wm *WorkerManager) runScheduler() {
    defer wm.wg.Done()
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-wm.ctx.Done():
            klog.Info("Scheduler shutting down")
            return
        case <-ticker.C:
            wm.dispatchJobs()
        }
    }
}

// runReconciler ensures desired state matches actual state
func (wm *WorkerManager) runReconciler() {
    defer wm.wg.Done()
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-wm.ctx.Done():
            klog.Info("Reconciler shutting down")
            return
        case <-ticker.C:
            wm.reconcileState()
        }
    }
}

// runMetricsCollector gathers and reports metrics
func (wm *WorkerManager) runMetricsCollector() {
    defer wm.wg.Done()
    ticker := time.NewTicker(60 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-wm.ctx.Done():
            klog.Info("Metrics collector shutting down")
            return
        case <-ticker.C:
            wm.collectMetrics()
        }
    }
}

func (wm *WorkerManager) dispatchJobs() {
    klog.Info("Dispatching jobs...")
}

func (wm *WorkerManager) reconcileState() {
    klog.Info("Reconciling state...")
}

func (wm *WorkerManager) collectMetrics() {
    klog.Info("Collecting metrics...")
}
```

## Complete Main Function

Here is how everything ties together:

```go
func main() {
    klog.InitFlags(nil)
    flag.Parse()

    // Build configuration
    config, err := rest.InClusterConfig()
    if err != nil {
        klog.Fatalf("Failed to get in-cluster config: %v", err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        klog.Fatalf("Failed to create clientset: %v", err)
    }

    // Get pod identity from environment
    identity := os.Getenv("POD_NAME")
    if identity == "" {
        hostname, _ := os.Hostname()
        identity = hostname
    }

    // Create worker manager for leader tasks
    workerManager := NewWorkerManager()

    // Create leader elector with callbacks
    leaderElector := NewLeaderElector(
        clientset,
        "my-app-leader",
        "default",
        identity,
        func(ctx context.Context) {
            workerManager.Start(ctx)
        },
        func() {
            workerManager.Stop()
        },
    )

    // Create and start health server
    healthServer := NewHealthServer(":8080", leaderElector)
    go func() {
        if err := healthServer.Start(); err != http.ErrServerClosed {
            klog.Errorf("Health server error: %v", err)
        }
    }()

    // Set up graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        sig := <-sigCh
        klog.Infof("Received signal %v, initiating shutdown", sig)
        cancel()

        // Give the leader election loop time to release the lease
        shutdownCtx, shutdownCancel := context.WithTimeout(
            context.Background(), 10*time.Second)
        defer shutdownCancel()
        healthServer.Shutdown(shutdownCtx)
    }()

    // Run leader election (blocks until context cancelled)
    leaderElector.Run(ctx)
    klog.Info("Shutdown complete")
}
```

## Testing Leader Failover

Testing leader election requires simulating failures. Here are several approaches:

### Manual Testing with kubectl

```bash
# Watch lease changes in real-time
kubectl get lease my-app-leader -w

# Check current leader
kubectl get lease my-app-leader -o jsonpath='{.spec.holderIdentity}'

# Force failover by deleting the leader pod
kubectl delete pod $(kubectl get lease my-app-leader \
    -o jsonpath='{.spec.holderIdentity}')

# Observe new leader election
kubectl get lease my-app-leader -o yaml
```

### Automated Integration Test

```go
package main

import (
    "context"
    "testing"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes/fake"
)

func TestLeaderElection(t *testing.T) {
    // Create a fake clientset for testing
    clientset := fake.NewSimpleClientset()

    // Track leadership changes
    leadershipAcquired := make(chan string, 10)
    leadershipLost := make(chan string, 10)

    // Start first candidate
    ctx1, cancel1 := context.WithCancel(context.Background())
    le1 := NewLeaderElector(
        clientset,
        "test-leader",
        "default",
        "candidate-1",
        func(ctx context.Context) {
            leadershipAcquired <- "candidate-1"
        },
        func() {
            leadershipLost <- "candidate-1"
        },
    )

    go le1.Run(ctx1)

    // Wait for first candidate to become leader
    select {
    case leader := <-leadershipAcquired:
        if leader != "candidate-1" {
            t.Errorf("Expected candidate-1 to become leader, got %s", leader)
        }
    case <-time.After(10 * time.Second):
        t.Fatal("Timeout waiting for leader election")
    }

    // Start second candidate
    ctx2, cancel2 := context.WithCancel(context.Background())
    le2 := NewLeaderElector(
        clientset,
        "test-leader",
        "default",
        "candidate-2",
        func(ctx context.Context) {
            leadershipAcquired <- "candidate-2"
        },
        func() {
            leadershipLost <- "candidate-2"
        },
    )

    go le2.Run(ctx2)

    // Simulate leader failure
    cancel1()

    // Wait for leadership transfer
    select {
    case <-leadershipLost:
        // Expected: candidate-1 loses leadership
    case <-time.After(5 * time.Second):
        t.Fatal("Timeout waiting for leadership loss")
    }

    select {
    case leader := <-leadershipAcquired:
        if leader != "candidate-2" {
            t.Errorf("Expected candidate-2 to become leader, got %s", leader)
        }
    case <-time.After(20 * time.Second):
        t.Fatal("Timeout waiting for new leader")
    }

    cancel2()
}
```

### Chaos Testing Script

```bash
#!/bin/bash
# chaos-test.sh - Test leader election resilience

NAMESPACE="default"
LEASE_NAME="my-app-leader"
DEPLOYMENT="leader-election-demo"

echo "Starting chaos test for leader election"

for i in {1..10}; do
    echo "=== Iteration $i ==="

    # Get current leader
    LEADER=$(kubectl get lease $LEASE_NAME -n $NAMESPACE \
        -o jsonpath='{.spec.holderIdentity}')
    echo "Current leader: $LEADER"

    # Kill the leader pod
    echo "Killing leader pod..."
    kubectl delete pod $LEADER -n $NAMESPACE --grace-period=0

    # Wait for new leader
    sleep 5

    # Verify new leader elected
    NEW_LEADER=$(kubectl get lease $LEASE_NAME -n $NAMESPACE \
        -o jsonpath='{.spec.holderIdentity}')
    echo "New leader: $NEW_LEADER"

    if [ "$LEADER" == "$NEW_LEADER" ]; then
        echo "WARNING: Leader did not change"
    fi

    # Check lease transitions counter
    TRANSITIONS=$(kubectl get lease $LEASE_NAME -n $NAMESPACE \
        -o jsonpath='{.spec.leaseTransitions}')
    echo "Total transitions: $TRANSITIONS"

    # Allow system to stabilize
    sleep 10
done

echo "Chaos test complete"
```

## Monitoring and Observability

Add metrics to track leader election health:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Track leadership state changes
    leadershipGauge = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "leader_election_is_leader",
        Help: "1 if this instance is the leader, 0 otherwise",
    })

    // Count leadership transitions
    leadershipTransitions = promauto.NewCounter(prometheus.CounterOpts{
        Name: "leader_election_transitions_total",
        Help: "Total number of leadership transitions observed",
    })

    // Track time as leader
    leadershipDuration = promauto.NewHistogram(prometheus.HistogramOpts{
        Name:    "leader_election_leadership_duration_seconds",
        Help:    "Duration of leadership periods",
        Buckets: prometheus.ExponentialBuckets(1, 2, 15),
    })
)

// InstrumentedLeaderElector wraps LeaderElector with metrics
type InstrumentedLeaderElector struct {
    *LeaderElector
    leaderSince time.Time
}

func (ile *InstrumentedLeaderElector) onStartedLeading(ctx context.Context) {
    leadershipGauge.Set(1)
    leadershipTransitions.Inc()
    ile.leaderSince = time.Now()

    // Call original handler
    if ile.onStart != nil {
        ile.onStart(ctx)
    }
}

func (ile *InstrumentedLeaderElector) onStoppedLeading() {
    leadershipGauge.Set(0)
    leadershipDuration.Observe(time.Since(ile.leaderSince).Seconds())

    // Call original handler
    if ile.onStop != nil {
        ile.onStop()
    }
}
```

## Common Pitfalls and Solutions

### Clock Skew

Kubernetes nodes with significant clock differences can cause unexpected leader transitions. Ensure NTP is configured on all nodes:

```yaml
# Use a DaemonSet to verify time sync
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: time-check
spec:
  selector:
    matchLabels:
      app: time-check
  template:
    metadata:
      labels:
        app: time-check
    spec:
      containers:
      - name: time-check
        image: busybox
        command: ["sh", "-c", "while true; do date; sleep 60; done"]
```

### Split Brain Prevention

The lease-based approach prevents split brain by design, but network partitions can still cause issues. Add fencing to your workload:

```go
// FencedWorker only performs work if it can verify leadership
type FencedWorker struct {
    clientset  *kubernetes.Clientset
    leaseName  string
    namespace  string
    identity   string
}

// VerifyLeadership checks the lease before performing critical operations
func (fw *FencedWorker) VerifyLeadership(ctx context.Context) (bool, error) {
    lease, err := fw.clientset.CoordinationV1().Leases(fw.namespace).Get(
        ctx, fw.leaseName, metav1.GetOptions{})
    if err != nil {
        return false, err
    }

    return lease.Spec.HolderIdentity != nil &&
        *lease.Spec.HolderIdentity == fw.identity, nil
}

// PerformCriticalOperation verifies leadership before and after the operation
func (fw *FencedWorker) PerformCriticalOperation(ctx context.Context) error {
    // Check before
    isLeader, err := fw.VerifyLeadership(ctx)
    if err != nil || !isLeader {
        return fmt.Errorf("not leader, aborting operation")
    }

    // Perform the work
    if err := fw.doWork(ctx); err != nil {
        return err
    }

    // Check after - if we lost leadership, the work may need rollback
    isLeader, err = fw.VerifyLeadership(ctx)
    if err != nil || !isLeader {
        return fmt.Errorf("lost leadership during operation")
    }

    return nil
}
```

## Summary

Leader election in Kubernetes provides a reliable pattern for single-leader workloads. The key points to remember:

1. **Use Lease objects** - They are purpose-built for coordination and have lower overhead than ConfigMaps
2. **Tune timing parameters** - Balance between failover speed and API server load
3. **Implement proper callbacks** - Handle leadership transitions gracefully
4. **Add health endpoints** - Enable Kubernetes to route traffic appropriately
5. **Test failover scenarios** - Verify behavior under various failure conditions
6. **Monitor leadership metrics** - Track transitions and duration for operational visibility

The `client-go` library handles the complexity of distributed coordination, letting you focus on your application logic. Start with the basic implementation, then add health checks, metrics, and chaos testing as your deployment matures.
