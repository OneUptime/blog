# How to Set Up Flux on AKS with Confidential Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Confidential Containers, Security, TEE, Kata Containers, Encryption

Description: Learn how to set up Flux CD on AKS with Confidential Containers to deploy workloads in hardware-based trusted execution environments through GitOps.

---

## Introduction

Confidential Containers on AKS run workloads inside hardware-based Trusted Execution Environments (TEEs), providing memory encryption and isolation that protects data even from the host operating system and hypervisor. This is critical for workloads that process sensitive data such as financial records, healthcare information, or cryptographic keys.

Deploying confidential workloads through Flux brings GitOps automation to this security-sensitive domain. All container configurations, security policies, and attestation settings are version-controlled and reconciled automatically. This guide covers setting up an AKS cluster with confidential node pools, bootstrapping Flux, and deploying workloads into confidential containers.

## Prerequisites

- An Azure subscription with access to confidential computing resources
- Azure CLI version 2.48 or later
- Flux CLI version 2.0 or later
- A region that supports AMD SEV-SNP confidential VMs (such as East US, West Europe)

## Step 1: Create an AKS Cluster with a Confidential Node Pool

Create a cluster with a standard system node pool and a confidential user node pool:

```bash
az aks create \
  --resource-group my-resource-group \
  --name my-confidential-cluster \
  --location eastus \
  --node-count 2 \
  --node-vm-size Standard_D4s_v5 \
  --enable-managed-identity \
  --generate-ssh-keys

az aks nodepool add \
  --resource-group my-resource-group \
  --cluster-name my-confidential-cluster \
  --name confpool \
  --node-count 2 \
  --node-vm-size Standard_DC4as_cc_v5 \
  --os-type Linux \
  --workload-runtime KataCcIsolation
```

The `Standard_DC4as_cc_v5` VM size supports AMD SEV-SNP, and `KataCcIsolation` enables the Kata Containers runtime with confidential computing support.

## Step 2: Get Cluster Credentials

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-confidential-cluster

kubectl get nodes -o wide
```

You should see nodes from both pools. The confidential node pool nodes will show the `KataCcIsolation` runtime class.

## Step 3: Verify the Runtime Class

Check that the Kata confidential runtime class is available:

```bash
kubectl get runtimeclasses
```

You should see a runtime class named `kata-cc-isolation` or similar.

## Step 4: Bootstrap Flux

Bootstrap Flux on the standard node pool. Flux controllers do not need to run on confidential nodes:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-confidential-cluster \
  --personal
```

Ensure Flux pods run on the standard node pool by adding node selectors:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-confidential-cluster
  prune: true
  patches:
    - target:
        kind: Deployment
        namespace: flux-system
      patch: |
        - op: add
          path: /spec/template/spec/nodeSelector
          value:
            kubernetes.io/os: linux
            agentpool: nodepool1
```

## Step 5: Deploy a Confidential Workload Through Flux

Create a deployment that uses the confidential runtime class:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: confidential-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: confidential-app
  template:
    metadata:
      labels:
        app: confidential-app
    spec:
      runtimeClassName: kata-cc-isolation
      nodeSelector:
        agentpool: confpool
      containers:
        - name: confidential-app
          image: myacr.azurecr.io/confidential-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
```

## Step 6: Configure a Security Policy

Confidential containers use security policies to define what the container is allowed to do inside the TEE. Create a policy through Flux:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: confidential-policy
  namespace: default
data:
  policy.rego: |
    package policy

    default allow_all := false

    allow_all {
      input.containerID != ""
      input.layers != null
    }

    default allow_properties_access := false

    allow_properties_access {
      input.containerID != ""
    }

    default allow_env_list := false

    allow_env_list {
      not contains_sensitive_env(input.envList)
    }

    contains_sensitive_env(envList) {
      env := envList[_]
      startswith(env, "AZURE_")
    }
```

## Step 7: Deploy a Service to Expose the Confidential Workload

```yaml
apiVersion: v1
kind: Service
metadata:
  name: confidential-app
  namespace: default
spec:
  selector:
    app: confidential-app
  ports:
    - port: 443
      targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: confidential-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - confidential.example.com
      secretName: confidential-tls
  rules:
    - host: confidential.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: confidential-app
                port:
                  number: 443
```

## Step 8: Set Up Attestation Verification

Configure remote attestation to verify that your workloads are running in a genuine TEE:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: attestation-verifier
  namespace: default
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            agentpool: confpool
          runtimeClassName: kata-cc-isolation
          containers:
            - name: verifier
              image: myacr.azurecr.io/attestation-verifier:latest
              env:
                - name: MAA_ENDPOINT
                  value: "https://myattestation.eus.attest.azure.net"
          restartPolicy: OnFailure
```

## Step 9: Organize with Flux Kustomizations

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: confidential-workloads
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/confidential
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: confidential-app
      namespace: default
```

## Verifying the Setup

Check that confidential workloads are running:

```bash
flux get kustomizations
kubectl get pods -n default -o wide
kubectl describe pod -l app=confidential-app | grep "Runtime Class"
```

Verify the pod is using the Kata runtime:

```bash
kubectl get pod -l app=confidential-app -o jsonpath='{.items[0].spec.runtimeClassName}'
```

## Troubleshooting

**Pods stuck in Pending**: Ensure the confidential node pool has available capacity. The `Standard_DC4as_cc_v5` VMs may have quota limits in your subscription.

**Runtime class not found**: Verify the node pool was created with `--workload-runtime KataCcIsolation`. The runtime class is only available on nodes with this configuration.

**Attestation failures**: Check that the Microsoft Azure Attestation endpoint is correct and that the TEE report is valid. Network policies must allow outbound access to the attestation service.

**Performance overhead**: Confidential containers have higher startup times and memory overhead compared to standard containers. Adjust resource limits accordingly and expect slightly longer pod scheduling times.

## Conclusion

Running Flux with Confidential Containers on AKS brings GitOps automation to the highest levels of workload security. Your sensitive applications run in hardware-isolated TEEs while their deployment configuration remains version-controlled and automatically reconciled. This combination is particularly valuable for regulated industries where both operational automation and data protection are requirements.
