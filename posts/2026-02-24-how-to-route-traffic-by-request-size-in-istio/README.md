# How to Route Traffic by Request Size in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, EnvoyFilter, Request Size, Kubernetes

Description: Handle large and small HTTP requests differently in Istio by routing based on request body size using EnvoyFilter and header-based strategies.

---

Not all requests are created equal. A small JSON API call and a multi-megabyte file upload have very different resource requirements. You might want to route large requests to a deployment with more memory and CPU, or to a version that streams data instead of buffering it. While Istio's VirtualService does not have a built-in "request size" match field, there are practical ways to achieve size-based routing.

## The Challenge

Istio VirtualService match conditions work on headers, URI, method, source labels, and similar metadata. There is no direct field for matching on the Content-Length header value as a numeric comparison. However, you can work around this using a few approaches:

1. Match on the `Content-Length` header using regex
2. Use a custom header set by your client or API gateway
3. Use an EnvoyFilter for more precise matching

## Approach 1: Matching Content-Length Header with Regex

HTTP clients that send request bodies typically include a `Content-Length` header. You can match on this header's value using regex patterns. This is not a perfect numeric comparison, but it works for rough size categories.

### DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: upload-service-dr
  namespace: default
spec:
  host: upload-service
  subsets:
    - name: standard
      labels:
        version: v1
    - name: large-payload
      labels:
        version: v1-large
```

### VirtualService with Content-Length Matching

Route requests with a Content-Length of 1,000,000 bytes or more (roughly matching 7+ digit numbers) to the large-payload subset:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service-vs
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - headers:
            content-length:
              regex: "[0-9]{7,}"
      route:
        - destination:
            host: upload-service
            subset: large-payload
    - route:
        - destination:
            host: upload-service
            subset: standard
```

The regex `[0-9]{7,}` matches any number with 7 or more digits, which covers values of 1,000,000 and above (approximately 1MB+). This is a rough approximation since `9999999` is about 10MB while `1000000` is 1MB, but for routing purposes, this level of granularity is usually fine.

```bash
kubectl apply -f destination-rule.yaml
kubectl apply -f virtual-service.yaml
```

## Approach 2: Custom Header Strategy

A more reliable approach is to have your client or API gateway set a custom header that categorizes the request size. This gives you clean, exact matching:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service-vs
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - headers:
            x-payload-size:
              exact: "large"
      route:
        - destination:
            host: upload-service
            subset: large-payload
    - match:
        - headers:
            x-payload-size:
              exact: "medium"
      route:
        - destination:
            host: upload-service
            subset: medium-payload
    - route:
        - destination:
            host: upload-service
            subset: standard
```

Your API gateway or client middleware would set the `x-payload-size` header based on the Content-Length:

```python
# Example in a Python API gateway
content_length = int(request.headers.get('Content-Length', 0))
if content_length > 10_000_000:  # 10MB
    request.headers['x-payload-size'] = 'large'
elif content_length > 1_000_000:  # 1MB
    request.headers['x-payload-size'] = 'medium'
else:
    request.headers['x-payload-size'] = 'small'
```

## Approach 3: EnvoyFilter for Lua-Based Routing

For more precise control, you can use an EnvoyFilter with a Lua script that reads the Content-Length header and sets a routing header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-size-classifier
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_OUTBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local content_length = request_handle:headers():get("content-length")
                if content_length then
                  local size = tonumber(content_length)
                  if size and size > 10000000 then
                    request_handle:headers():add("x-size-class", "large")
                  elseif size and size > 1000000 then
                    request_handle:headers():add("x-size-class", "medium")
                  else
                    request_handle:headers():add("x-size-class", "small")
                  end
                else
                  request_handle:headers():add("x-size-class", "unknown")
                end
              end
```

Then route based on the `x-size-class` header set by the Lua filter:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service-vs
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - headers:
            x-size-class:
              exact: "large"
      route:
        - destination:
            host: upload-service
            subset: large-payload
    - match:
        - headers:
            x-size-class:
              exact: "medium"
      route:
        - destination:
            host: upload-service
            subset: medium-payload
    - route:
        - destination:
            host: upload-service
            subset: standard
```

## Configuring the Large Payload Backend

The large-payload backend should be configured to handle big requests. Set appropriate buffer sizes and timeouts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: upload-service-large
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: upload-service
      version: v1-large
  template:
    metadata:
      labels:
        app: upload-service
        version: v1-large
    spec:
      containers:
        - name: upload-service
          image: my-registry/upload-service:1.0
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          ports:
            - containerPort: 8080
```

You might also want to adjust Istio's proxy buffer limits for the large-payload pods using an annotation:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
```

## Setting Timeouts Per Size Class

Large requests naturally take longer. Set appropriate timeouts:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service-vs
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - headers:
            x-size-class:
              exact: "large"
      route:
        - destination:
            host: upload-service
            subset: large-payload
      timeout: 300s
      retries:
        attempts: 1
    - route:
        - destination:
            host: upload-service
            subset: standard
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
```

Large uploads get 5 minutes with no retries (retrying a large upload is usually not desirable). Standard requests get 30 seconds with retries.

## Testing

```bash
# Small request
kubectl exec deploy/sleep -c sleep -- curl -s -X POST -H "Content-Length: 100" -d '{"small":"payload"}' http://upload-service.default.svc.cluster.local/upload

# Large request (simulate with header)
kubectl exec deploy/sleep -c sleep -- curl -s -X POST -H "Content-Length: 15000000" http://upload-service.default.svc.cluster.local/upload

# Check which pod handled it
kubectl logs deploy/upload-service-large -c istio-proxy --tail=5
kubectl logs deploy/upload-service -c istio-proxy --tail=5
```

## Limitations

**Chunked transfer encoding.** When clients use chunked transfer encoding, there is no Content-Length header. The request size is not known upfront, so header-based routing will not work. The request will fall through to the default route.

**Regex is not numeric comparison.** Matching `[0-9]{7,}` is a string pattern match, not a numeric "greater than" comparison. Values like `0000001` (7 digits) would match even though the actual size is 1 byte. In practice, this edge case rarely occurs with real Content-Length values.

**EnvoyFilter stability.** EnvoyFilters are tied to Envoy's internal API. They can break when upgrading Istio versions. Test thoroughly after upgrades.

## Summary

While Istio does not have a native request size matcher, you can achieve size-based routing using Content-Length header regex matching, custom headers from your gateway, or EnvoyFilter with Lua scripts. The custom header approach is the most robust and maintainable, while the regex approach is the simplest for quick implementations. Choose based on how precise you need the size classification to be and how much control you have over the clients making the requests.
