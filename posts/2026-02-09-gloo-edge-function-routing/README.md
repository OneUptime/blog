# How to Deploy Gloo Edge API Gateway with Function Routing Capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gloo, API Gateway, Kubernetes

Description: Learn how to deploy Gloo Edge with function-level routing that enables direct invocation of serverless functions and microservice methods through intelligent API Gateway routing.

---

Gloo Edge differentiates itself from traditional API Gateways through function-level routing, where the gateway understands and routes to specific functions within services rather than just endpoints. Built on Envoy Proxy, Gloo discovers service functions automatically and enables direct routing to AWS Lambda functions or methods in REST and gRPC services.

## Understanding Function Routing

Traditional gateways route to service endpoints like `/api/users`. Gloo Edge routes to specific functions like `getUser(id)`, `createOrder(data)`, or `processPayment(amount)`. This approach:

- Reduces boilerplate routing code in services
- Enables intelligent request transformation at the gateway
- Supports serverless and service function invocation
- Provides unified API for heterogeneous backends

Gloo discovers functions through:
- OpenAPI/Swagger specifications
- gRPC reflection
- AWS Lambda introspection

## Installing Gloo Edge

Deploy Gloo using the CLI:

```bash
# Install glooctl CLI

curl -sL https://run.solo.io/gloo/install | sh
export PATH=$HOME/.gloo/bin:$PATH

# Install Gloo Edge to Kubernetes
glooctl install gateway --version 1.21.0
```

Or use Helm:

```bash
helm repo add gloo https://storage.googleapis.com/solo-public-helm
helm repo update

helm install gloo gloo/gloo \
  --namespace gloo-system \
  --create-namespace \
  --set crds.create=true
```

Verify installation:

```bash
kubectl get pods -n gloo-system
glooctl check
```

## Function Discovery for REST APIs

Deploy a service with OpenAPI spec:

```yaml
# user-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: default
  annotations:
    gloo.solo.io/upstream_config: '{"kube":{"serviceSpec":{"rest":{"swaggerInfo":{"url":"http://user-service.default.svc.cluster.local:8080/swagger.json"}}}}}'
spec:
  selector:
    app: user-service
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: user-service:v1
        ports:
        - containerPort: 8080
```

Gloo automatically discovers functions from the OpenAPI spec:

```bash
# View discovered upstream
kubectl get upstream default-user-service-8080 -n gloo-system -o yaml

# Functions are listed in the spec
# spec:
#   kube:
#     serviceName: user-service
#     serviceNamespace: default
#     servicePort: 8080
#     serviceSpec:
#       rest:
#         swaggerInfo:
#           url: http://user-service.default.svc.cluster.local:8080/swagger.json
#         transformations:
#           getUser:
#             headers:
#               :method:
#                 text: GET
#               :path:
#                 text: /users/{{ default(id, "") }}
#           createUser:
#             headers:
#               :method:
#                 text: POST
#               :path:
#                 text: /users
```

## Creating Function-Level Routes

Route directly to discovered functions:

```yaml
# function-route.yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: user-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    # Route to getUser function
    - matchers:
      - prefix: /api/users/
        methods:
        - GET
      routeAction:
        single:
          upstream:
            name: default-user-service-8080
            namespace: gloo-system
          destinationSpec:
            rest:
              functionName: getUser
              parameters:
                headers:
                  :path: /api/users/{id}

    # Route to createUser function
    - matchers:
      - prefix: /api/users
        methods:
        - POST
      routeAction:
        single:
          upstream:
            name: default-user-service-8080
            namespace: gloo-system
          destinationSpec:
            rest:
              functionName: createUser
```

## Routing to AWS Lambda Functions

Configure AWS credentials:

```bash
glooctl create secret aws \
  --name aws-creds \
  --namespace gloo-system \
  --access-key $AWS_ACCESS_KEY_ID \
  --secret-key $AWS_SECRET_ACCESS_KEY
```

Create upstream for Lambda:

```yaml
# lambda-upstream.yaml
apiVersion: gloo.solo.io/v1
kind: Upstream
metadata:
  name: lambda-functions
  namespace: gloo-system
spec:
  aws:
    region: us-east-1
    secretRef:
      name: aws-creds
      namespace: gloo-system
    lambdaFunctions:
    - lambdaFunctionName: processPayment
      logicalName: processPayment
      qualifier: $LATEST
    - lambdaFunctionName: sendNotification
      logicalName: sendNotification
```

Route to Lambda functions:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: lambda-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - 'api.example.com'
    routes:
    - matchers:
      - prefix: /payment
      routeAction:
        single:
          upstream:
            name: lambda-functions
            namespace: gloo-system
          destinationSpec:
            aws:
              logicalName: processPayment
              requestTransformation: true

    - matchers:
      - prefix: /notify
      routeAction:
        single:
          upstream:
            name: lambda-functions
            namespace: gloo-system
          destinationSpec:
            aws:
              logicalName: sendNotification
```

## gRPC Function Routing

Deploy gRPC service with reflection enabled:

```yaml
# grpc-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
spec:
  selector:
    app: grpc-service
  ports:
  - port: 9000
    targetPort: 9000
    name: grpc
```

Gloo discovers gRPC methods via reflection:

```bash
# View discovered gRPC functions
kubectl get upstream default-grpc-service-9000 -n gloo-system -o yaml

# spec:
#   kube:
#     serviceSpec:
#       grpc:
#         descriptors: <base64-encoded-proto>
#         grpcServices:
#         - packageName: orders
#           serviceName: OrderService
#           functionNames:
#           - CreateOrder
```

Route to gRPC methods:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: grpc-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /orders/create
      routeAction:
        single:
          upstream:
            name: default-grpc-service-9000
            namespace: gloo-system
          destinationSpec:
            grpc:
              package: orders
              service: OrderService
              function: CreateOrder
```

## Request Transformation

Transform REST requests to function parameters:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: transformed-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /api/users
      routeAction:
        single:
          upstream:
            name: default-user-service-8080
            namespace: gloo-system
          destinationSpec:
            rest:
              functionName: getUser
              parameters:
                headers:
                  :path: /api/users/{id}
```

Advanced transformations with templates:

```yaml
routes:
- matchers:
  - prefix: /search
  options:
    prefixRewrite: /api/v1/search
  routeAction:
    single:
      upstream:
        name: search-service
        namespace: gloo-system
  options:
    stagedTransformations:
      regular:
        requestTransforms:
        - requestTransformation:
            transformationTemplate:
              headers:
                x-custom-header:
                  text: "{{ header(\"user-agent\") }}"
              body:
                text: |
                  {
                    "query": "{{ q }}",
                    "filters": {{ filters }}
                  }
```

## Routing Across Multiple Functions

Split requests across multiple backend functions with weighted routing:

```yaml
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: weighted-function-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /dashboard
      routeAction:
        multi:
          destinations:
          - weight: 8
            destination:
              upstream:
                name: user-service
                namespace: gloo-system
              destinationSpec:
                rest:
                  functionName: getUser
          - weight: 2
            destination:
              upstream:
                name: order-service
                namespace: gloo-system
              destinationSpec:
                rest:
                  functionName: getOrders
```

## Rate Limiting per Function

Apply rate limits to specific functions with Gloo Gateway Enterprise by matching descriptor actions on routes:

```yaml
apiVersion: ratelimit.solo.io/v1alpha1
kind: RateLimitConfig
metadata:
  name: function-rate-limits
  namespace: gloo-system
spec:
  raw:
    descriptors:
    - key: generic_key
      value: getUser
      rateLimit:
        requestsPerUnit: 100
        unit: MINUTE
    rateLimits:
    - actions:
      - genericKey:
          descriptorValue: getUser
---
apiVersion: gateway.solo.io/v1
kind: VirtualService
metadata:
  name: user-api
  namespace: gloo-system
spec:
  virtualHost:
    domains:
    - '*'
    routes:
    - matchers:
      - prefix: /api/users/
        methods:
        - GET
      options:
        rateLimitConfigs:
          refs:
          - name: function-rate-limits
            namespace: gloo-system
      routeAction:
        single:
          upstream:
            name: default-user-service-8080
            namespace: gloo-system
          destinationSpec:
            rest:
              functionName: getUser
```

## Testing Function Routing

Test the configured routes:

```bash
# Get gateway proxy IP
GLOO_PROXY=$(kubectl get svc gateway-proxy -n gloo-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Call getUser function
curl http://${GLOO_PROXY}/api/users/123

# Call AWS Lambda function
curl -X POST http://${GLOO_PROXY}/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "currency": "USD"}'

# Call the gRPC function through the configured route
curl -X POST http://${GLOO_PROXY}/orders/create \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "item-1", "quantity": 2}]}'
```

## Monitoring Function Metrics

Gloo Gateway exposes Envoy metrics from the gateway proxy. For Open Source installations, scrape the Envoy metrics endpoint with your Prometheus deployment; Enterprise installations can also generate Grafana dashboards for upstreams.

```yaml
apiVersion: gloo.solo.io/v1
kind: Settings
metadata:
  name: default
  namespace: gloo-system
spec:
  observabilityOptions:
    grafanaIntegration:
      dashboardPrefix: functions
```

Query upstream-level metrics:

```promql
# Request rate per upstream
rate(envoy_cluster_upstream_rq_total{envoy_cluster_name=~".*user-service.*"}[5m])

# Upstream latency
histogram_quantile(0.99,
  rate(envoy_cluster_upstream_rq_time_bucket{envoy_cluster_name=~".*user-service.*"}[5m])
)
```

## Best Practices

**Enable function discovery** - Use OpenAPI specs and gRPC reflection for automatic discovery.

**Version functions explicitly** - Include version qualifiers when routing to Lambda functions.

**Cache function metadata** - Keep discovered service specs stable and review changes before production rollout.

**Monitor upstream metrics** - Track latency and error rates for upstreams that represent your routed functions.

**Use transformation templates** - Leverage Gloo's transformation capabilities to adapt requests to function signatures.

**Test function routing** - Verify that discovered functions match expected service APIs.

**Implement circuit breakers** - Protect function upstreams from overload with circuit breakers.

## Conclusion

Gloo Edge's function routing capability transforms API Gateway architecture from endpoint-based to function-based routing. By understanding service internals through OpenAPI specs, gRPC reflection, and Lambda function metadata, Gloo enables intelligent request routing that reduces boilerplate code and enables sophisticated API compositions. This approach is particularly powerful for microservices architectures mixing REST, gRPC, and serverless functions, providing a unified API layer that abstracts backend implementation details while maintaining high performance through Envoy's proven proxy capabilities.
