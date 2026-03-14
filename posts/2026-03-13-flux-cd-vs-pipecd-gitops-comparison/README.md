# Flux CD vs PipeCD: GitOps Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, PipeCD, GitOps, Kubernetes, CD, Comparison

Description: A comprehensive comparison of Flux CD and PipeCD as GitOps tools, covering architecture, features, and use cases for Kubernetes continuous delivery.

---

## Introduction

PipeCD is a CNCF Sandbox project that provides a unified GitOps platform supporting Kubernetes, Terraform, Cloud Run, Lambda, and ECS. Unlike Flux CD, which focuses exclusively on Kubernetes and uses a purely pull-based model, PipeCD supports multiple deployment platforms and provides a richer built-in progressive delivery experience.

This comparison helps teams evaluate whether Flux CD's Kubernetes-native depth or PipeCD's multi-platform breadth better fits their requirements.

## Prerequisites

- A Kubernetes cluster
- A Git repository for application configuration
- Understanding of GitOps principles

## Step 1: Flux CD Architecture Overview

Flux CD operates as a set of Kubernetes controllers using the pull model exclusively:

```yaml
# Flux manages Kubernetes resources via GitRepository + Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 2: PipeCD Architecture Overview

PipeCD uses a control plane (piped server) and per-cluster piped agents. Applications are defined with a `.pipe.yaml` file in the application repository:

```yaml
# .pipe.yaml - PipeCD application definition
apiVersion: pipecd.dev/v1beta1
kind: KubernetesApp
spec:
  name: myapp
  labels:
    env: production
    team: backend
  input:
    manifests:
      - kubernetes/
    kubectlVersion: "1.29"
  pipeline:
    stages:
      - name: K8S_PRIMARY_ROLLOUT
        desc: Deploy primary
      - name: WAIT_APPROVAL
        desc: Require manual approval
      - name: K8S_TRAFFIC_ROUTING
        desc: Route 100% traffic
```

## Step 3: Progressive Delivery Comparison

**Flux CD** delegates progressive delivery to Flagger, which operates independently as a Kubernetes operator.

**PipeCD** has built-in progressive delivery for Kubernetes without additional tools:

```yaml
# PipeCD Canary deployment (built-in, no Flagger required)
pipeline:
  stages:
    - name: K8S_CANARY_ROLLOUT
      with:
        replicas: 10%  # Start with 10% of traffic
    - name: WAIT
      with:
        duration: 10m
    - name: K8S_TRAFFIC_ROUTING
      with:
        primary: 80
        canary: 20
    - name: WAIT_APPROVAL
    - name: K8S_PRIMARY_ROLLOUT
    - name: K8S_CANARY_CLEAN
```

## Comparison Table

| Feature | Flux CD | PipeCD |
|---|---|---|
| Kubernetes support | Yes (primary focus) | Yes |
| Terraform support | No | Yes |
| Cloud Run support | No | Yes |
| Lambda/ECS support | No | Yes |
| Built-in canary | No (via Flagger) | Yes, native |
| Manual approval gates | No (via Jobs) | Yes, native |
| Multi-platform GitOps | No | Yes |
| SOPS secrets | Yes, native | Limited |
| OCI artifacts | Yes | Partial |
| CNCF project | Yes (Graduated) | Yes (Sandbox) |
| Maturity | High | Growing |

## Step 4: Multi-Platform Considerations

If your organization deploys workloads across Kubernetes, Terraform, and serverless functions, PipeCD provides a unified GitOps experience:

```yaml
# PipeCD Terraform app definition
apiVersion: pipecd.dev/v1beta1
kind: TerraformApp
spec:
  name: vpc-infrastructure
  input:
    workingDir: terraform/vpc
  pipeline:
    stages:
      - name: TERRAFORM_PLAN
      - name: WAIT_APPROVAL
      - name: TERRAFORM_APPLY
```

Flux CD would require external tools (Terraform Cloud, Atlantis) for this use case.

## Best Practices

- Choose Flux CD when your workloads are exclusively Kubernetes and you want the deepest native integration with Kubernetes RBAC, SOPS, and OCI.
- Choose PipeCD when you manage multiple deployment targets (K8s + Terraform + serverless) and want a single GitOps interface.
- If progressive delivery without Flagger is important, PipeCD's built-in canary support reduces operational complexity.
- Consider PipeCD's maturity level (CNCF Sandbox vs. Flux CD's CNCF Graduated status) when making production commitments.

## Conclusion

Flux CD and PipeCD serve different audiences. Flux CD is the mature, deeply Kubernetes-native choice for teams managing Kubernetes exclusively. PipeCD is a compelling option for teams needing multi-platform GitOps with built-in progressive delivery. As PipeCD matures in the CNCF ecosystem, it may close the feature gap, but today Flux CD remains the more battle-tested option for Kubernetes-only workloads.
