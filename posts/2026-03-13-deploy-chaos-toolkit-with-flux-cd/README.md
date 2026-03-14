# How to Deploy Chaos Toolkit with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Toolkit

Description: Deploy Chaos Toolkit chaos experiments to Kubernetes using Flux CD, running experiments as Kubernetes Jobs managed through GitOps.

---

## Introduction

Chaos Toolkit is an open-source chaos engineering framework that defines experiments as simple JSON or YAML files. Unlike Chaos Mesh or LitmusChaos, Chaos Toolkit is a CLI-first tool, which means integrating it with Kubernetes requires wrapping experiments in Kubernetes Jobs or CronJobs. This model actually pairs excellently with Flux CD - each experiment becomes a declarative Kubernetes workload tracked in Git.

The approach in this guide packages Chaos Toolkit experiments as container-based Kubernetes Jobs. Flux CD watches the Git repository and automatically applies new or updated experiments to the cluster. This gives you the flexibility of Chaos Toolkit's Python-based extension ecosystem while maintaining GitOps-grade auditability.

By the end of this tutorial, you will have a GitOps workflow where adding a new Chaos Toolkit experiment is as simple as committing a JSON experiment file and a Kubernetes Job manifest to your repository.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Docker registry accessible from the cluster (for the Chaos Toolkit image)
- `flux` and `kubectl` CLI tools
- Git repository connected to Flux CD

## Step 1: Create the Chaos Toolkit Namespace

```yaml
# clusters/my-cluster/chaos-toolkit/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chaos-toolkit
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Create a ConfigMap for the Experiment Definition

Store the Chaos Toolkit experiment as a ConfigMap so it can be mounted into the Job pod without rebuilding the image.

```yaml
# clusters/my-cluster/chaos-toolkit/experiments/pod-termination-experiment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pod-termination-experiment
  namespace: chaos-toolkit
data:
  experiment.json: |
    {
      "title": "Pod Termination Resilience",
      "description": "Verify the service recovers after a pod is terminated",
      "tags": ["kubernetes", "pod", "resilience"],
      "steady-state-hypothesis": {
        "title": "Service is available",
        "probes": [
          {
            "type": "probe",
            "name": "service-responds",
            "tolerance": 200,
            "provider": {
              "type": "http",
              "url": "http://nginx.default.svc.cluster.local/health"
            }
          }
        ]
      },
      "method": [
        {
          "type": "action",
          "name": "terminate-pod",
          "provider": {
            "type": "python",
            "module": "chaosk8s.pod.actions",
            "func": "terminate_pods",
            "arguments": {
              "label_selector": "app=nginx",
              "ns": "default",
              "qty": 1
            }
          }
        }
      ],
      "rollbacks": []
    }
```

## Step 3: Create RBAC for the Chaos Toolkit Job

```yaml
# clusters/my-cluster/chaos-toolkit/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: chaos-toolkit
  namespace: chaos-toolkit
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: chaos-toolkit
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: chaos-toolkit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: chaos-toolkit
subjects:
  - kind: ServiceAccount
    name: chaos-toolkit
    namespace: chaos-toolkit
```

## Step 4: Define the Chaos Experiment as a Kubernetes Job

```yaml
# clusters/my-cluster/chaos-toolkit/experiments/pod-termination-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: chaos-pod-termination
  namespace: chaos-toolkit
  labels:
    app: chaos-toolkit
    experiment: pod-termination
spec:
  # Retain job history for inspection
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      serviceAccountName: chaos-toolkit
      restartPolicy: Never
      containers:
        - name: chaos-toolkit
          # Official Chaos Toolkit image with Kubernetes driver
          image: chaostoolkit/chaostoolkit:latest
          command: ["chaos", "run", "/experiments/experiment.json"]
          volumeMounts:
            - name: experiment
              mountPath: /experiments
          env:
            - name: CHAOSTOOLKIT_LOADER_PATH
              value: /experiments
      volumes:
        - name: experiment
          configMap:
            name: pod-termination-experiment
```

## Step 5: Use a CronJob for Scheduled Experiments

```yaml
# clusters/my-cluster/chaos-toolkit/experiments/scheduled-experiment.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: chaos-pod-termination-scheduled
  namespace: chaos-toolkit
spec:
  # Run every day at 2 AM during business hours
  schedule: "0 2 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: chaos-toolkit
          restartPolicy: Never
          containers:
            - name: chaos-toolkit
              image: chaostoolkit/chaostoolkit:latest
              command: ["chaos", "run", "/experiments/experiment.json"]
              volumeMounts:
                - name: experiment
                  mountPath: /experiments
          volumes:
            - name: experiment
              configMap:
                name: pod-termination-experiment
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/chaos-toolkit/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: chaos-toolkit
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/chaos-toolkit
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Best Practices

- Version your experiment JSON files in Git alongside the Job manifests to keep the experiment and its runner in sync.
- Use `ttlSecondsAfterFinished` on Jobs so completed experiments are cleaned up automatically.
- Mount experiment files via ConfigMaps rather than baking them into container images to iterate faster.
- Use separate Jobs for each experiment to keep failure domains isolated and results easy to attribute.
- Integrate the chaos-toolkit Job results with a notification system using Flux alerts or a post-job webhook.

## Conclusion

Chaos Toolkit's file-based experiment model fits naturally into a GitOps workflow managed by Flux CD. By packaging experiments as Kubernetes Jobs tracked in Git, you gain full auditability, easy rollback, and the ability to schedule or trigger experiments through the same pull request process used for all other infrastructure changes.
