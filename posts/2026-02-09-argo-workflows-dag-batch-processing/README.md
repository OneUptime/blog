# How to Use Argo Workflows for Complex DAG-Based Batch Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo Workflows, Batch Processing

Description: Master Argo Workflows for building complex directed acyclic graph batch processing pipelines with dependency management, conditional execution, and parallel task processing in Kubernetes.

---

Batch processing often involves multiple dependent steps that must execute in a specific order. Argo Workflows excels at orchestrating these complex workflows using directed acyclic graphs that define task dependencies, parallel execution, and conditional logic.

Unlike simple job controllers, Argo Workflows provides sophisticated workflow patterns including DAG-based execution, loops, conditionals, and artifact passing between steps. This makes it perfect for data pipelines, ETL processes, machine learning workflows, and other multi-stage batch processing tasks.

## Understanding DAG Workflows

A directed acyclic graph represents your workflow as nodes connected by edges that show dependencies. Each node is a task, and edges indicate which tasks must complete before others can start. The acyclic nature means there are no circular dependencies that could cause deadlocks.

Argo Workflows implements DAGs through the workflow template spec. You define tasks and their dependencies, and Argo handles scheduling, execution order, failure handling, and retries automatically.

## Installing Argo Workflows

Start by installing Argo Workflows in your cluster. The recommended approach uses kubectl apply with the official manifests.

```bash
# Create namespace
kubectl create namespace argo

# Install Argo Workflows
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/download/v3.4.4/install.yaml

# Verify installation
kubectl get pods -n argo
kubectl get crd | grep argoproj.io
```

For production deployments, configure persistence, authentication, and resource limits according to your requirements.

## Creating a Basic DAG Workflow

Here's a simple DAG workflow that processes data through multiple stages.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: data-pipeline-
  namespace: data-processing
spec:
  entrypoint: data-processing-dag

  # Define the DAG structure
  templates:
  - name: data-processing-dag
    dag:
      tasks:
      # Stage 1: Validate input data
      - name: validate-input
        template: validate-data

      # Stage 2: Process data (depends on validation)
      - name: transform-data
        dependencies: [validate-input]
        template: transform

      # Stage 3: Run parallel aggregations
      - name: aggregate-users
        dependencies: [transform-data]
        template: aggregate
        arguments:
          parameters:
          - name: entity
            value: "users"

      - name: aggregate-orders
        dependencies: [transform-data]
        template: aggregate
        arguments:
          parameters:
          - name: entity
            value: "orders"

      # Stage 4: Generate report (depends on all aggregations)
      - name: generate-report
        dependencies: [aggregate-users, aggregate-orders]
        template: report

      # Stage 5: Upload results
      - name: upload-results
        dependencies: [generate-report]
        template: upload

  # Task templates
  - name: validate-data
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        import sys
        print("Validating input data...")
        # Add validation logic here
        print("Validation successful")

  - name: transform
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        print("Transforming data...")
        # Add transformation logic
        print("Transformation complete")

  - name: aggregate
    inputs:
      parameters:
      - name: entity
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        entity = "{{inputs.parameters.entity}}"
        print(f"Aggregating {entity} data...")
        # Add aggregation logic
        print(f"{entity} aggregation complete")

  - name: report
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        print("Generating report...")
        # Add report generation logic
        print("Report generated")

  - name: upload
    container:
      image: amazon/aws-cli:latest
      command: [sh, -c]
      args:
      - |
        echo "Uploading results to S3..."
        # aws s3 cp /tmp/report.csv s3://bucket/reports/
        echo "Upload complete"
```

This workflow validates data, transforms it, runs parallel aggregations for different entities, generates a report, and uploads results. Each step only runs after its dependencies complete successfully.

## Passing Data Between Tasks

For workflows that need to share data between steps, use artifacts. Argo supports various artifact repositories including S3, GCS, and Minio.

```yaml
spec:
  templates:
  - name: data-processing-dag
    dag:
      tasks:
      - name: extract-data
        template: extract

      - name: process-data
        dependencies: [extract-data]
        template: process
        arguments:
          artifacts:
          - name: input-data
            from: "{{tasks.extract-data.outputs.artifacts.data}}"

  - name: extract
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        import json
        data = {"records": 1000, "status": "extracted"}
        with open('/tmp/data.json', 'w') as f:
            json.dump(data, f)
    outputs:
      artifacts:
      - name: data
        path: /tmp/data.json

  - name: process
    inputs:
      artifacts:
      - name: input-data
        path: /tmp/input.json
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        import json
        with open('/tmp/input.json', 'r') as f:
            data = json.load(f)
        print(f"Processing {data['records']} records")
```

Artifacts automatically transfer data between steps using the configured artifact repository, making data sharing seamless.

## Implementing Conditional Execution

Real-world workflows often need conditional logic. Argo supports when expressions that control whether tasks execute.

```yaml
spec:
  templates:
  - name: conditional-dag
    dag:
      tasks:
      - name: check-data-size
        template: check-size

      - name: process-small-batch
        dependencies: [check-data-size]
        template: small-batch
        when: "{{tasks.check-data-size.outputs.parameters.size}} < 1000"

      - name: process-large-batch
        dependencies: [check-data-size]
        template: large-batch
        when: "{{tasks.check-data-size.outputs.parameters.size}} >= 1000"

  - name: check-size
    script:
      image: python:3.9
      command: [python]
      source: |
        import random
        size = random.randint(500, 2000)
        print(size)
    outputs:
      parameters:
      - name: size
        valueFrom:
          path: /tmp/size
```

The when clause evaluates expressions using task outputs, enabling dynamic workflow paths based on runtime conditions.

## Handling Retries and Failures

Production workflows need robust error handling. Configure retry policies at the task level.

```yaml
spec:
  templates:
  - name: resilient-task
    retryStrategy:
      limit: 3
      retryPolicy: "Always"
      backoff:
        duration: "10s"
        factor: 2
        maxDuration: "5m"
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        import random
        if random.random() < 0.3:
            raise Exception("Simulated failure")
        print("Task succeeded")
```

This configuration retries failed tasks up to three times with exponential backoff, starting at 10 seconds and doubling each time up to a maximum of 5 minutes.

## Parallelizing Batch Processing

For processing large datasets, use dynamic task generation with withItems or withParam to create parallel tasks.

```yaml
spec:
  templates:
  - name: parallel-processing-dag
    dag:
      tasks:
      - name: generate-partitions
        template: partition

      - name: process-partition
        dependencies: [generate-partitions]
        template: process
        arguments:
          parameters:
          - name: partition
            value: "{{item}}"
        withParam: "{{tasks.generate-partitions.outputs.parameters.partitions}}"

      - name: merge-results
        dependencies: [process-partition]
        template: merge

  - name: partition
    script:
      image: python:3.9
      command: [python]
      source: |
        import json
        # Generate list of partitions to process
        partitions = [f"partition-{i}" for i in range(10)]
        print(json.dumps(partitions))
    outputs:
      parameters:
      - name: partitions
        valueFrom:
          path: /tmp/partitions

  - name: process
    inputs:
      parameters:
      - name: partition
    container:
      image: python:3.9
      command: [python]
      args:
      - -c
      - |
        partition = "{{inputs.parameters.partition}}"
        print(f"Processing {partition}")
```

This pattern dynamically creates processing tasks based on runtime data, allowing you to parallelize work across any number of partitions.

## Resource Management for DAG Tasks

Set resource requests and limits for each task type to ensure efficient cluster utilization.

```yaml
spec:
  templates:
  - name: heavy-processing
    container:
      image: python:3.9
      resources:
        requests:
          memory: "4Gi"
          cpu: "2"
        limits:
          memory: "8Gi"
          cpu: "4"
```

Configure pod priority classes for critical workflows to ensure they get scheduled even when cluster resources are constrained.

## Monitoring and Observability

Argo provides a web UI for monitoring workflow execution. Access it by port-forwarding the argo-server service.

```bash
# Port-forward Argo UI
kubectl -n argo port-forward deployment/argo-server 2746:2746

# View workflow status
argo list -n data-processing

# Get workflow details
argo get data-pipeline-abc123 -n data-processing

# View logs for specific step
argo logs data-pipeline-abc123 -n data-processing validate-input
```

The UI shows the DAG structure visually, making it easy to understand workflow progress and identify bottlenecks.

## Scheduling Recurring Batch Jobs

Use CronWorkflow resources for scheduled batch processing.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: daily-data-pipeline
  namespace: data-processing
spec:
  schedule: "0 2 * * *"
  timezone: "America/Los_Angeles"
  concurrencyPolicy: "Forbid"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1

  workflowSpec:
    entrypoint: data-processing-dag
    # ... rest of workflow spec
```

This runs the workflow daily at 2 AM Pacific time, keeping history of the last 3 successful runs and 1 failed run.

## Best Practices

Keep individual tasks focused and single-purpose for better reusability. Use parameters and artifacts to make workflows flexible and data-driven. Implement proper error handling with retries and failure notifications.

Structure complex workflows into multiple smaller DAGs that can be composed together. This improves maintainability and testing. Use workflow templates to share common patterns across multiple workflows.

Monitor workflow execution times and optimize bottlenecks by increasing parallelism or adjusting resource allocations. Set appropriate timeouts to prevent workflows from running indefinitely.

## Conclusion

Argo Workflows provides powerful primitives for building complex batch processing pipelines using DAGs. The combination of dependency management, conditional execution, parallel processing, and artifact passing enables sophisticated data workflows that are maintainable and observable.

By leveraging DAG-based orchestration, you can build robust batch processing systems that handle failures gracefully, scale to large datasets, and integrate seamlessly with your Kubernetes infrastructure. The declarative workflow definitions make it easy to version control and review your processing logic alongside your application code.
