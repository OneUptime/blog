# How to Configure Tekton Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Results, CI/CD, Kubernetes, DevOps

Description: Learn how to configure Tekton Results to store and query pipeline run metadata and logs at scale.

---

Tekton Results stores TaskRun and PipelineRun data in a scalable backend, making it easier to query historical runs and integrate with dashboards. This guide covers the basics.

## Why Use Tekton Results

- Persistent storage for pipeline metadata
- Faster querying of historical runs
- Better observability for CI pipelines

## Step 1: Install Tekton Results

Install the Tekton Results components into your cluster using the official manifests or Operator.

## Step 2: Configure Storage

Tekton Results typically uses a database backend. Configure connection settings and credentials in the Results API deployment.

## Step 3: Enable Results in Tekton Pipelines

Add the results configuration to Tekton Pipelines so TaskRuns and PipelineRuns are stored in the Results backend.

## Step 4: Query Results

Use the Results API to list runs, filter by labels, and fetch logs.

## Best Practices

- Retain results long enough for audits
- Use labels to group runs by repo or environment
- Protect results API with authentication

## Conclusion

Tekton Results adds persistence and queryability to your pipeline data. It is essential for large-scale CI environments that need traceability and reporting.
