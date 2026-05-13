# How to Deploy Prefect Worker on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Prefect, Workflow Orchestration, Data Engineering, HelmRelease

Description: Learn how to deploy Prefect workflow orchestration workers to Kubernetes using Flux CD HelmRelease for GitOps-managed data pipeline execution.

---

## Introduction

Prefect is a modern workflow orchestration platform that separates the control plane (Prefect Cloud or self-hosted server) from the execution layer (workers). Workers run in your infrastructure and execute flows on demand, while the server handles scheduling, observability, and state management. Deploying Prefect workers on Kubernetes with Flux CD gives you scalable, GitOps-managed workflow execution.

With the Prefect work pool model, you define a Kubernetes work pool in Prefect and deploy workers that poll for scheduled runs. Workers can use Kubernetes Jobs to execute each flow run in isolation, ensuring clean environments and preventing resource contention between concurrent flows. Flux CD manages the worker deployment, ensuring it is always running with the correct configuration.

In this guide you will deploy Prefect workers using the official Helm chart via Flux CD, configure Kubernetes work pools, and set up flow deployments that execute as Kubernetes Jobs.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A Prefect Cloud account (or self-hosted Prefect server)
- A Prefect API key for worker authentication
- Basic understanding of Prefect concepts (flows, deployments, work pools, workers)

## Step 1: Add the Prefect HelmRepository

```yaml
# clusters/production/sources/prefect.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prefect
  namespace: flux-system
spec:
  interval: 1h
  url: https://prefecthq.github.io/prefect-helm
```

## Step 2: Create the Prefect API Key Secret

```yaml
# clusters/production/secrets/prefect-api-key-secret.yaml
# Encrypt with SOPS before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: prefect-api-key
  namespace: prefect
type: Opaque
stringData:
  # Your Prefect Cloud API key or server key
  key: "pnu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Step 3: Deploy Prefect Worker with Flux

```yaml
# clusters/production/apps/prefect-worker-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prefect-worker
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: prefect
  install:
    createNamespace: true
  chart:
    spec:
      chart: prefect-worker
      version: "2026.x"
      sourceRef:
        kind: HelmRepository
        name: prefect
  values:
    worker:
      # Prefect API configuration
      apiConfig: cloud
      cloudApiConfig:
        accountId: "your-prefect-account-id"
        workspaceId: "your-prefect-workspace-id"
        apiKeySecret:
          name: prefect-api-key
          key: key

      # Work pool name (must match what's created in Prefect Cloud)
      config:
        workPool: "production-k8s-pool"
        jobNamespace: "prefect-flows"

      # Worker image - use the same Python version as your flows
      image:
        repository: prefecthq/prefect
        prefectTag: "3-python3.11-kubernetes"
        pullPolicy: IfNotPresent

      # Number of worker replicas (multiple workers poll the same work pool)
      replicaCount: 2

      # Resources for the worker process itself (not the flow run jobs)
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi

      # Use a fixed cluster UID instead of requiring permission to read kube-system
      clusterUid: "production"

      # Extra environment variables for the worker
      extraEnvVars:
        - name: PREFECT_LOGGING_LEVEL
          value: "INFO"

    # Service account for workers
    serviceAccount:
      create: true
      annotations:
        # If using AWS EKS with IAM roles for service accounts
        eks.amazonaws.com/role-arn: "arn:aws:iam::123456789:role/prefect-worker-role"
```

## Step 4: Configure the Kubernetes Work Pool in Prefect

Define the base job template for flows executed in this work pool.

```python
# prefect_config/work_pool_setup.py
# Run this once to configure the work pool in Prefect Cloud
from prefect.client.orchestration import get_client
from prefect.client.schemas.actions import WorkPoolCreate
import asyncio

async def setup_work_pool():
    async with get_client() as client:
        await client.create_work_pool(
            work_pool=WorkPoolCreate(
                name="production-k8s-pool",
                type="kubernetes",
                base_job_template={
                    "job_configuration": {
                        "image": "{{ image }}",
                        "namespace": "prefect-flows",
                        "job_manifest": {
                            "apiVersion": "batch/v1",
                            "kind": "Job",
                            "metadata": {
                                "labels": "{{ labels }}",
                                "namespace": "{{ namespace }}",
                                "generateName": "{{ name }}-"
                            },
                            "spec": {
                                "ttlSecondsAfterFinished": "{{ finished_job_ttl }}",
                                "template": {
                                    "spec": {
                                        "serviceAccountName": "prefect-flow-runner",
                                        "restartPolicy": "Never",
                                        "containers": [{
                                            "name": "prefect-job",
                                            "image": "{{ image }}",
                                            "imagePullPolicy": "{{ image_pull_policy }}",
                                            "env": "{{ env }}",
                                            "args": "{{ command }}",
                                            "resources": {
                                                "requests": {
                                                    "cpu": "500m",
                                                    "memory": "1Gi"
                                                },
                                                "limits": {
                                                    "cpu": "2000m",
                                                    "memory": "4Gi"
                                                }
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    },
                    "variables": {
                        "type": "object",
                        "properties": {
                            "image": {
                                "type": "string",
                                "default": "myregistry/prefect-flows:latest"
                            },
                            "image_pull_policy": {
                                "type": "string",
                                "default": "IfNotPresent"
                            },
                            "finished_job_ttl": {
                                "type": "integer",
                                "default": 3600
                            }
                        }
                    }
                }
            )
        )

asyncio.run(setup_work_pool())
```

## Step 5: Create RBAC for Flow Execution Jobs

```yaml
# apps/prefect/flow-execution-rbac.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prefect-flows
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prefect-flow-runner
  namespace: prefect-flows
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prefect-worker
  namespace: prefect-flows
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list", "watch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prefect-worker
  namespace: prefect-flows
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: prefect-worker
subjects:
  - kind: ServiceAccount
    name: prefect-worker
    namespace: prefect
```

## Step 6: Create Flux Kustomization

```yaml
# clusters/production/apps/prefect-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prefect
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/prefect
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: prefect-worker
      namespace: prefect
```

## Step 7: Verify Workers and Test Flow Execution

```bash
# Check worker pods are running
kubectl get pods -n prefect

# View worker logs to confirm it's connected to Prefect Cloud
kubectl logs -n prefect -l app.kubernetes.io/name=prefect-worker -f

# Watch for flow run job creation
kubectl get jobs -n prefect-flows -w

# Check flow run pod logs
kubectl logs -n prefect-flows -l prefect.io/flow-run-name=my-flow-run -f

# Force reconcile if worker config changes
flux reconcile helmrelease prefect-worker --with-source -n flux-system

# Verify HelmRelease is healthy
flux get helmrelease prefect-worker -n flux-system
```

## Step 8: Update Flow Image

When your flow dependencies change, update the flow image used by the work pool or your deployment `job_variables` in Git.

```yaml
# Update the default image in the base job template:
variables:
  properties:
    image:
      default: "myregistry/prefect-flows:2026.03"
```

Flux detects the change and reconciles the worker deployment if you manage the base job template through the HelmRelease.

## Best Practices

- Deploy multiple worker replicas to handle concurrent flow submissions and worker restarts
- Use a dedicated namespace (`prefect-flows`) for flow run Jobs, separate from the worker deployment namespace
- Set `ttlSecondsAfterFinished` on the base job template to auto-clean completed flow run pods
- Use SOPS to encrypt the Prefect API key Secret before committing to Git
- Configure resource limits on the base job template appropriate to your heaviest flows
- Use Prefect's work pool job variables to allow per-deployment resource overrides

## Conclusion

Deploying Prefect workers on Kubernetes with Flux CD gives your data engineering team a scalable, GitOps-managed workflow execution platform. Workers are deployed declaratively, configured via Git, and reconciled continuously by Flux. When your team needs to update worker dependencies, add more replicas, or change resource limits, they submit a pull request, and Flux applies the change automatically. Prefect handles flow scheduling and observability while Kubernetes and Flux manage the execution infrastructure.
