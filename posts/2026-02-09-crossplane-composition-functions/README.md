# How to Implement Crossplane Composition Functions for Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Advanced

Description: Learn how to use Crossplane Composition Functions to implement advanced logic in infrastructure provisioning including conditional resource creation, complex transformations.

---

Composition Functions extend Crossplane Compositions with programmatic logic. While patches handle simple field mappings, functions enable complex scenarios like conditional resource creation, external API calls, and advanced transformations. Functions run as gRPC servers during composition rendering, receiving observed state, desired state, function input, and pipeline context, then returning updated desired state.

Functions make Compositions programmable. Instead of declarative YAML with limited transformation capabilities, you write Go, Python, or any language that implements the function protocol to implement arbitrarily complex provisioning logic. This unlocks use cases like dynamic subnet allocation, conditional security groups based on environment, or integration with external CMDBs.

## Understanding Function Pipeline

Crossplane executes functions in a pipeline:

1. Crossplane observes the Composite Resource and any composed resources
2. Runs each function in sequence
3. Functions receive the current observed state and accumulated desired state, then return modified desired state
4. Crossplane reconciles the final desired state

Each function can add resources, modify existing desired resources, update composite status, or query external systems.

## Installing Function Runtime

Install Crossplane, then install the function packages you want to use. Recent Crossplane releases support composition functions without a separate composition-functions feature flag.

```bash
# Install Crossplane

helm upgrade --install crossplane crossplane-stable/crossplane \
  -n crossplane-system \
  --create-namespace \
  --wait
```

Verify function support:

```bash
kubectl get crd functions.pkg.crossplane.io
```

## Creating a Basic Function

Define a function that adds cloud tags to supported managed resources:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-tag-manager
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-tag-manager:v0.8.2
```

Apply the function:

```bash
kubectl apply -f function.yaml

# Wait for function to become healthy
kubectl wait --for=condition=Healthy function/function-tag-manager --timeout=300s

# Check function status
kubectl get functions
```

## Using Functions in Compositions

Reference functions in composition pipeline:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: bucket-with-functions
spec:
  compositeTypeRef:
    apiVersion: storage.example.com/v1alpha1
    kind: XBucket
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: storage-bucket
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: Bucket
          spec:
            forProvider:
              region: us-west-2
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
  - step: add-tags
    functionRef:
      name: function-tag-manager
    input:
      apiVersion: tag-manager.fn.crossplane.io/v1beta1
      kind: ManagedTags
      addTags:
      - type: FromValue
        policy: Replace
        tags:
          managed-by: crossplane
          team: platform
```

Functions execute in order, each modifying the accumulated desired state.

## Implementing Conditional Logic

Use function-cel-filter for conditional resource creation:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-cel-filter
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-cel-filter:v0.2.0
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: bucket-conditional
spec:
  compositeTypeRef:
    apiVersion: storage.example.com/v1alpha1
    kind: XBucket
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: primary-bucket
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: Bucket
          spec:
            forProvider:
              region: us-west-2
      - name: archive-bucket
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: Bucket
          spec:
            forProvider:
              region: us-west-2
  - step: conditional-resources
    functionRef:
      name: function-cel-filter
    input:
      apiVersion: cel.fn.crossplane.io/v1beta1
      kind: Filters
      filters:
      - name: archive-bucket
        expression: observed.composite.resource.spec.parameters.enableArchive == true
```

The archive bucket only creates when enableArchive is true.

## Building Custom Functions

Create a custom function in Go:

```go
package main

import (
    "context"

    fnv1 "github.com/crossplane/function-sdk-go/proto/v1"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/crossplane/function-sdk-go/resource"
    "github.com/crossplane/function-sdk-go/resource/composed"
    "github.com/crossplane/function-sdk-go/response"
)

type Function struct {
    fnv1.UnimplementedFunctionRunnerServiceServer
}

func (f *Function) RunFunction(_ context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    // Get composite resource
    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Read parameters from composite
    environment, err := xr.Resource.GetString("spec.parameters.environment")
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Determine instance size based on environment
    var instanceClass string
    switch environment {
    case "production":
        instanceClass = "db.r5.2xlarge"
    case "staging":
        instanceClass = "db.t3.large"
    default:
        instanceClass = "db.t3.medium"
    }

    desired, err := request.GetDesiredComposedResources(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Add resource with calculated instance class
    db := composed.New()
    db.SetAPIVersion("database.example.com/v1alpha1")
    db.SetKind("DatabaseInstance")
    db.SetString("spec.engine", "postgres")
    db.SetString("spec.region", "us-west-2")
    db.SetString("spec.instanceClass", instanceClass)

    desired[resource.Name("database-instance")] = &resource.DesiredComposed{Resource: db}

    if err := response.SetDesiredComposedResources(rsp, desired); err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    return rsp, nil
}
```

Package and deploy:

```dockerfile
FROM golang:1.23 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o function .

FROM gcr.io/distroless/static
COPY --from=builder /app/function /function
ENTRYPOINT ["/function"]
```

```bash
# Build the runtime image, then embed it in a Crossplane function package
docker build -t runtime .
crossplane xpkg build \
  --package-root=package \
  --embed-runtime-image=runtime \
  --package-file=my-function.xpkg
crossplane xpkg push -f my-function.xpkg myregistry/my-function:v1
```

Register the function:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: my-custom-function
spec:
  package: myregistry/my-function:v1
```

## Querying External Systems

Create a function that fetches data from external APIs:

```go
func (f *Function) RunFunction(_ context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    desired, err := request.GetDesiredComposedResources(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Query external CMDB for network configuration
    httpClient := &http.Client{Timeout: 10 * time.Second}
    resp, err := httpClient.Get("https://cmdb.example.com/api/networks")
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }
    defer resp.Body.Close()

    var networks []Network
    if err := json.NewDecoder(resp.Body).Decode(&networks); err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Use fetched data to configure resources
    for _, network := range networks {
        subnet := composed.New()
        subnet.SetAPIVersion("network.example.com/v1alpha1")
        subnet.SetKind("Subnet")
        subnet.SetString("spec.cidrBlock", network.CIDR)
        subnet.SetString("spec.vpcID", network.VpcID)

        desired[resource.Name("subnet-"+network.ID)] = &resource.DesiredComposed{Resource: subnet}
    }

    if err := response.SetDesiredComposedResources(rsp, desired); err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    return rsp, nil
}
```

This enables dynamic infrastructure based on external state.

## Implementing Auto-Generated Naming

Create a function for consistent resource naming:

```go
func (f *Function) RunFunction(_ context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    desired, err := request.GetDesiredComposedResources(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Extract metadata
    namespace := xr.Resource.GetNamespace()
    name := xr.Resource.GetName()
    environment, err := xr.Resource.GetString("spec.parameters.environment")
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Generate consistent names
    bucketName := fmt.Sprintf("%s-%s-%s-data", environment, namespace, name)
    dbName := fmt.Sprintf("%s_%s_%s_db", environment, namespace, name)

    // Create S3 bucket with generated name
    bucket := composed.New()
    bucket.SetAPIVersion("s3.aws.m.upbound.io/v1beta1")
    bucket.SetKind("Bucket")
    bucket.SetAnnotations(map[string]string{"crossplane.io/external-name": bucketName})

    // Create database with generated name
    database := composed.New()
    database.SetAPIVersion("database.example.com/v1alpha1")
    database.SetKind("DatabaseInstance")
    database.SetString("spec.dbName", dbName)

    desired[resource.Name("storage-bucket")] = &resource.DesiredComposed{Resource: bucket}
    desired[resource.Name("database")] = &resource.DesiredComposed{Resource: database}

    if err := response.SetDesiredComposedResources(rsp, desired); err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    return rsp, nil
}
```

## Composing Multiple Functions

Chain functions for complex workflows:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: multi-function-pipeline
spec:
  compositeTypeRef:
    apiVersion: example.org/v1alpha1
    kind: XPlatformResource
  mode: Pipeline
  pipeline:
  - step: generate-names
    functionRef:
      name: function-auto-naming
  - step: fetch-network-config
    functionRef:
      name: function-network-lookup
  - step: conditional-resources
    functionRef:
      name: function-cel-filter
  - step: add-tags
    functionRef:
      name: function-tag-manager
  - step: validate
    functionRef:
      name: function-validate
```

Each function processes output from the previous function.

## Testing Functions Locally

Test functions before deployment:

```bash
# Run the function locally in development mode
go run . --insecure
```

```yaml
# In functions.yaml, tell the Crossplane CLI to use the local function runtime
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: my-custom-function
  annotations:
    render.crossplane.io/runtime: Development
spec:
  package: myregistry/my-function:v1
```

```bash
# Render the XR and Composition locally
crossplane composition render xr.yaml composition.yaml functions.yaml
```

## Monitoring Function Execution

Track function performance:

```bash
# Check function pod logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/function=my-custom-function

# Monitor composition failures
kubectl get events --all-namespaces --field-selector reason=ComposeResources

# Check function health
kubectl get functions
kubectl describe function my-custom-function
```

Create alerts for function failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: function-alerts
spec:
  groups:
  - name: composition-functions
    rules:
    - alert: FunctionResponsesMissing
      expr: |
        increase(function_run_function_request_total[5m]) > increase(function_run_function_response_total[5m])
      labels:
        severity: warning
      annotations:
        summary: "Crossplane sent more function requests than it received responses for"
```

## Conclusion

Composition Functions transform Crossplane from declarative infrastructure management into a programmable platform. By implementing custom functions for conditional logic, external integrations, and complex transformations, you handle scenarios impossible with standard patches. Functions enable truly dynamic infrastructure provisioning while maintaining the declarative interface that makes Crossplane powerful.
