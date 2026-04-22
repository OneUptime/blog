# How to Deploy Serverless Functions on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Serverless, Function, Kubernetes, FaaS, Deployment

Description: Practical guide to deploying serverless functions on Rancher covering multiple frameworks and deployment patterns.

## Introduction

Deploying serverless functions on Rancher gives you the benefits of serverless computing patterns (scale-to-zero, auto-scaling, simplified deployment) while maintaining full control over your infrastructure. This guide covers deployment patterns across multiple serverless frameworks.

## Choosing the Right Framework

| Framework | Best For | Cold Start | Scale to Zero |
|-----------|----------|-----------|---------------|
| Knative | HTTP APIs, event processing | Moderate | Yes |
| OpenFaaS | Simple functions, any language | Moderate | Yes (Pro/Edge, opt-in) |
| Fission | Low-latency APIs | Minimal with PoolMgr, higher with NewDeploy | Yes with NewDeploy minscale 0 |
| Kubeless (unmaintained) | Legacy Kubernetes-native functions | Moderate | No |
| KEDA | Event-driven scaling | N/A | Yes |

## Pattern 1: HTTP API Function

```yaml
# api-function-knative.yaml

apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: user-api
  namespace: functions
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "1"    # Keep 1 warm instance
        autoscaling.knative.dev/max-scale: "100"
        autoscaling.knative.dev/target: "200"     # 200 concurrent req/pod
    spec:
      containers:
      - image: registry.example.com/functions/user-api:v1.2.0
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
```

## Pattern 2: Batch Processing Function

```yaml
# batch-job-function.yaml
apiVersion: batch/v1
kind: Job
metadata:
  generateName: data-processor-
  namespace: functions
spec:
  completions: 10          # Process 10 items
  parallelism: 5           # 5 concurrent processors
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: processor
        image: registry.example.com/functions/data-processor:latest
        env:
        - name: BATCH_SIZE
          value: "1000"
        - name: S3_BUCKET
          value: "data-processing-bucket"
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
```

## Pattern 3: Event-Driven Function with KEDA

```yaml
# event-processor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: functions
spec:
  replicas: 0              # Start at 0, KEDA will scale
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: registry.example.com/functions/order-processor:latest
        env:
        - name: KAFKA_BROKERS
          value: "kafka.kafka.svc.cluster.local:9092"
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
  namespace: functions
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.kafka.svc.cluster.local:9092
      consumerGroup: order-processors
      topic: new-orders
      lagThreshold: "50"
```

## Pattern 4: Scheduled Function

```yaml
# scheduled-function.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
  namespace: functions
spec:
  schedule: "0 6 * * *"    # 6 AM daily
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: report-generator
            image: registry.example.com/functions/report-gen:latest
            env:
            - name: REPORT_DATE
              value: "yesterday"
            - name: SMTP_HOST
              valueFrom:
                secretKeyRef:
                  name: email-config
                  key: smtp-host
            resources:
              limits:
                cpu: "500m"
                memory: "256Mi"
```

## Function Versioning and Canary

```yaml
# Knative traffic splitting for canary deployment
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: user-api
  namespace: functions
spec:
  traffic:
  - tag: stable
    revisionName: user-api-v1
    percent: 95
  - tag: canary
    revisionName: user-api-v2
    percent: 5
  template:
    metadata:
      name: user-api-v2          # New revision
    spec:
      containers:
      - image: registry.example.com/functions/user-api:v2.0.0
```

## Function Configuration Management

```yaml
# function-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: function-config
  namespace: functions
data:
  max_retries: "3"
  timeout_seconds: "30"
  log_level: "INFO"
  feature_flags: |
    {
      "new_algorithm": true,
      "legacy_mode": false
    }
---
# Reference ConfigMap in function
spec:
  containers:
  - name: function
    envFrom:
    - configMapRef:
        name: function-config
```

## CI/CD for Functions

```yaml
# .github/workflows/deploy-function.yml
name: Deploy Function

on:
  push:
    branches: [main]
    paths: ['functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and push image
      run: |
        docker build -t registry.example.com/functions/my-func:$GITHUB_SHA \
          functions/my-func/
        docker push registry.example.com/functions/my-func:$GITHUB_SHA
    
    - name: Deploy to Rancher
      env:
        KUBECONFIG_CONTENT: ${{ secrets.KUBECONFIG }}
      run: |
        mkdir -p "$HOME/.kube"
        printf '%s' "$KUBECONFIG_CONTENT" > "$HOME/.kube/config"
        chmod 600 "$HOME/.kube/config"
        export KUBECONFIG="$HOME/.kube/config"
        kubectl patch ksvc my-function \
          --namespace functions \
          --type=json \
          -p="[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/image\",\"value\":\"registry.example.com/functions/my-func:$GITHUB_SHA\"}]"
```

## Conclusion

Serverless functions on Rancher provide flexibility in choosing the deployment pattern that best matches your use case. HTTP functions benefit from Knative's traffic management, batch jobs leverage Kubernetes Jobs, event-driven processors use KEDA, and scheduled tasks use CronJobs. The key is matching the function pattern to the trigger type and scaling requirements.
