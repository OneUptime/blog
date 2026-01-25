# How to Migrate Traffic Between Service Versions in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Traffic Migration, Canary Deployment, Feature Flags, DevOps

Description: A hands-on guide to safely migrating traffic between service versions in Go using weighted routing, feature flags, and canary deployments - with production-ready code examples.

---

Deploying a new version of your service is easy. Getting traffic to it safely is the hard part. You want zero downtime, the ability to roll back instantly, and confidence that the new version actually works under real load. This guide walks through practical approaches to traffic migration in Go, from simple weighted routing to feature-flag-driven canary deployments.

## Why Traffic Migration Matters

Switching 100% of traffic to a new service version in one shot is a gamble. If the new version has a bug, every user gets hit. Traffic migration strategies let you:

- Test new code with real production traffic (not just staging)
- Limit blast radius when things go wrong
- Gather performance data before full rollout
- Roll back in seconds, not minutes

## Approach 1: Weighted Load Balancer in Go

The simplest approach is a reverse proxy that routes requests based on configurable weights. Here's a working implementation:

```go
package main

import (
    "math/rand"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync/atomic"
)

// WeightedRouter distributes traffic between two backend versions
type WeightedRouter struct {
    v1Proxy    *httputil.ReverseProxy
    v2Proxy    *httputil.ReverseProxy
    v2Weight   int64  // percentage of traffic to v2 (0-100)
}

func NewWeightedRouter(v1URL, v2URL string, v2Weight int) (*WeightedRouter, error) {
    v1, err := url.Parse(v1URL)
    if err != nil {
        return nil, err
    }
    v2, err := url.Parse(v2URL)
    if err != nil {
        return nil, err
    }

    return &WeightedRouter{
        v1Proxy:  httputil.NewSingleHostReverseProxy(v1),
        v2Proxy:  httputil.NewSingleHostReverseProxy(v2),
        v2Weight: int64(v2Weight),
    }, nil
}

func (wr *WeightedRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    weight := atomic.LoadInt64(&wr.v2Weight)

    // Route based on random number vs weight threshold
    if rand.Intn(100) < int(weight) {
        wr.v2Proxy.ServeHTTP(w, r)
    } else {
        wr.v1Proxy.ServeHTTP(w, r)
    }
}

// SetV2Weight allows runtime adjustment of traffic split
func (wr *WeightedRouter) SetV2Weight(weight int) {
    atomic.StoreInt64(&wr.v2Weight, int64(weight))
}
```

Start with `v2Weight` at 1%, monitor your metrics, then bump it to 5%, 10%, 25%, 50%, and finally 100%. If errors spike at any stage, set weight back to 0.

## Approach 2: Sticky Sessions with Gradual Rollout

Random distribution works, but sometimes you need users to stick with one version for the duration of their session. This prevents confusing behavior if the two versions have UI or API differences.

```go
package main

import (
    "hash/fnv"
    "net/http"
    "net/http/httputil"
    "sync/atomic"
)

type StickyRouter struct {
    v1Proxy  *httputil.ReverseProxy
    v2Proxy  *httputil.ReverseProxy
    v2Weight int64
}

func (sr *StickyRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Use session ID or user ID for consistent routing
    sessionID := sr.extractSessionID(r)

    // Hash the session ID to get a deterministic number 0-99
    bucket := sr.hashToBucket(sessionID)

    weight := atomic.LoadInt64(&sr.v2Weight)

    // Users in buckets 0 through (weight-1) get v2
    if bucket < int(weight) {
        sr.v2Proxy.ServeHTTP(w, r)
    } else {
        sr.v1Proxy.ServeHTTP(w, r)
    }
}

func (sr *StickyRouter) extractSessionID(r *http.Request) string {
    // Check cookie first
    if cookie, err := r.Cookie("session_id"); err == nil {
        return cookie.Value
    }
    // Fall back to Authorization header or IP
    if auth := r.Header.Get("Authorization"); auth != "" {
        return auth
    }
    return r.RemoteAddr
}

func (sr *StickyRouter) hashToBucket(s string) int {
    h := fnv.New32a()
    h.Write([]byte(s))
    return int(h.Sum32() % 100)
}
```

With this approach, a user who lands in the v2 bucket stays there. When you increase the weight from 10% to 20%, users in buckets 0-9 continue hitting v2, and users in buckets 10-19 join them.

## Approach 3: Feature Flags for Fine-Grained Control

Sometimes you want routing decisions based on more than just percentages. Feature flags let you target specific user segments, regions, or request attributes.

```go
package main

import (
    "net/http"
    "strings"
    "sync"
)

type FeatureFlagRouter struct {
    v1Handler http.Handler
    v2Handler http.Handler

    mu       sync.RWMutex
    flags    map[string]bool      // simple on/off flags
    userList map[string]bool      // specific users to route to v2
    v2Weight int                  // fallback percentage
}

func (ffr *FeatureFlagRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if ffr.shouldRouteToV2(r) {
        ffr.v2Handler.ServeHTTP(w, r)
    } else {
        ffr.v1Handler.ServeHTTP(w, r)
    }
}

func (ffr *FeatureFlagRouter) shouldRouteToV2(r *http.Request) bool {
    ffr.mu.RLock()
    defer ffr.mu.RUnlock()

    // Check kill switch first
    if ffr.flags["v2_disabled"] {
        return false
    }

    // Internal users always get v2
    if ffr.flags["v2_internal_only"] {
        return ffr.isInternalRequest(r)
    }

    // Check user allowlist
    userID := r.Header.Get("X-User-ID")
    if ffr.userList[userID] {
        return true
    }

    // Check beta header
    if r.Header.Get("X-Beta-Features") == "enabled" {
        return true
    }

    // Fall back to percentage-based routing
    return ffr.hashToBucket(userID) < ffr.v2Weight
}

func (ffr *FeatureFlagRouter) isInternalRequest(r *http.Request) bool {
    // Check for internal network or VPN headers
    return strings.HasPrefix(r.RemoteAddr, "10.") ||
           r.Header.Get("X-Internal-Request") == "true"
}

// Runtime flag updates
func (ffr *FeatureFlagRouter) SetFlag(name string, value bool) {
    ffr.mu.Lock()
    ffr.flags[name] = value
    ffr.mu.Unlock()
}

func (ffr *FeatureFlagRouter) AddBetaUser(userID string) {
    ffr.mu.Lock()
    ffr.userList[userID] = true
    ffr.mu.Unlock()
}
```

This pattern is powerful for complex rollout scenarios: internal dogfooding, beta programs, geographic rollouts, or A/B testing.

## Approach 4: Health-Aware Routing

Traffic migration should automatically stop routing to a failing service. Add health checks to your router:

```go
package main

import (
    "net/http"
    "sync/atomic"
    "time"
)

type HealthAwareRouter struct {
    v1Proxy   *httputil.ReverseProxy
    v2Proxy   *httputil.ReverseProxy
    v2Weight  int64
    v2Healthy int32  // 1 = healthy, 0 = unhealthy
    v2URL     string
}

func (hr *HealthAwareRouter) StartHealthCheck(interval time.Duration) {
    go func() {
        client := &http.Client{Timeout: 2 * time.Second}
        for {
            resp, err := client.Get(hr.v2URL + "/health")
            if err != nil || resp.StatusCode != 200 {
                atomic.StoreInt32(&hr.v2Healthy, 0)
            } else {
                atomic.StoreInt32(&hr.v2Healthy, 1)
            }
            if resp != nil {
                resp.Body.Close()
            }
            time.Sleep(interval)
        }
    }()
}

func (hr *HealthAwareRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // If v2 is unhealthy, all traffic goes to v1
    if atomic.LoadInt32(&hr.v2Healthy) == 0 {
        hr.v1Proxy.ServeHTTP(w, r)
        return
    }

    // Normal weighted routing
    weight := atomic.LoadInt64(&hr.v2Weight)
    if rand.Intn(100) < int(weight) {
        hr.v2Proxy.ServeHTTP(w, r)
    } else {
        hr.v1Proxy.ServeHTTP(w, r)
    }
}
```

## Putting It All Together

Here's a complete example tying everything together with an admin API for runtime control:

```go
func main() {
    router, _ := NewWeightedRouter(
        "http://service-v1:8080",
        "http://service-v2:8080",
        0,  // Start with 0% to v2
    )

    // Admin endpoint for traffic control
    http.HandleFunc("/admin/weight", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == "POST" {
            weight, _ := strconv.Atoi(r.FormValue("weight"))
            router.SetV2Weight(weight)
            fmt.Fprintf(w, "V2 weight set to %d%%", weight)
        }
    })

    // All other traffic goes through the router
    http.Handle("/", router)

    http.ListenAndServe(":80", nil)
}
```

## Best Practices

1. **Start small** - Begin with 1% or even 0.1% traffic to the new version
2. **Monitor everything** - Watch error rates, latency percentiles, and business metrics at each stage
3. **Automate rollback** - If error rates exceed a threshold, automatically shift traffic back
4. **Use observability** - Instrument both versions with OpenTelemetry to compare behavior
5. **Keep both versions running** - Don't decommission v1 until v2 has proven itself over days, not hours

Traffic migration in Go is straightforward once you have the right primitives. Start with simple weighted routing, add sticky sessions if needed, layer in feature flags for complex scenarios, and always include health checks. Your deployments will go from nerve-wracking events to boring routine.
