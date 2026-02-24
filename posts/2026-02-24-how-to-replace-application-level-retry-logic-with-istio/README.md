# How to Replace Application-Level Retry Logic with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Resilience, VirtualService, Service Mesh

Description: Move retry logic from your application code to Istio VirtualService configuration for consistent, language-agnostic retry behavior across all your services.

---

Most applications have retry logic scattered throughout the codebase. You have exponential backoff in your HTTP client, retries in your gRPC calls, and maybe a custom retry decorator wrapping database connections. Each service implements retries differently, with different retry counts, different backoff strategies, and different error conditions.

Istio lets you move retry logic to the infrastructure layer. Instead of coding retries into every service, you configure them once in a VirtualService, and the Envoy sidecar handles the rest. Here is how to make that transition.

## Why Move Retries to Istio

Application-level retries have several problems:

- Inconsistent implementation across services (different languages, different libraries)
- Hard to change without deploying new code
- Can cause retry storms when both client and server retry
- Developers forget to add retries to new endpoints
- No visibility into retry behavior without custom metrics

Istio retries solve these by:

- Applying consistent retry behavior at the proxy layer
- Being configurable without code changes
- Providing built-in metrics on retries
- Working the same regardless of programming language

## What Application-Level Retries Look Like

Here are common retry patterns you might find in your code:

### Python with tenacity

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
def call_payment_service():
    response = requests.get("http://payment-service/api/charge")
    response.raise_for_status()
    return response.json()
```

### Java with Spring Retry

```java
@Retryable(value = {HttpServerErrorException.class},
           maxAttempts = 3,
           backoff = @Backoff(delay = 1000, multiplier = 2))
public PaymentResponse charge(PaymentRequest request) {
    return restTemplate.postForObject(
        "http://payment-service/api/charge",
        request,
        PaymentResponse.class
    );
}
```

### Go with custom retry

```go
func callPaymentService() (*Response, error) {
    var resp *Response
    var err error
    for i := 0; i < 3; i++ {
        resp, err = http.Get("http://payment-service/api/charge")
        if err == nil && resp.StatusCode < 500 {
            return resp, nil
        }
        time.Sleep(time.Duration(math.Pow(2, float64(i))) * time.Second)
    }
    return nil, fmt.Errorf("all retries failed: %w", err)
}
```

## Configuring Retries in Istio

The Istio equivalent is a VirtualService with retry configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            port:
              number: 8080
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: 5xx,reset,connect-failure,retriable-status-codes
        retryRemoteLocalities: true
```

### Understanding the Configuration

- **attempts**: Maximum number of retry attempts (including the original request in some interpretations, check your Istio version)
- **perTryTimeout**: Timeout for each individual attempt
- **retryOn**: Conditions that trigger a retry
- **retryRemoteLocalities**: Whether to retry on endpoints in different localities

### retryOn Conditions

The `retryOn` field accepts these values:

- `5xx` - Retry on any 5xx response
- `gateway-error` - Retry on 502, 503, 504
- `reset` - Retry on connection reset
- `connect-failure` - Retry on connection failure
- `retriable-4xx` - Retry on 409 (conflict)
- `refused-stream` - Retry when upstream refuses the stream
- `retriable-status-codes` - Retry on specific status codes (configured separately)
- `retriable-headers` - Retry based on response headers

You can combine multiple conditions with commas.

## Step-by-Step Migration

### Step 1: Document Current Retry Behavior

Before removing application retries, document what each service does:

| Service | Retry Count | Conditions | Backoff | Timeout |
|---|---|---|---|---|
| payment-client | 3 | 5xx, timeout | exponential 1-10s | 5s |
| order-client | 2 | 5xx | fixed 2s | 10s |
| user-client | 3 | 5xx, connection error | exponential 1-5s | 3s |

### Step 2: Create VirtualService Retries

Create VirtualService resources that match the current retry behavior as closely as possible:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: 5xx,connect-failure,reset
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
      retries:
        attempts: 2
        perTryTimeout: 10s
        retryOn: 5xx
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
    - user-service
  http:
    - route:
        - destination:
            host: user-service
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,connect-failure
```

### Step 3: Deploy with Both Active

Apply the VirtualService retries while the application retries are still in place. This means you will have double retries temporarily, which is not ideal but is safe during a short transition.

```bash
kubectl apply -f virtual-services/
```

Monitor for any issues. If everything looks fine, proceed to remove application retries.

### Step 4: Remove Application-Level Retries

Remove the retry logic from your application code:

```python
# Before
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
def call_payment_service():
    response = requests.get("http://payment-service/api/charge")
    response.raise_for_status()
    return response.json()

# After
def call_payment_service():
    response = requests.get("http://payment-service/api/charge")
    response.raise_for_status()
    return response.json()
```

Deploy the updated code and verify that Istio retries are handling failures correctly.

### Step 5: Monitor Retry Behavior

Check retry metrics in Prometheus:

```
istio_requests_total{response_code="503",destination_service="payment-service.default.svc.cluster.local"}
```

Check Envoy stats for retry counts:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep "retry"
```

Look for:
- `upstream_rq_retry` - Number of retries attempted
- `upstream_rq_retry_success` - Number of successful retries
- `upstream_rq_retry_overflow` - Retries that exceeded the retry budget

## Handling Edge Cases

### Idempotency

Istio retries work best with idempotent operations (GET, DELETE, PUT). For non-idempotent operations (POST), be careful:

```yaml
  http:
    # GET requests can be retried safely
    - match:
        - method:
            exact: GET
      route:
        - destination:
            host: payment-service
      retries:
        attempts: 3
        retryOn: 5xx,connect-failure

    # POST requests should only retry on connection failures
    - match:
        - method:
            exact: POST
      route:
        - destination:
            host: payment-service
      retries:
        attempts: 2
        retryOn: connect-failure,reset
```

### Backoff

Istio uses a default backoff of 25ms with jitter. You can not configure exponential backoff in Istio the way you can in application code. If you need specific backoff behavior, you may need to keep that logic in the application.

### Retry Budgets

To prevent retry storms, configure circuit breaking alongside retries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
    connectionPool:
      http:
        http2MaxRequests: 100
```

This way, if a host keeps failing, it gets ejected from the load balancing pool instead of being retried endlessly.

### Interaction with Application Timeouts

Make sure the overall request timeout in the VirtualService accounts for retries:

```yaml
  http:
    - route:
        - destination:
            host: payment-service
      timeout: 20s  # Total timeout for all attempts
      retries:
        attempts: 3
        perTryTimeout: 5s  # Timeout per attempt
```

Total possible time: 3 attempts * 5s = 15s, which fits within the 20s overall timeout.

Moving retries to Istio simplifies your application code and gives you consistent retry behavior across all services. Start by documenting your current retry patterns, create matching VirtualService configurations, verify they work, and then remove the application-level retry code.
