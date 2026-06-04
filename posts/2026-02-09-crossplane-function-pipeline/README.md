# How to Build a Crossplane Function Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Infrastructure as Code, Cloud Native, Platform Engineering

Description: Learn how to build Crossplane Composition Functions pipelines to implement complex resource transformation logic that goes beyond what patches can achieve.

---

Crossplane Compositions use patches to transform input parameters into cloud resources, but patches hit limitations quickly with complex logic. Composition Functions solve this by running custom code during resource composition, enabling sophisticated transformations, validations, and integrations. This guide shows you how to build function pipelines for advanced use cases.

## Understanding Composition Functions

Composition Functions run as gRPC services that receive composition requests and return desired state. Crossplane invokes functions in pipeline order, passing the desired state accumulated by each function to the next. Functions can add or update desired composed resources, update composite resource status, validate inputs, or call external APIs.

Unlike patches which use declarative transformations, functions execute arbitrary code. This enables implementing business logic, performing calculations, querying databases, or integrating with external systems. Functions receive the observed composite resource, observed composed resources, desired state, pipeline context, and optional input. They can make decisions based on complex criteria, but they must return any desired state they want Crossplane to keep.

## Setting Up the Function Pipeline

Configure a Composition to use functions instead of traditional patch-based composition.

```yaml
# composition-with-functions.yaml

apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-functions
  labels:
    type: postgresql
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XDatabase

  # Use pipeline mode instead of legacy patch mode
  mode: Pipeline

  pipeline:
  # First function validates inputs and sets defaults
  - step: validate-and-default
    functionRef:
      name: function-validator
    input:
      apiVersion: validator.fn.crossplane.io/v1beta1
      kind: ValidationConfig
      rules:
        - field: spec.parameters.size
          required: true
          enum: ["small", "medium", "large"]
        - field: spec.parameters.region
          required: true
          pattern: "^(us|eu|ap)-[a-z]+-[0-9]$"

  # Second function performs resource calculations
  - step: calculate-resources
    functionRef:
      name: function-resource-calculator
    input:
      apiVersion: calculator.fn.crossplane.io/v1beta1
      kind: CalculatorConfig
      sizeMultiplier: 2
      baseStorage: 20

  # Third function generates actual cloud resources
  - step: create-resources
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: rds-instance
        base:
          apiVersion: rds.aws.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              region: us-west-2
              engine: postgres
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: status.calculatedStorage
          toFieldPath: spec.forProvider.allocatedStorage

  # Final function handles post-creation tasks
  - step: register-database
    functionRef:
      name: function-database-registry
    input:
      apiVersion: registry.fn.crossplane.io/v1beta1
      kind: RegistryConfig
      endpoint: https://registry.example.com
      registerOnCreate: true
```

This pipeline runs four functions sequentially, each building on the previous function's output.

## Building a Custom Validation Function

Create a function that validates and enriches composition requests before resource creation.

```go
// function-validator/main.go
package main

import (
    "context"
    "fmt"
    "regexp"

    function "github.com/crossplane/function-sdk-go"
    "github.com/crossplane/function-sdk-go/errors"
    "github.com/crossplane/function-sdk-go/logging"
    fnv1 "github.com/crossplane/function-sdk-go/proto/v1"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/crossplane/function-sdk-go/response"
)

type Function struct {
    fnv1.UnimplementedFunctionRunnerServiceServer
    log logging.Logger
}

func (f *Function) RunFunction(ctx context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    log := f.log.WithValues("tag", req.GetMeta().GetTag())
    log.Info("Running validation function")

    rsp := response.To(req, response.DefaultTTL)

    // Get the composite resource
    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, errors.Wrapf(err, "cannot get observed composite resource from %T", req))
        return rsp, nil
    }

    // Extract parameters
    size, err := xr.Resource.GetString("spec.parameters.size")
    if err != nil {
        response.Fatal(rsp, fmt.Errorf("missing required field: spec.parameters.size"))
        return rsp, nil
    }

    region, err := xr.Resource.GetString("spec.parameters.region")
    if err != nil {
        response.Fatal(rsp, fmt.Errorf("missing required field: spec.parameters.region"))
        return rsp, nil
    }

    // Validate size
    validSizes := map[string]bool{"small": true, "medium": true, "large": true}
    if !validSizes[size] {
        response.Fatal(rsp, fmt.Errorf("invalid size: %s. Must be small, medium, or large", size))
        return rsp, nil
    }

    // Validate region format
    if !isValidRegion(region) {
        response.Fatal(rsp, fmt.Errorf("invalid region format: %s", region))
        return rsp, nil
    }

    // Add default values if not specified
    backupEnabled, err := xr.Resource.GetBool("spec.parameters.backupEnabled")
    if err != nil {
        backupEnabled = true
        log.Info("Using default backupEnabled=true")
    }

    // Functions can update the desired composite resource status, but not its spec or metadata.
    dxr, err := request.GetDesiredCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, errors.Wrapf(err, "cannot get desired composite resource from %T", req))
        return rsp, nil
    }

    dxr.Resource.SetBool("status.effectiveBackupEnabled", backupEnabled)
    dxr.Resource.SetString("status.validationState", "Passed")

    // Store the desired composite status
    if err := response.SetDesiredCompositeResource(rsp, dxr); err != nil {
        response.Fatal(rsp, errors.Wrap(err, "cannot set desired composite resource"))
        return rsp, nil
    }

    response.Normal(rsp, "Validation passed successfully").TargetComposite()

    return rsp, nil
}

func isValidRegion(region string) bool {
    // Simple regex validation for region format
    matched, _ := regexp.MatchString(`^(us|eu|ap)-[a-z]+-[0-9]$`, region)
    return matched
}

func main() {
    log, err := function.NewLogger(true)
    if err != nil {
        panic(err)
    }

    if err := function.Serve(&Function{log: log}); err != nil {
        panic(err)
    }
}
```

Package this as a Crossplane Function package and install it in your cluster for Crossplane to invoke.

## Implementing Resource Calculation Logic

Build a function that performs complex calculations based on input parameters.

```python
# function-calculator/function/fn.py
import json
import math
from typing import Dict, Any
import grpc
from crossplane.function import logging, resource, response
from crossplane.function.proto.v1 import run_function_pb2 as fnv1
from crossplane.function.proto.v1 import run_function_pb2_grpc as grpcv1

class FunctionRunner(grpcv1.FunctionRunnerService):
    def __init__(self):
        self.log = logging.get_logger()

    async def RunFunction(
        self, req: fnv1.RunFunctionRequest, _: grpc.aio.ServicerContext
    ) -> fnv1.RunFunctionResponse:
        """Calculate resource specifications based on size parameter"""

        rsp = response.to(req)

        # Get observed composite resource
        xr = req.observed.composite.resource

        # Get configuration from function input
        config = req.input
        size_multiplier = config.get("sizeMultiplier", 1)
        base_storage = config.get("baseStorage", 20)

        # Get size parameter
        size = xr["spec"]["parameters"]["size"]

        # Calculate resources based on size
        specs = self._calculate_specs(size, size_multiplier, base_storage)

        # Store calculated values in status for use by subsequent functions
        resource.update_status(
            rsp.desired.composite,
            {
                "calculatedStorage": specs["storage"],
                "calculatedMemory": specs["memory"],
                "calculatedCpu": specs["cpu"],
                "calculatedIops": specs["iops"],
            },
        )

        # Add informational result
        response.normal(rsp, f"Calculated resources for {size} tier: {json.dumps(specs)}")

        return rsp

    def _calculate_specs(self, size: str, multiplier: float, base: int) -> Dict[str, Any]:
        """Calculate resource specifications"""

        # Define base values per size
        size_map = {
            "small": {"factor": 1, "cpu": 2, "memory": 4},
            "medium": {"factor": 4, "cpu": 4, "memory": 16},
            "large": {"factor": 16, "cpu": 8, "memory": 64}
        }

        tier = size_map.get(size, size_map["small"])

        return {
            "storage": int(base * tier["factor"] * multiplier),
            "memory": tier["memory"],
            "cpu": tier["cpu"],
            "iops": int(math.ceil(base * tier["factor"] * 50))  # 50 IOPS per GB
        }
```

This function performs calculations that would be impossible with simple patches.

## Creating External Integration Functions

Build functions that integrate with external systems during composition.

```go
// function-registry/fn.go
type Registration struct {
    ID        string
    Timestamp string
}

func (f *Function) RunFunction(ctx context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, errors.Wrapf(err, "cannot get observed composite resource from %T", req))
        return rsp, nil
    }

    endpoint, err := xr.Resource.GetString("spec.parameters.registryEndpoint")
    if err != nil {
        response.Warning(rsp, errors.Wrap(err, "registry endpoint not configured"))
        return rsp, nil
    }

    // Avoid repeating the external side effect on every reconcile.
    if _, err := xr.Resource.GetString("status.registrationId"); err == nil {
        return rsp, nil
    }

    databaseName := xr.Resource.GetName()
    registration, err := registerDatabase(ctx, endpoint, databaseName)
    if err != nil {
        response.Warning(rsp, errors.Wrap(err, "cannot register database"))
        return rsp, nil
    }

    dxr, err := request.GetDesiredCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, errors.Wrapf(err, "cannot get desired composite resource from %T", req))
        return rsp, nil
    }

    dxr.Resource.SetString("status.registrationId", registration.ID)
    dxr.Resource.SetString("status.registeredAt", registration.Timestamp)

    if err := response.SetDesiredCompositeResource(rsp, dxr); err != nil {
        response.Fatal(rsp, errors.Wrap(err, "cannot set desired composite resource"))
        return rsp, nil
    }

    response.Normalf(rsp, "Registered database in external registry: %s", registration.ID).TargetComposite()
    return rsp, nil
}

func registerDatabase(ctx context.Context, endpoint, databaseName string) (*Registration, error) {
    // Use an HTTP client here to call an idempotent create-or-get endpoint.
    return &Registration{ID: databaseName, Timestamp: time.Now().Format(time.RFC3339)}, nil
}
```

This function calls an external API and records the result in composite resource status. External integrations should be idempotent because Crossplane may call a function repeatedly during reconciliation.

## Handling Conditional Resource Creation

Use functions to conditionally create resources based on complex logic.

```go
// function-conditional-resources/main.go
func (f *Function) RunFunction(ctx context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Get existing desired resources
    desired, err := request.GetDesiredComposedResources(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Get parameters
    highAvailability, _ := xr.Resource.GetBool("spec.parameters.highAvailability")
    enableMonitoring, _ := xr.Resource.GetBool("spec.parameters.enableMonitoring")
    environment, _ := xr.Resource.GetString("spec.parameters.environment")

    // Conditionally add read replica for HA
    if highAvailability {
        replica := &resource.DesiredComposed{Resource: composed.New()}
        replica.Resource.SetAPIVersion("rds.aws.upbound.io/v1beta1")
        replica.Resource.SetKind("Instance")
        replica.Resource.SetName("read-replica")

        // Configure replica
        spec := map[string]interface{}{
            "forProvider": map[string]interface{}{
                "replicateSourceDb": xr.Resource.GetName(),
                "instanceClass":     "db.t3.medium",
            },
        }
        replica.Resource.Object["spec"] = spec

        desired[resource.Name("read-replica")] = replica

        f.log.Info("Added read replica for high availability")
    }

    // Conditionally add CloudWatch alarms for production
    if enableMonitoring && environment == "production" {
        alarm := &resource.DesiredComposed{Resource: composed.New()}
        alarm.Resource.SetAPIVersion("cloudwatch.aws.upbound.io/v1beta1")
        alarm.Resource.SetKind("MetricAlarm")
        alarm.Resource.SetName("cpu-alarm")

        spec := map[string]interface{}{
            "forProvider": map[string]interface{}{
                "comparisonOperator": "GreaterThanThreshold",
                "evaluationPeriods":  2,
                "metricName":          "CPUUtilization",
                "namespace":           "AWS/RDS",
                "period":              300,
                "statistic":           "Average",
                "threshold":           80,
                "alarmActions":        []string{"arn:aws:sns:us-west-2:123456789012:alerts"},
            },
        }
        alarm.Resource.Object["spec"] = spec

        desired[resource.Name("cpu-alarm")] = alarm

        f.log.Info("Added CloudWatch alarm for production environment")
    }

    // Set all desired resources
    if err := response.SetDesiredComposedResources(rsp, desired); err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    return rsp, nil
}
```

Functions provide full control over which resources get created based on any criteria.

## Deploying Functions to Kubernetes

Package and deploy functions so Crossplane can invoke them.

```dockerfile
# Dockerfile for function
FROM golang:1.26 as builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o function .

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/function /function
EXPOSE 9443
ENTRYPOINT ["/function"]
```

Build a function package, push it to a package registry, then install it with a Crossplane `Function` object:

```bash
docker build . --tag=runtime
crossplane xpkg build --package-root=package --embed-runtime-image=runtime --package-file=function-validator.xpkg
crossplane xpkg push --package-files=function-validator.xpkg xpkg.example.com/mycompany/function-validator:v1.0.0
```

```yaml
# function.yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-validator
spec:
  package: xpkg.example.com/mycompany/function-validator:v1.0.0
```

Crossplane discovers and invokes functions automatically when referenced in Compositions.

## Testing Function Pipelines

Test function behavior using Crossplane's function testing framework.

```bash
# Create test input
cat > test-input.yaml <<EOF
apiVersion: platform.example.com/v1alpha1
kind: XDatabase
metadata:
  name: test-db
spec:
  parameters:
    size: medium
    region: us-west-2
    highAvailability: true
EOF

# Run function locally for testing
crossplane composition render test-input.yaml composition-with-functions.yaml functions.yaml \
  --include-function-results

# This shows the complete pipeline output
```

Local testing enables rapid iteration without deploying to clusters.

## Monitoring Function Execution

Track function performance and errors using metrics and logs.

```go
// Add metrics to function
import (
    "github.com/prometheus/client_golang/prometheus"
)

var (
    functionDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "function_duration_seconds",
            Help: "Duration of function execution",
        },
        []string{"function_name", "result"},
    )

    functionErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "function_errors_total",
            Help: "Total number of function errors",
        },
        []string{"function_name", "error_type"},
    )
)

func (f *Function) RunFunction(ctx context.Context, req *fnv1.RunFunctionRequest) (*fnv1.RunFunctionResponse, error) {
    start := time.Now()

    rsp, err := f.runFunctionInternal(ctx, req)

    duration := time.Since(start).Seconds()
    result := "success"
    if err != nil {
        result = "error"
        functionErrors.WithLabelValues("validator", "execution_error").Inc()
    }

    functionDuration.WithLabelValues("validator", result).Observe(duration)

    return rsp, err
}
```

Metrics enable monitoring function health and identifying performance bottlenecks.

Crossplane Composition Functions extend the platform's capabilities beyond simple patch-based transformations. By running custom code during composition, functions enable complex validation, calculations, external integrations, and conditional resource creation. The pipeline architecture allows composing multiple functions together, with each focusing on a specific concern. This separation of concerns makes compositions easier to understand, test, and maintain while enabling sophisticated infrastructure patterns that would be impossible with patches alone.
