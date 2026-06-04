# How to Use Gatekeeper External Data Provider for Dynamic Policy Decisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OPA Gatekeeper, External Data, Dynamic Policies, API Integration

Description: Learn how to configure OPA Gatekeeper external data providers to fetch real-time data from external APIs, databases.

---

Gatekeeper external data providers enable policies to make decisions based on data from external systems. Instead of only using static rules or cached Kubernetes resources, policies can query APIs, databases, or configuration services in real time. This enables dynamic policies that check vulnerability databases, validate against corporate registries, or enforce compliance based on external inventory systems.

## Understanding External Data Providers

External data providers are services that implement the Gatekeeper Provider API. Gatekeeper calls these providers during policy evaluation, passing keys and receiving values. Policies use this data in Rego rules to make admission decisions.

Common use cases include checking container image vulnerability scores, validating against external asset inventories, and enforcing license compliance based on external databases.

## Setting Up an External Data Provider

Create a simple provider that checks image vulnerabilities:

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

const providerAPIVersion = "externaldata.gatekeeper.sh/v1beta1"

type ProviderRequest struct {
    APIVersion string  `json:"apiVersion,omitempty"`
    Kind       string  `json:"kind,omitempty"`
    Request    Request `json:"request,omitempty"`
}

type Request struct {
    Keys []string `json:"keys,omitempty"`
}

type ProviderResponse struct {
    APIVersion string   `json:"apiVersion,omitempty"`
    Kind       string   `json:"kind,omitempty"`
    Response   Response `json:"response,omitempty"`
}

type Response struct {
    Idempotent  bool   `json:"idempotent,omitempty"`
    Items       []Item `json:"items,omitempty"`
    SystemError string `json:"systemError,omitempty"`
}

type Item struct {
    Key   string `json:"key"`
    Value string `json:"value"`
    Error string `json:"error,omitempty"`
}

func vulnerabilityHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req ProviderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    var items []Item
    for _, imageRef := range req.Request.Keys {
        // Query vulnerability database
        vulnScore := queryVulnerabilityDB(imageRef)
        items = append(items, Item{
            Key:   imageRef,
            Value: vulnScore,
        })
    }

    resp := ProviderResponse{
        APIVersion: providerAPIVersion,
        Kind:       "ProviderResponse",
        Response: Response{
            Idempotent: true,
            Items:      items,
        },
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func queryVulnerabilityDB(imageRef string) string {
    // Simulate external API call
    // In production, call actual vulnerability database
    vulnScores := map[string]string{
        "nginx:latest":           "high",
        "nginx:1.21":             "low",
        "postgres:13":            "medium",
        "alpine:3.18":            "low",
    }

    if score, exists := vulnScores[imageRef]; exists {
        return score
    }
    return "unknown"
}

func main() {
    http.HandleFunc("/validate", vulnerabilityHandler)
    go func() {
        log.Println("Provider listening on :8080 for local testing")
        log.Fatal(http.ListenAndServe(":8080", nil))
    }()

    log.Println("Provider listening on :8443 for Gatekeeper")
    log.Fatal(http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil))
}
```

Build and deploy:

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY main.go .
RUN go build -o provider main.go

FROM gcr.io/distroless/base
COPY --from=builder /app/provider /
ENTRYPOINT ["/provider"]
```

```yaml
# provider-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: vuln-provider
  namespace: gatekeeper-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vuln-provider
  template:
    metadata:
      labels:
        app: vuln-provider
    spec:
      containers:
        - name: provider
          image: company/vuln-provider:v1.0.0
          ports:
            - containerPort: 8080
            - containerPort: 8443
          volumeMounts:
            - name: provider-tls
              mountPath: /certs
              readOnly: true
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: provider-tls
          secret:
            secretName: vuln-provider-tls
---
apiVersion: v1
kind: Service
metadata:
  name: vuln-provider
  namespace: gatekeeper-system
spec:
  selector:
    app: vuln-provider
  ports:
    - port: 443
      targetPort: 8443
```

## Configuring Provider in Gatekeeper

Register the external data provider. Gatekeeper v3.11 and later require TLS or mTLS for external data providers, so use HTTPS and configure the provider CA bundle:

```yaml
apiVersion: externaldata.gatekeeper.sh/v1beta1
kind: Provider
metadata:
  name: vuln-provider
spec:
  url: https://vuln-provider.gatekeeper-system.svc.cluster.local/validate
  timeout: 5
  caBundle: <base64-encoded-ca-certificate>
```

## Using External Data in Policies

Create a constraint template that uses the provider:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sexternalvulncheck
spec:
  crd:
    spec:
      names:
        kind: K8sExternalVulnCheck
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxSeverity:
              type: string
              enum: ["low", "medium", "high"]
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sexternalvulncheck

        violation[{"msg": msg}] {
          # Get container images
          container := input.review.object.spec.containers[_]
          image := container.image

          # Query external provider
          provider := "vuln-provider"
          response := external_data({
            "provider": provider,
            "keys": [image]
          })

          response.system_error == ""
          severity_response := response.responses[_]
          severity_response[0] == image

          # Check vulnerability severity
          severity := severity_response[1]
          severity_rank := {"low": 1, "medium": 2, "high": 3, "critical": 4}
          max_severity_rank := severity_rank[input.parameters.maxSeverity]
          actual_severity_rank := severity_rank[severity]

          actual_severity_rank > max_severity_rank

          msg := sprintf("Image %v has severity %v, exceeds maximum %v", [
            image,
            severity,
            input.parameters.maxSeverity
          ])
        }
```

Create a constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sExternalVulnCheck
metadata:
  name: block-high-vuln-images
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    maxSeverity: "medium"
```

## Advanced Provider Patterns

Implement caching in the provider:

```go
import (
    "sync"
    "time"
)

type CachedProvider struct {
    cache map[string]cachedValue
    mu    sync.RWMutex
    ttl   time.Duration
}

type cachedValue struct {
    value     string
    timestamp time.Time
}

func NewCachedProvider(ttl time.Duration) *CachedProvider {
    return &CachedProvider{
        cache: make(map[string]cachedValue),
        ttl:   ttl,
    }
}

func (p *CachedProvider) Get(key string) (string, bool) {
    p.mu.RLock()
    defer p.mu.RUnlock()

    if cached, exists := p.cache[key]; exists {
        if time.Since(cached.timestamp) < p.ttl {
            return cached.value, true
        }
    }
    return "", false
}

func (p *CachedProvider) Set(key, value string) {
    p.mu.Lock()
    defer p.mu.Unlock()

    p.cache[key] = cachedValue{
        value:     value,
        timestamp: time.Now(),
    }
}

var provider = NewCachedProvider(5 * time.Minute)

func vulnerabilityHandler(w http.ResponseWriter, r *http.Request) {
    var req ProviderRequest
    json.NewDecoder(r.Body).Decode(&req)

    var items []Item
    for _, image := range req.Request.Keys {
        // Check cache first
        if value, found := provider.Get(image); found {
            items = append(items, Item{
                Key:   image,
                Value: value,
            })
            continue
        }

        // Query external API
        vulnScore := queryVulnerabilityDB(image)
        provider.Set(image, vulnScore)

        items = append(items, Item{
            Key:   image,
            Value: vulnScore,
        })
    }

    resp := ProviderResponse{
        APIVersion: providerAPIVersion,
        Kind:       "ProviderResponse",
        Response: Response{
            Idempotent: true,
            Items:      items,
        },
    }
    json.NewEncoder(w).Encode(resp)
}
```

## Multiple Provider Integration

Use multiple providers in policies:

```yaml
apiVersion: externaldata.gatekeeper.sh/v1beta1
kind: Provider
metadata:
  name: license-checker
spec:
  url: https://license-checker.gatekeeper-system.svc.cluster.local/validate
  timeout: 3
  caBundle: <base64-encoded-ca-certificate>
---
apiVersion: externaldata.gatekeeper.sh/v1beta1
kind: Provider
metadata:
  name: registry-validator
spec:
  url: https://registry-validator.gatekeeper-system.svc.cluster.local/validate
  timeout: 5
  caBundle: <base64-encoded-ca-certificate>
```

Policy using multiple providers:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8smultiprovidercheck
spec:
  crd:
    spec:
      names:
        kind: K8sMultiProviderCheck
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8smultiprovidercheck

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          image := container.image

          # Check vulnerabilities
          vuln_response := external_data({
            "provider": "vuln-provider",
            "keys": [image]
          })
          vuln_response.system_error == ""
          vuln_result := vuln_response.responses[_]
          vuln_result[0] == image
          vuln_result[1] == "high"

          # Check license
          license_response := external_data({
            "provider": "license-checker",
            "keys": [image]
          })
          license_response.system_error == ""
          license_result := license_response.responses[_]
          license_result[0] == image
          license_result[1] == "unapproved"

          msg := sprintf("Image %v has high vulnerabilities and unapproved license", [image])
        }
```

## Error Handling

Handle provider failures gracefully:

```yaml
rego: |
  package errorhandling

  violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    image := container.image

    response := external_data({
      "provider": "vuln-provider",
      "keys": [image]
    })

    # Check if provider returned an item error or system error
    response.system_error != ""
    msg := sprintf("Unable to verify image %v - provider unavailable", [image])
  }

  violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    image := container.image

    response := external_data({
      "provider": "vuln-provider",
      "keys": [image]
    })

    # Check if provider returned an item error
    error_response := response.errors[_]
    error_response[0] == image
    msg := sprintf("Unable to verify image %v: %v", [image, error_response[1]])
  }

  violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    image := container.image

    response := external_data({
      "provider": "vuln-provider",
      "keys": [image]
    })

    # Check actual vulnerability
    response.system_error == ""
    severity_response := response.responses[_]
    severity_response[0] == image
    severity_response[1] == "high"
    msg := sprintf("Image %v has high vulnerabilities", [image])
  }
```

## Monitoring Provider Performance

Add metrics to provider:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "provider_request_duration_seconds",
            Help: "Provider request duration",
        },
        []string{"provider"},
    )

    requestTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "provider_requests_total",
            Help: "Total provider requests",
        },
        []string{"provider", "status"},
    )

    cacheHits = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "provider_cache_hits_total",
            Help: "Total cache hits",
        },
    )
)

func init() {
    prometheus.MustRegister(requestDuration)
    prometheus.MustRegister(requestTotal)
    prometheus.MustRegister(cacheHits)
}

func main() {
    http.HandleFunc("/validate", vulnerabilityHandler)
    http.Handle("/metrics", promhttp.Handler())
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Testing Providers

Test provider locally:

```bash
# Send test request
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "externaldata.gatekeeper.sh/v1beta1",
    "kind": "ProviderRequest",
    "request": {
      "keys": ["nginx:latest", "alpine:3.18"]
    }
  }'

# Expected response:
# {
#   "apiVersion": "externaldata.gatekeeper.sh/v1beta1",
#   "kind": "ProviderResponse",
#   "response": {
#     "idempotent": true,
#     "items": [
#       {"key": "nginx:latest", "value": "high"},
#       {"key": "alpine:3.18", "value": "low"}
#     ]
#   }
# }
```

## Conclusion

Gatekeeper external data providers enable dynamic policy decisions based on real-time external data. Implement providers that query vulnerability databases, license registries, or compliance systems. Register providers with Gatekeeper, use them in Rego policies through the external_data function, and implement caching for performance. Handle provider failures gracefully, monitor provider performance with metrics, and test providers thoroughly before production deployment.

External data providers transform static policies into dynamic, context-aware admission control that responds to current security posture and compliance requirements.
