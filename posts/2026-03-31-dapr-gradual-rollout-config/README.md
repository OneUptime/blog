# How to Implement Gradual Rollout with Dapr Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Gradual Rollout, Feature Flag, Deployment

Description: Use the Dapr Configuration API to implement percentage-based gradual feature rollouts that increase traffic incrementally without redeployment.

---

## Gradual Rollout Strategy

A gradual rollout (also called a canary release at the feature level) exposes a new feature to a growing percentage of users. Dapr's Configuration API stores the rollout percentage, and services subscribe to changes so the rollout progresses without restarts.

## Storing Rollout Configuration

```bash
# Start at 0% - feature is off for all users
redis-cli SET "new-search-engine:percentage" "0"
redis-cli SET "new-search-engine:enabled" "true"
redis-cli SET "new-search-engine:startedAt" "2026-03-31T00:00:00Z"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rollouts
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Rollout Gate Middleware

```go
package rollout

import (
    "context"
    "fmt"
    "hash/fnv"
    "strconv"
    "sync/atomic"

    dapr "github.com/dapr/go-sdk/client"
)

type RolloutGate struct {
    client     dapr.Client
    storeName  string
    percentage atomic.Int32
}

func NewRolloutGate(client dapr.Client, storeName, feature string) *RolloutGate {
    g := &RolloutGate{client: client, storeName: storeName}
    g.percentage.Store(0)
    go g.watchPercentage(feature)
    return g
}

func (g *RolloutGate) watchPercentage(feature string) {
    ctx := context.Background()
    g.client.SubscribeConfigurationItems(ctx, g.storeName,
        []string{fmt.Sprintf("%s:percentage", feature)},
        func(id string, items map[string]*dapr.ConfigurationItem) {
            for _, item := range items {
                if pct, err := strconv.Atoi(item.Value); err == nil {
                    g.percentage.Store(int32(pct))
                    fmt.Printf("Rollout percentage updated to %d%%\n", pct)
                }
            }
        })
}

func (g *RolloutGate) IsEnabled(userID string) bool {
    pct := int(g.percentage.Load())
    if pct <= 0 {
        return false
    }
    if pct >= 100 {
        return true
    }
    h := fnv.New32a()
    h.Write([]byte(userID))
    bucket := int(h.Sum32() % 100)
    return bucket < pct
}
```

## Using the Gate in a Handler

```go
func searchHandler(gate *rollout.RolloutGate) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userID := r.Header.Get("X-User-ID")
        if gate.IsEnabled(userID) {
            // New search engine path
            newSearch(w, r)
        } else {
            // Legacy search path
            legacySearch(w, r)
        }
    }
}
```

## Automated Rollout Script

```bash
#!/bin/bash
FEATURE="new-search-engine"
INCREMENTS=(5 10 25 50 75 100)
WAIT_MINUTES=30

for pct in "${INCREMENTS[@]}"; do
  echo "Setting rollout to ${pct}%..."
  redis-cli SET "${FEATURE}:percentage" "${pct}"

  echo "Waiting ${WAIT_MINUTES} minutes before next increment..."
  sleep $((WAIT_MINUTES * 60))

  # Check error rate - abort if too high
  ERROR_RATE=$(curl -s http://metrics.internal/api/error-rate?feature=$FEATURE | jq '.rate')
  if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    echo "Error rate ${ERROR_RATE} too high, rolling back to 0%"
    redis-cli SET "${FEATURE}:percentage" "0"
    exit 1
  fi
done

echo "Rollout complete!"
```

## Summary

Dapr's Configuration API enables gradual rollouts by storing a percentage value that all running service instances watch via subscriptions. When the percentage changes, every pod applies the new threshold within milliseconds - no rolling restart needed. Combined with automated rollout scripts that monitor error rates, this pattern significantly reduces deployment risk.
