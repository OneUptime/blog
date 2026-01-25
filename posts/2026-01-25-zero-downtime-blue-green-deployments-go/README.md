# How to Implement Zero-Downtime Blue-Green Deployments in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Blue-Green Deployment, Zero Downtime, DevOps, Deployment

Description: A hands-on guide to building a blue-green deployment system in Go, with working code for traffic switching, health checks, and graceful rollbacks.

---

Blue-green deployments solve one of the most stressful problems in software delivery: how do you ship new code without taking your service offline? The concept is straightforward. You run two identical production environments - blue and green. One serves live traffic while the other sits idle. When you deploy, you push to the idle environment, verify it works, then flip traffic over. If something breaks, you flip back.

Most teams implement this pattern using load balancers, Kubernetes, or managed services. But understanding what happens under the hood makes you better at debugging when things go sideways. Let's build a minimal blue-green deployment system in Go from scratch.

## The Core Architecture

Our system needs three components: a reverse proxy that routes traffic, health checks that verify backend readiness, and an API to trigger the switch. The proxy sits in front of two backend servers and forwards all requests to whichever one is currently "active."

Here's the basic structure:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync"
    "time"
)

// DeploymentState tracks which environment is currently active
type DeploymentState struct {
    mu          sync.RWMutex
    activeColor string        // "blue" or "green"
    blue        *url.URL      // URL of the blue backend
    green       *url.URL      // URL of the green backend
    blueHealthy bool
    greenHealthy bool
}

// NewDeploymentState initializes with blue as the default active environment
func NewDeploymentState(blueURL, greenURL string) (*DeploymentState, error) {
    blue, err := url.Parse(blueURL)
    if err != nil {
        return nil, fmt.Errorf("invalid blue URL: %w", err)
    }
    green, err := url.Parse(greenURL)
    if err != nil {
        return nil, fmt.Errorf("invalid green URL: %w", err)
    }

    return &DeploymentState{
        activeColor: "blue",
        blue:        blue,
        green:       green,
    }, nil
}
```

The `sync.RWMutex` is critical here. Multiple goroutines will read the active state on every request, but only the switch operation writes to it. Using a read-write lock lets us handle thousands of concurrent requests without blocking.

## Building the Reverse Proxy

Go's standard library includes `httputil.ReverseProxy`, which handles the heavy lifting of forwarding requests. We wrap it with our switching logic:

```go
// ServeHTTP forwards requests to the currently active backend
func (ds *DeploymentState) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    ds.mu.RLock()
    target := ds.blue
    if ds.activeColor == "green" {
        target = ds.green
    }
    ds.mu.RUnlock()

    // Create a reverse proxy for this request
    proxy := httputil.NewSingleHostReverseProxy(target)

    // Customize error handling to catch backend failures
    proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
        log.Printf("Proxy error to %s: %v", target, err)
        http.Error(w, "Backend unavailable", http.StatusBadGateway)
    }

    proxy.ServeHTTP(w, r)
}
```

Notice that we grab the target URL while holding the read lock, then release it before proxying. This minimizes lock contention. The actual request forwarding happens outside the critical section.

## Health Checks That Actually Work

Health checks prevent you from switching traffic to a broken backend. A naive implementation just hits an endpoint and checks for a 200 status. Production systems need more nuance:

```go
// HealthChecker continuously monitors backend health
type HealthChecker struct {
    state    *DeploymentState
    interval time.Duration
    timeout  time.Duration
    client   *http.Client
}

func NewHealthChecker(state *DeploymentState) *HealthChecker {
    return &HealthChecker{
        state:    state,
        interval: 5 * time.Second,
        timeout:  2 * time.Second,
        client: &http.Client{
            Timeout: 2 * time.Second,
        },
    }
}

// Start begins the health check loop for both backends
func (hc *HealthChecker) Start(ctx context.Context) {
    ticker := time.NewTicker(hc.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            hc.checkBoth()
        }
    }
}

func (hc *HealthChecker) checkBoth() {
    // Check both backends concurrently
    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        healthy := hc.checkEndpoint(hc.state.blue, "/health")
        hc.state.mu.Lock()
        hc.state.blueHealthy = healthy
        hc.state.mu.Unlock()
    }()

    go func() {
        defer wg.Done()
        healthy := hc.checkEndpoint(hc.state.green, "/health")
        hc.state.mu.Lock()
        hc.state.greenHealthy = healthy
        hc.state.mu.Unlock()
    }()

    wg.Wait()
}

func (hc *HealthChecker) checkEndpoint(target *url.URL, path string) bool {
    checkURL := target.ResolveReference(&url.URL{Path: path})

    resp, err := hc.client.Get(checkURL.String())
    if err != nil {
        log.Printf("Health check failed for %s: %v", target, err)
        return false
    }
    defer resp.Body.Close()

    // Consider anything other than 2xx as unhealthy
    return resp.StatusCode >= 200 && resp.StatusCode < 300
}
```

Running checks concurrently matters when you have multiple backends. Sequential checks double your health check latency, which delays failure detection.

## The Switch API

Now we need an endpoint to trigger the blue-green switch. This should validate health before switching and provide rollback capability:

```go
// SwitchHandler manages deployment state transitions
type SwitchHandler struct {
    state *DeploymentState
}

func (sh *SwitchHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    targetColor := r.URL.Query().Get("to")
    if targetColor != "blue" && targetColor != "green" {
        http.Error(w, "Invalid target: must be 'blue' or 'green'", http.StatusBadRequest)
        return
    }

    sh.state.mu.Lock()
    defer sh.state.mu.Unlock()

    // Check if we're already on the target
    if sh.state.activeColor == targetColor {
        fmt.Fprintf(w, "Already on %s\n", targetColor)
        return
    }

    // Verify target is healthy before switching
    targetHealthy := sh.state.blueHealthy
    if targetColor == "green" {
        targetHealthy = sh.state.greenHealthy
    }

    if !targetHealthy {
        http.Error(w, fmt.Sprintf("Target %s is not healthy", targetColor), http.StatusPreconditionFailed)
        return
    }

    previousColor := sh.state.activeColor
    sh.state.activeColor = targetColor

    log.Printf("Switched from %s to %s", previousColor, targetColor)
    fmt.Fprintf(w, "Switched from %s to %s\n", previousColor, targetColor)
}
```

The health check validation is essential. Without it, an operator could accidentally route traffic to a backend that's still starting up or completely down.

## Putting It All Together

Here's how to wire everything up in your main function:

```go
func main() {
    // Initialize deployment state with backend URLs
    state, err := NewDeploymentState(
        "http://localhost:8081",  // Blue backend
        "http://localhost:8082",  // Green backend
    )
    if err != nil {
        log.Fatal(err)
    }

    // Start health checker in background
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    healthChecker := NewHealthChecker(state)
    go healthChecker.Start(ctx)

    // Set up HTTP handlers
    mux := http.NewServeMux()

    // Admin API for switching - protect this in production
    mux.Handle("/admin/switch", &SwitchHandler{state: state})

    // Status endpoint showing current state
    mux.HandleFunc("/admin/status", func(w http.ResponseWriter, r *http.Request) {
        state.mu.RLock()
        defer state.mu.RUnlock()
        fmt.Fprintf(w, "Active: %s\nBlue healthy: %t\nGreen healthy: %t\n",
            state.activeColor, state.blueHealthy, state.greenHealthy)
    })

    // All other traffic goes to the proxy
    mux.Handle("/", state)

    log.Println("Starting blue-green proxy on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

## Graceful Connection Draining

The code above switches traffic instantly. In production, you want to drain existing connections from the old backend before fully switching. Here's a more sophisticated approach:

```go
// GracefulSwitch waits for in-flight requests to complete
func (sh *SwitchHandler) GracefulSwitch(targetColor string, drainTimeout time.Duration) error {
    sh.state.mu.Lock()

    if sh.state.activeColor == targetColor {
        sh.state.mu.Unlock()
        return nil
    }

    // Set the new active color
    previousColor := sh.state.activeColor
    sh.state.activeColor = targetColor
    sh.state.mu.Unlock()

    // Give in-flight requests time to complete on old backend
    // In a real system, you'd track active connections
    log.Printf("Draining connections from %s for %v", previousColor, drainTimeout)
    time.Sleep(drainTimeout)

    log.Printf("Drain complete, fully switched to %s", targetColor)
    return nil
}
```

For true connection draining, you'd track active requests per backend using atomic counters and wait until the count hits zero or the timeout expires.

## Testing Your Deployment

Before going live, test the failure scenarios:

1. Start the proxy with only blue running. Verify traffic flows to blue.
2. Start green and hit the switch endpoint. Verify traffic moves to green.
3. Kill green and try to switch back. The health check should block it.
4. Restart green, wait for health checks, then switch successfully.

This exercise reveals edge cases your monitoring needs to catch. What happens if both backends fail? How fast do health checks detect failure? These questions matter more than the happy path.

## Production Considerations

This example demonstrates the pattern, but production systems need more:

- TLS termination at the proxy layer
- Request timeouts to prevent hung connections
- Metrics on request latency per backend
- Authentication on the admin endpoints
- Persistent state so restarts don't reset to blue

The principles remain the same regardless of whether you're building this yourself or configuring nginx, HAProxy, or Kubernetes services. Understanding the mechanics helps you debug when the abstraction leaks.

Blue-green deployments trade infrastructure cost for deployment confidence. Running two production environments isn't cheap. But when your deploy process becomes boring and predictable, that cost pays for itself in reduced incidents and faster iteration.
