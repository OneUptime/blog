# How to Implement Tekton Results for Pipeline History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, Results, CI/CD, Kubernetes, DevOps, Pipeline History, Observability

Description: Learn how to implement Tekton Results to store, query, and analyze your pipeline execution history at scale with PostgreSQL backends, gRPC APIs, and dashboard integrations.

---

Pipeline history becomes critical when debugging failed builds, auditing deployments, or analyzing CI/CD performance trends. Tekton Pipelines by default stores run data only as Kubernetes custom resources, which get garbage collected and lack efficient querying capabilities. Tekton Results solves these problems by providing a dedicated storage backend optimized for historical pipeline data.

## Understanding Tekton Results Architecture

Tekton Results consists of three main components that work together to capture, store, and serve pipeline history data. The watcher monitors the cluster for TaskRun and PipelineRun completions, the API server provides gRPC and REST endpoints for querying data, and the storage backend persists everything to a database.

```mermaid
flowchart TB
    subgraph Kubernetes Cluster
        TR[TaskRun]
        PR[PipelineRun]
        W[Results Watcher]
    end

    subgraph Results API
        GRPC[gRPC Server]
        REST[REST Gateway]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        LOGS[Log Storage]
    end

    subgraph Clients
        CLI[tkn CLI]
        DASH[Dashboard]
        API[Custom Apps]
    end

    TR --> W
    PR --> W
    W --> PG
    W --> LOGS
    PG --> GRPC
    LOGS --> GRPC
    GRPC --> REST
    GRPC --> CLI
    REST --> DASH
    REST --> API
```

## Prerequisites

Before implementing Tekton Results, ensure you have a working Tekton Pipelines installation. The following command verifies your Tekton setup:

```bash
# Check that Tekton Pipelines is running
# Look for tekton-pipelines-controller and tekton-pipelines-webhook pods
kubectl get pods -n tekton-pipelines

# Verify the Tekton Pipelines version (Results requires v0.25.0+)
kubectl get deploy tekton-pipelines-controller -n tekton-pipelines \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Installing Tekton Results

Deploy Tekton Results using the official release manifests. The installation creates the necessary CRDs, RBAC policies, and deploys the watcher and API server components.

```bash
# Apply the latest Tekton Results release
# Includes Results API, Watcher, and PostgreSQL database
kubectl apply -f https://storage.googleapis.com/tekton-releases/results/latest/release.yaml

# Verify all Results components are running
kubectl get pods -n tekton-pipelines -l app.kubernetes.io/part-of=tekton-results

# Check the Results API deployment status
kubectl rollout status deployment/tekton-results-api -n tekton-pipelines
```

## Configuring the PostgreSQL Backend

Tekton Results requires a PostgreSQL database for storing pipeline records. For production deployments, configure a managed database service or deploy a highly available PostgreSQL cluster.

The following manifest creates a dedicated PostgreSQL deployment for development environments:

```yaml
# postgres-deployment.yaml
# PostgreSQL database for Tekton Results storage
# For production, use a managed service like Cloud SQL or RDS
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: tekton-results-postgres
  namespace: tekton-pipelines
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Adjust storage based on expected pipeline volume
      # 1GB handles approximately 100,000 pipeline runs
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tekton-results-postgres
  namespace: tekton-pipelines
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tekton-results-postgres
  template:
    metadata:
      labels:
        app: tekton-results-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            # Database credentials - use secrets in production
            - name: POSTGRES_DB
              value: tekton_results
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: tekton-results-postgres
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tekton-results-postgres
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          # Resource limits prevent runaway queries from affecting the cluster
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: tekton-results-postgres
---
apiVersion: v1
kind: Service
metadata:
  name: tekton-results-postgres
  namespace: tekton-pipelines
spec:
  selector:
    app: tekton-results-postgres
  ports:
    - port: 5432
      targetPort: 5432
```

Create the database credentials secret before applying the deployment:

```bash
# Generate a secure password for PostgreSQL
# Store credentials in a Kubernetes secret
kubectl create secret generic tekton-results-postgres \
  -n tekton-pipelines \
  --from-literal=username=tekton \
  --from-literal=password="$(openssl rand -base64 24)"

# Apply the PostgreSQL deployment
kubectl apply -f postgres-deployment.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod \
  -l app=tekton-results-postgres \
  -n tekton-pipelines \
  --timeout=120s
```

## Configuring the Results API Server

The Results API server needs configuration to connect to your PostgreSQL database and set up authentication. Modify the ConfigMap to point to your database instance.

```yaml
# results-config.yaml
# Configuration for Tekton Results API server
apiVersion: v1
kind: ConfigMap
metadata:
  name: tekton-results-api-config
  namespace: tekton-pipelines
data:
  # Database connection string
  # Format: postgresql://user:password@host:port/dbname?sslmode=mode
  DB_HOST: tekton-results-postgres.tekton-pipelines.svc.cluster.local
  DB_PORT: "5432"
  DB_NAME: tekton_results
  DB_SSLMODE: disable

  # Log storage configuration
  # Options: file, gcs, s3
  LOGS_API: "true"
  LOGS_TYPE: file
  LOGS_PATH: /logs

  # gRPC server configuration
  SERVER_PORT: "8080"
  PROMETHEUS_PORT: "9090"

  # Enable gRPC reflection for debugging
  GRPC_REFLECTION: "true"
```

Apply the configuration and restart the API server:

```bash
# Apply the Results API configuration
kubectl apply -f results-config.yaml

# Restart the Results API to pick up new configuration
kubectl rollout restart deployment/tekton-results-api -n tekton-pipelines

# Verify the API server is healthy
kubectl logs -l app.kubernetes.io/name=tekton-results-api \
  -n tekton-pipelines --tail=50
```

## Configuring the Results Watcher

The watcher component monitors TaskRuns and PipelineRuns in the cluster and sends completed runs to the Results API. Configure it to watch specific namespaces or all namespaces.

```yaml
# watcher-config.yaml
# Configuration for Tekton Results Watcher
apiVersion: v1
kind: ConfigMap
metadata:
  name: tekton-results-watcher-config
  namespace: tekton-pipelines
data:
  # Comma-separated list of namespaces to watch
  # Leave empty or set to "-" to watch all namespaces
  WATCH_NAMESPACES: ""

  # Results API endpoint
  RESULTS_API: tekton-results-api.tekton-pipelines.svc.cluster.local:8080

  # Watcher behavior configuration
  # Check interval for completed runs (in seconds)
  CHECK_INTERVAL: "10"

  # Number of completed runs to process per batch
  BATCH_SIZE: "50"

  # Enable TLS for API communication
  TLS_ENABLED: "false"

  # Log level: debug, info, warn, error
  LOG_LEVEL: info
```

## Setting Up Log Storage

Pipeline logs consume significant storage. Tekton Results supports multiple backends for log storage, including local filesystem, Google Cloud Storage, and Amazon S3.

The following configuration sets up S3-compatible log storage:

```yaml
# logs-storage-config.yaml
# S3 configuration for pipeline log storage
apiVersion: v1
kind: ConfigMap
metadata:
  name: tekton-results-logs-config
  namespace: tekton-pipelines
data:
  LOGS_TYPE: s3
  S3_BUCKET: tekton-pipeline-logs
  S3_REGION: us-west-2
  S3_ENDPOINT: ""  # Leave empty for AWS, set for MinIO
  S3_FORCE_PATH_STYLE: "false"
---
apiVersion: v1
kind: Secret
metadata:
  name: tekton-results-s3-creds
  namespace: tekton-pipelines
type: Opaque
stringData:
  # AWS credentials for S3 access
  # For EKS with IRSA, use service account annotations instead
  AWS_ACCESS_KEY_ID: your-access-key
  AWS_SECRET_ACCESS_KEY: your-secret-key
```

For Google Cloud Storage, use this configuration:

```yaml
# gcs-logs-config.yaml
# GCS configuration for pipeline log storage
apiVersion: v1
kind: ConfigMap
metadata:
  name: tekton-results-logs-config
  namespace: tekton-pipelines
data:
  LOGS_TYPE: gcs
  GCS_BUCKET: tekton-pipeline-logs
---
apiVersion: v1
kind: Secret
metadata:
  name: tekton-results-gcs-creds
  namespace: tekton-pipelines
type: Opaque
data:
  # Base64 encoded GCP service account JSON key
  gcs-credentials.json: <base64-encoded-key>
```

## Data Flow and Pipeline Lifecycle

Understanding how pipeline data flows through Tekton Results helps with debugging and optimization. The following diagram illustrates the complete lifecycle:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant K8s as Kubernetes
    participant PR as PipelineRun
    participant W as Watcher
    participant API as Results API
    participant DB as PostgreSQL
    participant Logs as Log Storage

    Dev->>K8s: kubectl apply -f pipeline-run.yaml
    K8s->>PR: Create PipelineRun
    PR->>PR: Execute Tasks
    PR->>K8s: Update Status (Running)
    PR->>K8s: Update Status (Completed)
    W->>K8s: Watch for completed runs
    K8s->>W: PipelineRun completed event
    W->>API: Send run metadata
    API->>DB: Store record
    W->>API: Send logs
    API->>Logs: Store logs
    Dev->>API: Query pipeline history
    API->>DB: Fetch records
    DB->>API: Return results
    API->>Dev: Pipeline run data
```

## Querying Pipeline History

Access pipeline history through the Results API using gRPC or the REST gateway. The tkn CLI provides convenient commands for common queries.

```bash
# Install the tkn CLI if not already present
# macOS
brew install tektoncd-cli

# Linux
curl -LO https://github.com/tektoncd/cli/releases/download/v0.35.0/tkn_0.35.0_Linux_x86_64.tar.gz
tar xvzf tkn_0.35.0_Linux_x86_64.tar.gz
sudo mv tkn /usr/local/bin/

# List recent pipeline runs using Results
tkn results list --api-url http://localhost:8080

# Get details of a specific pipeline run
tkn results describe <result-name> --api-url http://localhost:8080

# List runs filtered by pipeline name
tkn results list --filter "data.metadata.name.contains('build-pipeline')"
```

For programmatic access, use the gRPC API directly. The following Python script demonstrates querying pipeline history:

```python
# query_results.py
# Python client for querying Tekton Results API
# Install: pip install grpcio grpcio-tools

import grpc
from google.protobuf import field_mask_pb2

# Import generated proto files
# Generate with: python -m grpc_tools.protoc ...
from tekton_results.v1alpha2 import results_pb2
from tekton_results.v1alpha2 import results_pb2_grpc

def get_pipeline_history(api_address: str, parent: str, limit: int = 100):
    """
    Query pipeline run history from Tekton Results.

    Args:
        api_address: Results API gRPC address (host:port)
        parent: Parent resource path (e.g., "default/results")
        limit: Maximum number of results to return

    Returns:
        List of pipeline run records
    """
    # Create gRPC channel
    # For TLS, use grpc.secure_channel with credentials
    channel = grpc.insecure_channel(api_address)
    stub = results_pb2_grpc.ResultsStub(channel)

    # Build the request
    request = results_pb2.ListResultsRequest(
        parent=parent,
        page_size=limit,
        # Filter for PipelineRuns only (exclude TaskRuns)
        filter='data_type == "tekton.dev/v1beta1.PipelineRun"'
    )

    # Execute the query
    response = stub.ListResults(request)

    runs = []
    for result in response.results:
        runs.append({
            'name': result.name,
            'uid': result.uid,
            'create_time': result.create_time.ToDatetime(),
            'update_time': result.update_time.ToDatetime(),
        })

    return runs


def get_run_logs(api_address: str, result_name: str):
    """
    Fetch logs for a specific pipeline run.

    Args:
        api_address: Results API gRPC address
        result_name: Full result name path

    Returns:
        Log content as string
    """
    channel = grpc.insecure_channel(api_address)
    stub = results_pb2_grpc.LogsStub(channel)

    request = results_pb2.GetLogRequest(name=result_name)
    response = stub.GetLog(request)

    return response.data.decode('utf-8')


if __name__ == '__main__':
    # Query recent pipeline runs
    api = 'localhost:8080'
    runs = get_pipeline_history(api, 'default/results', limit=10)

    for run in runs:
        print(f"Pipeline: {run['name']}")
        print(f"  Created: {run['create_time']}")
        print(f"  Updated: {run['update_time']}")
        print()
```

## Building a Pipeline History Dashboard

Integrate Tekton Results with Grafana to visualize pipeline metrics and trends. The following dashboard queries demonstrate common use cases.

Configure Grafana to use PostgreSQL as a data source:

```yaml
# grafana-datasource.yaml
# Grafana data source configuration for Tekton Results database
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: TektonResults
        type: postgres
        url: tekton-results-postgres.tekton-pipelines:5432
        database: tekton_results
        user: tekton
        secureJsonData:
          password: ${POSTGRES_PASSWORD}
        jsonData:
          sslmode: disable
          maxOpenConns: 10
          maxIdleConns: 5
          connMaxLifetime: 14400
```

Create a Grafana dashboard with these SQL queries:

```sql
-- Pipeline success rate over time
-- Groups by hour and calculates percentage of successful runs
SELECT
  date_trunc('hour', created_time) AS time,
  COUNT(*) FILTER (WHERE data->>'status' = 'Succeeded') * 100.0 / COUNT(*) AS success_rate
FROM results
WHERE data_type = 'tekton.dev/v1beta1.PipelineRun'
  AND created_time > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_time)
ORDER BY time;

-- Average pipeline duration by name
-- Helps identify slow pipelines that need optimization
SELECT
  data->'metadata'->>'name' AS pipeline_name,
  AVG(EXTRACT(EPOCH FROM (
    (data->'status'->>'completionTime')::timestamp -
    (data->'status'->>'startTime')::timestamp
  ))) AS avg_duration_seconds
FROM results
WHERE data_type = 'tekton.dev/v1beta1.PipelineRun'
  AND data->'status'->>'completionTime' IS NOT NULL
  AND created_time > NOW() - INTERVAL '30 days'
GROUP BY data->'metadata'->>'name'
ORDER BY avg_duration_seconds DESC
LIMIT 20;

-- Failed pipelines with error messages
-- Quick view of recent failures for debugging
SELECT
  data->'metadata'->>'name' AS pipeline_name,
  data->'metadata'->>'namespace' AS namespace,
  created_time,
  data->'status'->'conditions'->0->>'message' AS error_message
FROM results
WHERE data_type = 'tekton.dev/v1beta1.PipelineRun'
  AND data->'status'->'conditions'->0->>'status' = 'False'
  AND created_time > NOW() - INTERVAL '24 hours'
ORDER BY created_time DESC
LIMIT 50;
```

## Retention Policies and Data Cleanup

Pipeline history grows continuously and requires retention policies to manage storage costs. Implement automated cleanup based on age or count thresholds.

```yaml
# retention-cronjob.yaml
# CronJob for cleaning up old pipeline results
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tekton-results-cleanup
  namespace: tekton-pipelines
spec:
  # Run daily at 2 AM
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: postgres:15-alpine
              env:
                - name: PGHOST
                  value: tekton-results-postgres
                - name: PGDATABASE
                  value: tekton_results
                - name: PGUSER
                  valueFrom:
                    secretKeyRef:
                      name: tekton-results-postgres
                      key: username
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: tekton-results-postgres
                      key: password
              command:
                - /bin/sh
                - -c
                - |
                  # Delete results older than 90 days
                  psql -c "
                    DELETE FROM results
                    WHERE created_time < NOW() - INTERVAL '90 days';

                    DELETE FROM records
                    WHERE result_id NOT IN (SELECT id FROM results);

                    VACUUM ANALYZE results;
                    VACUUM ANALYZE records;
                  "
                  echo "Cleanup completed at $(date)"
```

## Setting Up High Availability

For production environments, deploy Tekton Results with high availability to ensure pipeline history remains accessible during maintenance or failures.

```yaml
# ha-results-api.yaml
# High availability configuration for Tekton Results API
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tekton-results-api
  namespace: tekton-pipelines
spec:
  # Multiple replicas for high availability
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: tekton-results-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: tekton-results-api
    spec:
      # Spread pods across nodes for fault tolerance
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: tekton-results-api
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: tekton-results-api
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: gcr.io/tekton-releases/github.com/tektoncd/results/cmd/api:latest
          ports:
            - containerPort: 8080
              name: grpc
            - containerPort: 9090
              name: metrics
          # Readiness probe ensures traffic only goes to healthy instances
          readinessProbe:
            grpc:
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            grpc:
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tekton-results-api
  namespace: tekton-pipelines
spec:
  # Ensure at least 2 replicas are always available
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: tekton-results-api
```

## Monitoring and Alerting

Tekton Results exposes Prometheus metrics for monitoring. Set up alerts to detect issues before they affect pipeline visibility.

```yaml
# prometheus-rules.yaml
# Alerting rules for Tekton Results monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tekton-results-alerts
  namespace: tekton-pipelines
spec:
  groups:
    - name: tekton-results
      interval: 30s
      rules:
        # Alert when API error rate exceeds threshold
        - alert: TektonResultsAPIErrorRate
          expr: |
            sum(rate(grpc_server_handled_total{
              grpc_service="tekton.results.v1alpha2.Results",
              grpc_code!="OK"
            }[5m]))
            /
            sum(rate(grpc_server_handled_total{
              grpc_service="tekton.results.v1alpha2.Results"
            }[5m])) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Tekton Results API error rate high"
            description: "API error rate is above 5% for the last 5 minutes"

        # Alert when watcher falls behind
        - alert: TektonResultsWatcherLag
          expr: |
            tekton_results_watcher_pending_records > 1000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Tekton Results watcher has backlog"
            description: "Watcher has {{ $value }} pending records to process"

        # Alert on database connection issues
        - alert: TektonResultsDBConnectionError
          expr: |
            tekton_results_db_connection_errors_total > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Tekton Results database connection failing"
            description: "Database connections are failing, pipeline history may be lost"
```

## Integrating with CI/CD Workflows

Embed pipeline history queries into your CI/CD workflows for automated analysis and reporting.

The following script generates a weekly pipeline health report:

```bash
#!/bin/bash
# generate_pipeline_report.sh
# Weekly pipeline health report generator

RESULTS_API="${RESULTS_API:-localhost:8080}"
OUTPUT_FILE="pipeline_report_$(date +%Y%m%d).md"

# Query the Results API for statistics
# Uses grpcurl for direct gRPC access
TOTAL_RUNS=$(grpcurl -plaintext "$RESULTS_API" \
  tekton.results.v1alpha2.Results/ListResults \
  | jq '.results | length')

FAILED_RUNS=$(grpcurl -plaintext "$RESULTS_API" \
  tekton.results.v1alpha2.Results/ListResults \
  -d '{"filter": "data.status.conditions[0].status == \"False\""}' \
  | jq '.results | length')

SUCCESS_RATE=$(echo "scale=2; ($TOTAL_RUNS - $FAILED_RUNS) * 100 / $TOTAL_RUNS" | bc)

# Generate the markdown report
cat > "$OUTPUT_FILE" << EOF
# Pipeline Health Report - Week of $(date +%Y-%m-%d)

## Summary
- Total Pipeline Runs: $TOTAL_RUNS
- Failed Runs: $FAILED_RUNS
- Success Rate: ${SUCCESS_RATE}%

## Failed Pipelines
EOF

# Add failed pipeline details to the report
grpcurl -plaintext "$RESULTS_API" \
  tekton.results.v1alpha2.Results/ListResults \
  -d '{"filter": "data.status.conditions[0].status == \"False\""}' \
  | jq -r '.results[] | "- \(.name): \(.data.status.conditions[0].message)"' \
  >> "$OUTPUT_FILE"

echo "Report generated: $OUTPUT_FILE"
```

## Troubleshooting Common Issues

When pipeline runs are not appearing in Results, check the watcher logs and verify connectivity:

```bash
# Check watcher logs for errors
kubectl logs -l app.kubernetes.io/name=tekton-results-watcher \
  -n tekton-pipelines --tail=100

# Verify watcher can reach the API
kubectl exec -it deploy/tekton-results-watcher -n tekton-pipelines -- \
  wget -qO- http://tekton-results-api:8080/healthz

# Check if runs are being created in the database
kubectl exec -it deploy/tekton-results-postgres -n tekton-pipelines -- \
  psql -U tekton -d tekton_results -c "SELECT COUNT(*) FROM results;"

# Verify PipelineRun annotations are being set
kubectl get pipelinerun -o jsonpath='{.items[*].metadata.annotations}' | jq .
```

Database performance issues often manifest as slow queries. Add indexes for common query patterns:

```sql
-- Create indexes for common query patterns
-- Run these in your PostgreSQL database

-- Index for filtering by pipeline name
CREATE INDEX idx_results_pipeline_name
ON results ((data->'metadata'->>'name'));

-- Index for filtering by namespace
CREATE INDEX idx_results_namespace
ON results ((data->'metadata'->>'namespace'));

-- Index for filtering by status
CREATE INDEX idx_results_status
ON results ((data->'status'->'conditions'->0->>'status'));

-- Index for time-based queries
CREATE INDEX idx_results_created_time
ON results (created_time DESC);

-- Composite index for common dashboard queries
CREATE INDEX idx_results_dashboard
ON results (
  (data->'metadata'->>'name'),
  created_time DESC
) WHERE data_type = 'tekton.dev/v1beta1.PipelineRun';
```

---

Tekton Results transforms your CI/CD observability by providing persistent, queryable pipeline history. Start with a basic installation using the built-in PostgreSQL, then scale to managed databases and object storage as your pipeline volume grows. Integrate with Grafana for visualization, set up retention policies to control costs, and deploy in high availability mode for production workloads. Pipeline history becomes invaluable when debugging complex failures or demonstrating compliance, making Tekton Results an essential component of mature CI/CD platforms.
