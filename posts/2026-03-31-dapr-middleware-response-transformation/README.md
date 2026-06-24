# How to Use Middleware for Response Transformation in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Response Transformation, Microservice, HTTP

Description: Learn how to use Dapr middleware components to transform HTTP responses in your microservices pipeline, including practical examples with custom transformations.

---

## What Is Response Transformation Middleware in Dapr?

Dapr middleware sits in the HTTP pipeline and processes incoming requests before they reach your application. Most built-in middleware components operate on requests (e.g., adding headers, validating tokens), while custom WASM middleware can also manipulate responses. Middleware is useful for tasks like adding authorization headers, validating tokens, converting formats, or injecting metadata without modifying application code.

Dapr middleware components are defined as components and referenced in a `Configuration` resource. Each middleware component is chained in the order defined.

## Defining an HTTP Middleware Component

To add middleware to the pipeline, you define a middleware component. Dapr supports HTTP middleware via the component type `middleware.http.*`. For custom logic, you can use the `middleware.http.wasm` component or build a custom middleware using Dapr's pluggable component SDK.

Here is an example using the `uppercase` demo middleware, which converts the request body to uppercase:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: response-transformer
  namespace: default
spec:
  type: middleware.http.uppercase
  version: v1
  metadata: []
```

## Attaching Middleware to the Pipeline via Configuration

Once the component is defined, reference it in a Dapr `Configuration` object under `httpPipeline`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline-config
  namespace: default
spec:
  httpPipeline:
    handlers:
      - name: response-transformer
        type: middleware.http.uppercase
```

Apply this configuration:

```bash
kubectl apply -f response-transformer.yaml
kubectl apply -f pipeline-config.yaml
```

Annotate your application pod to use this configuration:

```yaml
annotations:
  dapr.io/config: "pipeline-config"
```

## Using the OAuth2 Middleware for Request Token Enrichment

A practical middleware use case is injecting OAuth2 tokens into outgoing requests. The `oauth2clientcredentials` middleware automatically obtains a client credentials token and attaches it to the request header before it reaches the upstream service. Here is the configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-enricher
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
    - name: clientId
      value: "my-client-id"
    - name: clientSecret
      secretKeyRef:
        name: oauth-secret
        key: clientSecret
    - name: tokenURL
      value: "https://auth.example.com/oauth/token"
    - name: scopes
      value: "api.read"
    - name: headerName
      value: "Authorization"
```

## Building a Custom WASM Middleware for Response Transformation

For fully custom response body transformation, Dapr supports WebAssembly (WASM) middleware. Write your transform logic in TinyGo or Rust, compile it to WASM, and reference the binary:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: wasm-transformer
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
    - name: url
      value: "file:///app/transforms/response-transform.wasm"
```

Compile your Go transform logic:

```bash
tinygo build -o response-transform.wasm -scheduler=none --no-debug \
  -target=wasi ./middleware/response_transform.go
```

## Verifying Middleware Is Applied

After deploying, test your endpoint and inspect response headers:

```bash
curl -v http://localhost:3500/v1.0/invoke/my-app/method/data
```

Look for your injected or modified headers in the response. You can also enable Dapr debug logging:

```bash
dapr run --app-id myapp --log-level debug -- ./myapp
```

## Summary

Dapr middleware enables request and response transformation without changing application code by chaining handlers in an HTTP pipeline. Built-in components like OAuth2 handle request enrichment (e.g., injecting authorization tokens), while custom WASM modules support full request and response body transformation. Apply the pipeline via a `Configuration` resource and reference it in your pod annotations.
