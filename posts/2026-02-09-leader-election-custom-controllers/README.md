# How to Implement Leader Election in Custom Kubernetes Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Controllers, Leader Election

Description: Learn how to implement leader election in custom Kubernetes controllers to ensure only one instance actively reconciles resources at a time, preventing conflicts and race conditions.

---

When you run multiple replicas of a custom Kubernetes controller for high availability, you need leader election to ensure only one instance actively reconciles resources at a time. Without this mechanism, multiple controller instances would compete to update the same resources, leading to race conditions and conflicts.

Leader election ensures that only one replica holds the lease and performs reconciliation, while other replicas remain on standby. If the leader fails, another replica automatically takes over. This pattern is fundamental for building production-ready controllers.

## Why Leader Election Matters

Running a single controller instance creates a single point of failure. If that controller crashes or its node fails, no reconciliation happens until you restart it. Running multiple replicas without coordination creates chaos as they fight over resources.

Leader election solves this by designating one active leader while keeping backup replicas ready. The leader periodically renews its lease, and if it fails to do so, another replica wins the election and becomes the new leader.

## Using client-go's leaderelection Package

The client-go library provides a robust leader election implementation that uses Kubernetes resources like Leases, ConfigMaps, or Endpoints as the coordination mechanism. Leases are the recommended approach in modern Kubernetes clusters.

Here's a basic implementation:

```go
package main

import (
    "context"
    "flag"
    "os"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/leaderelection"
    "k8s.io/client-go/tools/leaderelection/resourcelock"
    "k8s.io/klog/v2"
)

func main() {
    var leaseLockName string
    var leaseLockNamespace string
    var id string

    flag.StringVar(&leaseLockName, "lease-lock-name", "my-controller-lock", "Name of the lease lock")
    flag.StringVar(&leaseLockNamespace, "lease-lock-namespace", "default", "Namespace for the lease lock")
    flag.StringVar(&id, "id", "", "Unique identity of this controller instance")
    flag.Parse()

    // Get unique identity from hostname if not provided
    if id == "" {
        id, _ = os.Hostname()
    }

    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        klog.Fatalf("Failed to get in-cluster config: %v", err)
    }

    // Create clientset
    client := kubernetes.NewForConfigOrDie(config)

    // Create a context that will be cancelled when we lose leadership
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Create the resource lock for leader election
    lock := &resourcelock.LeaseLock{
        LeaseMeta: metav1.ObjectMeta{
            Name:      leaseLockName,
            Namespace: leaseLockNamespace,
        },
        Client: client.CoordinationV1(),
        LockConfig: resourcelock.ResourceLockConfig{
            Identity: id,
        },
    }

    // Start leader election
    leaderelection.RunOrDie(ctx, leaderelection.LeaderElectionConfig{
        Lock:            lock,
        ReleaseOnCancel: true,
        LeaseDuration:   60 * time.Second,  // How long the lease is valid
        RenewDeadline:   15 * time.Second,  // Deadline to renew before giving up leadership
        RetryPeriod:     5 * time.Second,   // How often to attempt to renew
        Callbacks: leaderelection.LeaderCallbacks{
            OnStartedLeading: func(ctx context.Context) {
                klog.Infof("Instance %s became the leader", id)
                // Start your controller reconciliation here
                runController(ctx)
            },
            OnStoppedLeading: func() {
                klog.Infof("Instance %s lost leadership", id)
                // Clean up and exit
                os.Exit(0)
            },
            OnNewLeader: func(identity string) {
                if identity == id {
                    return
                }
                klog.Infof("New leader elected: %s", identity)
            },
        },
    })
}

func runController(ctx context.Context) {
    // Your controller reconciliation logic here
    klog.Info("Starting controller reconciliation loop")

    // Typically you'd start informers, work queues, etc.
    <-ctx.Done()
    klog.Info("Stopping controller reconciliation")
}
```

## Understanding Lease Parameters

Three timing parameters control leader election behavior:

**LeaseDuration** defines how long the lease remains valid. The leader must renew before this expires. Set this to 60 seconds for most use cases.

**RenewDeadline** specifies how long the leader has to successfully renew the lease. If renewal fails within this window, the leader gives up. Set this to 15 seconds, giving the leader multiple retry attempts.

**RetryPeriod** determines how often the leader attempts to renew the lease and how often non-leaders try to acquire it. Set this to 5 seconds for responsive failover without excessive API calls.

## Integrating with Controller Runtime

If you're using controller-runtime (the foundation for Kubebuilder and Operator SDK), leader election is even simpler. The manager handles it for you:

```go
package main

import (
    "os"

    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"
)

func main() {
    opts := zap.Options{Development: true}
    ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme:                 scheme,
        MetricsBindAddress:     ":8080",
        Port:                   9443,
        HealthProbeBindAddress: ":8081",
        // Enable leader election
        LeaderElection:          true,
        LeaderElectionID:        "my-controller.example.com",
        LeaderElectionNamespace: "controller-system",
    })
    if err != nil {
        os.Exit(1)
    }

    // Add your controllers to the manager
    // if err = (&MyReconciler{}).SetupWithManager(mgr); err != nil {
    //     os.Exit(1)
    // }

    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        os.Exit(1)
    }
}
```

The manager creates the lease, handles renewal, and only starts controllers when leadership is acquired.

## RBAC Permissions for Leader Election

Your controller needs RBAC permissions to create and update leases:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-election-role
  namespace: controller-system
rules:
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["get", "create", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leader-election-rolebinding
  namespace: controller-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: leader-election-role
subjects:
- kind: ServiceAccount
  name: controller-manager
  namespace: controller-system
```

## Monitoring Leader Election

You should expose metrics to track leader election status. Controller-runtime automatically exports metrics like:

- `leader_election_master_status`: Whether this instance is the leader (1) or not (0)
- `workqueue_depth`: Queue depth helps identify if the leader is keeping up

You can also add custom metrics to track leadership transitions:

```go
var (
    leadershipTransitions = prometheus.NewCounter(prometheus.CounterOpts{
        Name: "controller_leadership_transitions_total",
        Help: "Total number of leadership transitions",
    })
)

func init() {
    metrics.Registry.MustRegister(leadershipTransitions)
}

// In OnStartedLeading callback
leadershipTransitions.Inc()
```

## Testing Leader Election

Test leader election by running multiple replicas and observing behavior:

```bash
# Deploy with 3 replicas
kubectl scale deployment my-controller --replicas=3

# Check which instance is the leader
kubectl get lease -n controller-system my-controller-lock -o yaml

# Look for the holderIdentity field
# This shows which pod currently holds the lease

# Kill the leader pod
kubectl delete pod <leader-pod-name> -n controller-system

# Watch the lease change to a new holder
kubectl get lease -n controller-system my-controller-lock -o yaml -w
```

The lease should transfer to another replica within seconds after the leader pod terminates.

## Common Pitfalls

Don't set timing parameters too aggressively. Very short lease durations and retry periods generate excessive API server load. The default values work well for most cases.

Always handle the `OnStoppedLeading` callback properly. When a controller loses leadership due to network issues or slow responses, it must stop reconciliation immediately to avoid split-brain scenarios.

Ensure your controller can start and stop cleanly. When leadership changes, the old leader must release resources, and the new leader must initialize properly. Use contexts to propagate cancellation signals.

Leader election protects against conflicts in distributed controller deployments, ensuring exactly one active reconciler while maintaining high availability through automatic failover.
