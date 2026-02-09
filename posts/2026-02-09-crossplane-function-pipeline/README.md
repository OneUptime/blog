# How to Build a Crossplane Function Pipeline for Complex Kubernetes Resource Composition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Infrastructure as Code, Cloud Native, Platform Engineering

Description: Learn how to build Crossplane Composition Functions pipelines to implement complex resource transformation logic that goes beyond what patches can achieve.

---

Crossplane Compositions use patches to transform input parameters into cloud resources, but patches hit limitations quickly with complex logic. Composition Functions solve this by running custom code during resource composition, enabling sophisticated transformations, validations, and integrations. This guide shows you how to build function pipelines for advanced use cases.

## Understanding Composition Functions

Composition Functions run as containerized services that receive composition requests and return modified resources. Crossplane invokes functions in pipeline order, passing the result of each function to the next. Functions can add resources, modify existing ones, validate inputs, or call external APIs.

Unlike patches which use declarative transformations, functions execute arbitrary code. This enables implementing business logic, performing calculations, querying databases, or integrating with external systems. Functions receive the complete composition context including all resources and can make decisions based on complex criteria.

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

    "github.com/crossplane/crossplane-runtime/pkg/logging"
    fnv1beta1 "github.com/crossplane/function-sdk-go/proto/v1beta1"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/crossplane/function-sdk-go/resource"
    "github.com/crossplane/function-sdk-go/response"
)

type Function struct {
    log logging.Logger
}

func (f *Function) RunFunction(ctx context.Context, req *fnv1beta1.RunFunctionRequest) (*fnv1beta1.RunFunctionResponse, error) {
    log := f.log.WithValues("tag", req.GetMeta().GetTag())
    log.Info("Running validation function")

    // Get the composite resource
    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        response.Fatal(rsp, err)
        return rsp, nil
    }

    // Extract parameters
    size, err := xr.Resource.GetString("spec.parameters.size")
    if err != nil {
        return response.Fatal(rsp, fmt.Errorf("missing required field: spec.parameters.size"))
    }

    region, err := xr.Resource.GetString("spec.parameters.region")
    if err != nil {
        return response.Fatal(rsp, fmt.Errorf("missing required field: spec.parameters.region"))
    }

    // Validate size
    validSizes := map[string]bool{"small": true, "medium": true, "large": true}
    if !validSizes[size] {
        return response.Fatal(rsp, fmt.Errorf("invalid size: %s. Must be small, medium, or large", size))
    }

    // Validate region format
    if !isValidRegion(region) {
        return response.Fatal(rsp, fmt.Errorf("invalid region format: %s", region))
    }

    // Add default values if not specified
    if _, err := xr.Resource.GetBool("spec.parameters.backupEnabled"); err != nil {
        xr.Resource.SetValue("spec.parameters.backupEnabled", true)
        log.Info("Set default backupEnabled=true")
    }

    // Add metadata annotation
    annotations := xr.Resource.GetAnnotations()
    annotations["validated-by"] = "function-validator"
    annotations["validation-timestamp"] = time.Now().Format(time.RFC3339)
    xr.Resource.SetAnnotations(annotations)

    // Store enriched resource
    if err := response.SetDesiredCompositeResource(rsp, xr); err != nil {
        return response.Fatal(rsp, err)
    }

    // Add result for next function in pipeline
    rsp.Results = append(rsp.Results, &fnv1beta1.Result{
        Severity: fnv1beta1.Severity_SEVERITY_NORMAL,
        Message:  "Validation passed successfully",
    })

    return rsp, nil
}

func isValidRegion(region string) bool {
    // Simple regex validation for region format
    matched, _ := regexp.MatchString(`^(us|eu|ap)-[a-z]+-[0-9]$`, region)
    return matched
}

func main() {
    log := logging.NewLogrLogger(logging.Config{Debug: true})
    runner := &Function{log: log}

    if err := fn.Serve(runner, fn.WithLogger(log)); err != nil {
        log.Fatal(err, "cannot serve function")
    }
}
```

Package this as a container and deploy it to your cluster for Crossplane to invoke.

## Implementing Resource Calculation Logic

Build a function that performs complex calculations based on input parameters.

```python
# function-calculator/main.py
import json
import math
from typing import Dict, Any
from crossplane.function import Function, RunFunctionRequest, RunFunctionResponse
from crossplane.function import resource

class ResourceCalculator(Function):
    def run_function(self, req: RunFunctionRequest) -> RunFunctionResponse:
        """Calculate resource specifications based on size parameter"""

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
        if "status" not in xr:
            xr["status"] = {}

        xr["status"]["calculatedStorage"] = specs["storage"]
        xr["status"]["calculatedMemory"] = specs["memory"]
        xr["status"]["calculatedCpu"] = specs["cpu"]
        xr["status"]["calculatedIops"] = specs["iops"]

        # Set the modified resource
        rsp = RunFunctionResponse()
        rsp.desired.composite.resource = xr

        # Add informational result
        rsp.results.append({
            "severity": "NORMAL",
            "message": f"Calculated resources for {size} tier: {json.dumps(specs)}"
        })

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

if __name__ == "__main__":
    ResourceCalculator().serve()
```

This function performs calculations that would be impossible with simple patches.

## Creating External Integration Functions

Build functions that integrate with external systems during composition.

```typescript
// function-registry/src/index.ts
import { Function, RunFunctionRequest, RunFunctionResponse } from "@crossplane/function-sdk";
import axios from "axios";

interface RegistryConfig {
  endpoint: string;
  apiKey: string;
  registerOnCreate: boolean;
}

class DatabaseRegistryFunction extends Function {
  async runFunction(req: RunFunctionRequest): Promise<RunFunctionResponse> {
    const config: RegistryConfig = req.input as RegistryConfig;
    const xr = req.observed.composite.resource;

    // Extract database details
    const databaseName = xr.metadata.name;
    const environment = xr.metadata.labels?.environment || "unknown";
    const team = xr.metadata.labels?.team || "unknown";

    // Check if database was just created
    const isNewDatabase = !xr.status?.registrationId;

    if (config.registerOnCreate && isNewDatabase) {
      try {
        // Register database in external system
        const registration = await this.registerDatabase(
          config.endpoint,
          config.apiKey,
          {
            name: databaseName,
            environment: environment,
            team: team,
            createdAt: new Date().toISOString(),
          }
        );

        // Store registration ID in status
        if (!xr.status) {
          xr.status = {};
        }
        xr.status.registrationId = registration.id;
        xr.status.registeredAt = registration.timestamp;

        // Add annotation with registry URL
        const annotations = xr.metadata.annotations || {};
        annotations["registry-url"] = `${config.endpoint}/databases/${registration.id}`;
        xr.metadata.annotations = annotations;

        const rsp = new RunFunctionResponse();
        rsp.desired.composite.resource = xr;

        rsp.results.push({
          severity: "NORMAL",
          message: `Registered database in external registry: ${registration.id}`
        });

        return rsp;
      } catch (error) {
        const rsp = new RunFunctionResponse();
        rsp.results.push({
          severity: "WARNING",
          message: `Failed to register database: ${error.message}`
        });
        return rsp;
      }
    }

    // No action needed
    const rsp = new RunFunctionResponse();
    rsp.desired.composite.resource = xr;
    return rsp;
  }

  private async registerDatabase(
    endpoint: string,
    apiKey: string,
    data: any
  ): Promise<{ id: string; timestamp: string }> {
    const response = await axios.post(
      `${endpoint}/api/databases`,
      data,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  }
}

// Start the function server
new DatabaseRegistryFunction().serve();
```

This function calls external APIs, enabling integration with systems outside Kubernetes.

## Handling Conditional Resource Creation

Use functions to conditionally create resources based on complex logic.

```go
// function-conditional-resources/main.go
func (f *Function) RunFunction(ctx context.Context, req *fnv1beta1.RunFunctionRequest) (*fnv1beta1.RunFunctionResponse, error) {
    rsp := response.To(req, response.DefaultTTL)

    xr, err := request.GetObservedCompositeResource(req)
    if err != nil {
        return response.Fatal(rsp, err)
    }

    // Get existing desired resources
    desired, err := request.GetDesiredComposedResources(req)
    if err != nil {
        return response.Fatal(rsp, err)
    }

    // Get parameters
    highAvailability, _ := xr.Resource.GetBool("spec.parameters.highAvailability")
    enableMonitoring, _ := xr.Resource.GetBool("spec.parameters.enableMonitoring")
    environment, _ := xr.Resource.GetString("spec.parameters.environment")

    // Conditionally add read replica for HA
    if highAvailability {
        replica := resource.NewDesiredComposed()
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

        desired["read-replica"] = replica

        f.log.Info("Added read replica for high availability")
    }

    // Conditionally add CloudWatch alarms for production
    if enableMonitoring && environment == "production" {
        alarm := resource.NewDesiredComposed()
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

        desired["cpu-alarm"] = alarm

        f.log.Info("Added CloudWatch alarm for production environment")
    }

    // Set all desired resources
    if err := response.SetDesiredComposedResources(rsp, desired); err != nil {
        return response.Fatal(rsp, err)
    }

    return rsp, nil
}
```

Functions provide full control over which resources get created based on any criteria.

## Deploying Functions to Kubernetes

Package and deploy functions so Crossplane can invoke them.

```dockerfile
# Dockerfile for function
FROM golang:1.21 as builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o function .

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/function /function
EXPOSE 9443
ENTRYPOINT ["/function"]
```

Deploy the function as a Kubernetes Deployment:

```yaml
# function-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: function-validator
  namespace: crossplane-system
spec:
  replicas: 2
  selector:
    matchLabels:
      function: validator
  template:
    metadata:
      labels:
        function: validator
    spec:
      containers:
      - name: function
        image: mycompany/function-validator:v1.0.0
        ports:
        - containerPort: 9443
          name: grpc
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: function-validator
  namespace: crossplane-system
spec:
  selector:
    function: validator
  ports:
  - port: 9443
    targetPort: 9443
    protocol: TCP
---
apiVersion: pkg.crossplane.io/v1beta1
kind: Function
metadata:
  name: function-validator
spec:
  package: mycompany/function-validator:v1.0.0
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
crossplane beta render test-input.yaml composition-with-functions.yaml \
  --observed-resources=observed.yaml \
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
    "github.com/prometheus/client_golang/prometheus/promhttp"
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

func (f *Function) RunFunction(ctx context.Context, req *fnv1beta1.RunFunctionRequest) (*fnv1beta1.RunFunctionResponse, error) {
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
