# How to Migrate from HashiCorp Nomad to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nomad, Kubernetes, Migration, Container Orchestration

Description: Learn how to migrate workloads from HashiCorp Nomad to Rancher-managed Kubernetes, translating Nomad job specifications to Kubernetes deployment manifests.

## Introduction

HashiCorp Nomad is a flexible workload orchestrator that supports containers, VMs, and raw executables. As Kubernetes has become the industry standard, many teams migrate from Nomad to Rancher-managed Kubernetes to take advantage of the broader ecosystem, better tooling, and team familiarity.

## Nomad vs. Kubernetes Concept Mapping

| Nomad | Kubernetes (Rancher) |
|---|---|
| Job | Deployment / CronJob |
| Task Group | Pod |
| Task | Container |
| Service (Consul) | Service + DNS |
| Volume | PersistentVolumeClaim |
| Namespace | Namespace |
| Token (ACL) | ServiceAccount / RBAC |
| Allocation | Pod Instance |

## Step 1: Export Nomad Job Definitions

```bash
# List all jobs

nomad job status

# Inspect a job (JSON is the default output)
nomad job inspect myapp > myapp-job.json

# Output the original HCL submitted with the job
nomad job inspect -hcl myapp
```

## Step 2: Convert a Nomad Job to a Kubernetes Deployment

Given this Nomad job:

```hcl
job "api" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 3

    task "server" {
      driver = "docker"

      config {
        image = "myapi:2.0.0"
        ports = ["http"]
      }

      resources {
        cpu    = 500
        memory = 512
      }

      env {
        APP_ENV      = "production"
        LOG_LEVEL    = "info"
      }

      service {
        name = "api"
        port = "http"
        check {
          type     = "http"
          path     = "/health"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }

    network {
      port "http" {
        to = 8080
      }
    }
  }
}
```

Equivalent Kubernetes Deployment and Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: server
          image: myapi:2.0.0
          ports:
            - containerPort: 8080
          env:
            - name: APP_ENV
              value: "production"
            - name: LOG_LEVEL
              value: "info"
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            periodSeconds: 10
            timeoutSeconds: 2
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
```

## Step 3: Handle Nomad Batch Jobs

Convert `type = "batch"` Nomad jobs to Kubernetes Jobs or CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-processor
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: processor
              image: data-processor:1.0.0
              env:
                - name: DB_URL
                  valueFrom:
                    secretKeyRef:
                      name: app-secrets
                      key: DB_URL
```

## Step 4: Replace Consul Service Discovery

Nomad relies on Consul for service discovery. Kubernetes has built-in DNS:

- Service `api` in namespace `production` is reachable at: `api.production.svc.cluster.local`
- Short form within the same namespace: `api`

Update application configurations to use Kubernetes service DNS instead of Consul DNS.

## Step 5: Deploy via Rancher

1. In Rancher, create a namespace for your workloads.
2. Navigate to **Import YAML** and apply your manifests.
3. Monitor the rollout under **Workloads** > **Deployments**.

## Step 6: Decommission Nomad

After validating all workloads:

```bash
# Stop Nomad jobs
nomad job stop api
nomad job stop data-processor

# Remove Nomad servers from load balancers
# Decommission Nomad client nodes
```

## Best Practices

- Migrate stateless services first; tackle stateful services with care.
- Run parallel deployments during cutover to validate behavior.
- Map Nomad ACL policies to Kubernetes RBAC roles.
- Replace Consul service mesh with Kubernetes-native Ingress and NetworkPolicies.
- Use Rancher Fleet for GitOps-based deployment of migrated manifests.

## Conclusion

Migrating from Nomad to Rancher-managed Kubernetes requires translating job specifications to Kubernetes manifests, but the concepts map closely. The result is a workload platform with a vast ecosystem, stronger community tooling, and centralized management through Rancher.
