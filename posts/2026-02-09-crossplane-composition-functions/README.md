# How to Implement Crossplane Composition Functions for Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Advanced

Description: Learn how to use Crossplane Composition Functions to implement advanced logic in infrastructure provisioning including conditional resource creation, complex transformations, and external data sources.

---

Composition Functions extend Crossplane Compositions with programmatic logic. While patches handle simple field mappings, functions enable complex scenarios like conditional resource creation, external API calls, and advanced transformations. Functions run as containers during composition rendering, receiving desired state and returning modified state with additional resources or changed configurations.

Functions make Compositions programmable. Instead of declarative YAML with limited transformation capabilities, you write Go, Python, or any language to implement arbitrarily complex provisioning logic. This unlocks use cases like dynamic subnet allocation, conditional security groups based on environment, or integration with external CMDBs.

## Understanding Function Pipeline

Crossplane executes functions in a pipeline:

1. Crossplane reads the Composite Resource
2. Runs each function in sequence
3. Functions receive current state and return modified state
4. Crossplane reconciles the final state

Each function can add resources, modify existing ones, or query external systems.

## Installing Function Runtime

Enable function support in Crossplane:

```bash
# Install Crossplane with functions enabled
helm upgrade crossplane crossplane-stable/crossplane \
  -n crossplane-system \
  --set args='{--enable-composition-functions}' \
  --wait
```

Verify function support:

```bash
kubectl get crd functions.pkg.crossplane.io
```

## Creating a Basic Function

Define a function that adds labels to resources:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: Function
metadata:
  name: function-add-labels
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-add-labels:v0.1.0
```

Apply the function:

```bash
kubectl apply -f function.yaml

# Wait for function to become healthy
kubectl wait --for=condition=Healthy function/function-add-labels --timeout=300s

# Check function status
kubectl get functions
```

## Using Functions in Compositions

Reference functions in composition pipeline:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-with-functions
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: rds-instance
        base:
          apiVersion: database.aws.crossplane.io/v1beta1
          kind: RDSInstance
          spec:
            forProvider:
              region: us-west-2
              engine: postgres
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
  - step: add-tags
    functionRef:
      name: function-add-labels
    input:
      apiVersion: meta.fn.crossplane.io/v1alpha1
      kind: Input
      labels:
        managed-by: crossplane
        team: platform
```

Functions execute in order, each modifying the resource state.

## Implementing Conditional Logic

Use function-cond for conditional resource creation:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: Function
metadata:
  name: function-cond
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-cond:v0.1.0
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-conditional
spec:
  mode: Pipeline
  pipeline:
  - step: conditional-resources
    functionRef:
      name: function-cond
    input:
      apiVersion: cond.fn.crossplane.io/v1beta1
      kind: Input
      conditions:
      - condition: spec.parameters.highAvailability
        resources:
        - name: read-replica
          base:
            apiVersion: database.aws.crossplane.io/v1beta1
            kind: RDSInstance
            spec:
              forProvider:
                replicateSourceDB: rds-instance
                region: us-west-2
```

The read replica only creates when highAvailability is true.

## Building Custom Functions

Create a custom function in Go:

```go
package main

import (
    "context"
    "fmt"

    "github.com/crossplane/function-sdk-go/proto/v1beta1"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/crossplane/function-sdk-go/response"
)

type Function struct{}

func (f *Function) RunFunction(ctx context.Context, req *v1beta1.RunFunctionRequest) (*v1beta1.RunFunctionResponse, error) {
    // Get composite resource
    composite := req.GetObserved().GetComposite().GetResource()

    // Create response
    rsp := response.To(req, response.DefaultTTL)

    // Read parameters from composite
    params, err := composite.GetFieldPath("spec.parameters")
    if err != nil {
        return rsp, err
    }

    environment := params.(map[string]interface{})["environment"].(string)

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

    // Add resource with calculated instance class
    rsp.AddDesiredComposedResource(&v1beta1.Resource{
        Name: "rds-instance",
        Resource: map[string]interface{}{
            "apiVersion": "database.aws.crossplane.io/v1beta1",
            "kind":       "RDSInstance",
            "spec": map[string]interface{}{
                "forProvider": map[string]interface{}{
                    "dbInstanceClass": instanceClass,
                    "engine":          "postgres",
                    "region":          "us-west-2",
                },
            },
        },
    })

    return rsp, nil
}

func main() {
    server.Serve(&Function{})
}
```

Package and deploy:

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o function .

FROM gcr.io/distroless/static
COPY --from=builder /app/function /function
ENTRYPOINT ["/function"]
```

```bash
# Build and push
docker build -t myregistry/my-function:v1 .
docker push myregistry/my-function:v1
```

Register the function:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: Function
metadata:
  name: my-custom-function
spec:
  package: myregistry/my-function:v1
```

## Querying External Systems

Create a function that fetches data from external APIs:

```go
func (f *Function) RunFunction(ctx context.Context, req *v1beta1.RunFunctionRequest) (*v1beta1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    // Query external CMDB for network configuration
    httpClient := &http.Client{Timeout: 10 * time.Second}
    resp, err := httpClient.Get("https://cmdb.example.com/api/networks")
    if err != nil {
        return rsp, err
    }
    defer resp.Body.Close()

    var networks []Network
    if err := json.NewDecoder(resp.Body).Decode(&networks); err != nil {
        return rsp, err
    }

    // Use fetched data to configure resources
    for _, network := range networks {
        rsp.AddDesiredComposedResource(&v1beta1.Resource{
            Name: fmt.Sprintf("subnet-%s", network.ID),
            Resource: map[string]interface{}{
                "apiVersion": "ec2.aws.crossplane.io/v1beta1",
                "kind":       "Subnet",
                "spec": map[string]interface{}{
                    "forProvider": map[string]interface{}{
                        "cidrBlock": network.CIDR,
                        "vpcId":     network.VpcID,
                    },
                },
            },
        })
    }

    return rsp, nil
}
```

This enables dynamic infrastructure based on external state.

## Implementing Auto-Generated Naming

Create a function for consistent resource naming:

```go
func (f *Function) RunFunction(ctx context.Context, req *v1beta1.RunFunctionRequest) (*v1beta1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    composite := req.GetObserved().GetComposite().GetResource()

    // Extract metadata
    namespace := composite.GetString("metadata.namespace")
    name := composite.GetString("metadata.name")
    environment := composite.GetString("spec.parameters.environment")

    // Generate consistent names
    bucketName := fmt.Sprintf("%s-%s-%s-data", environment, namespace, name)
    dbName := fmt.Sprintf("%s_%s_%s_db", environment, namespace, name)

    // Create S3 bucket with generated name
    rsp.AddDesiredComposedResource(&v1beta1.Resource{
        Name: "storage-bucket",
        Resource: map[string]interface{}{
            "apiVersion": "s3.aws.crossplane.io/v1beta1",
            "kind":       "Bucket",
            "metadata": map[string]interface{}{
                "name": bucketName,
            },
        },
    })

    // Create database with generated name
    rsp.AddDesiredComposedResource(&v1beta1.Resource{
        Name: "database",
        Resource: map[string]interface{}{
            "apiVersion": "database.aws.crossplane.io/v1beta1",
            "kind":       "RDSInstance",
            "spec": map[string]interface{}{
                "forProvider": map[string]interface{}{
                    "dbName": dbName,
                },
            },
        },
    })

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
      name: function-cond
  - step: add-labels
    functionRef:
      name: function-add-labels
  - step: validate
    functionRef:
      name: function-validate
```

Each function processes output from the previous function.

## Testing Functions Locally

Test functions before deployment:

```bash
# Create test input
cat > test-input.yaml <<EOF
apiVersion: v1beta1
kind: RunFunctionRequest
observed:
  composite:
    resource:
      apiVersion: database.example.com/v1alpha1
      kind: XPostgreSQLInstance
      metadata:
        name: test-db
      spec:
        parameters:
          environment: production
          storageGB: 100
EOF

# Run function locally
cat test-input.yaml | docker run -i myregistry/my-function:v1
```

## Monitoring Function Execution

Track function performance:

```bash
# Check function pod logs
kubectl logs -n crossplane-system -l pkg.crossplane.io/function=my-custom-function

# Monitor function execution time
kubectl get events --all-namespaces --field-selector reason=ComposeFailed

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
    - alert: FunctionExecutionFailure
      expr: |
        rate(crossplane_function_execution_errors_total[5m]) > 0
      labels:
        severity: warning
      annotations:
        summary: "Function {{ $labels.function }} failing"
```

## Conclusion

Composition Functions transform Crossplane from declarative infrastructure management into a programmable platform. By implementing custom functions for conditional logic, external integrations, and complex transformations, you handle scenarios impossible with standard patches. Functions enable truly dynamic infrastructure provisioning while maintaining the declarative interface that makes Crossplane powerful.
