# How to Set Up Sigstore Policy Controller with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Sigstore, Policy Controller, Admission Control, Cosign

Description: Learn how to deploy and configure the Sigstore Policy Controller with Flux to enforce container image signature verification at the cluster level.

---

The Sigstore Policy Controller is a Kubernetes admission controller that enforces image signature and attestation policies before pods are admitted to a cluster. By deploying it through Flux, you can manage your image verification policies using GitOps. This guide explains how to set up the Sigstore Policy Controller with Flux to enforce supply chain security policies.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed and bootstrapped on the cluster
- kubectl configured to communicate with your cluster
- A Git repository connected to Flux for managing cluster resources
- Helm CLI (v3.0 or later) for reference

## Step 1: Add the Sigstore Helm Repository as a Flux Source

Create a HelmRepository resource to reference the Sigstore Helm chart repository:

```yaml
# clusters/my-cluster/sigstore/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sigstore
  namespace: flux-system
spec:
  interval: 1h
  url: https://sigstore.github.io/helm-charts
```

Apply this to your Git repository and let Flux reconcile it:

```bash
# Commit and push the HelmRepository resource
git add clusters/my-cluster/sigstore/helmrepository.yaml
git commit -m "Add Sigstore Helm repository source"
git push
```

## Step 2: Deploy the Policy Controller Using a HelmRelease

Create a HelmRelease resource to deploy the Sigstore Policy Controller:

```yaml
# clusters/my-cluster/sigstore/policy-controller.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: policy-controller
  namespace: cosign-system
spec:
  interval: 30m
  chart:
    spec:
      chart: policy-controller
      version: "0.9.x"
      sourceRef:
        kind: HelmRepository
        name: sigstore
        namespace: flux-system
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    webhook:
      failurePolicy: Fail
      namespaceSelector:
        matchExpressions:
          - key: policy.sigstore.dev/include
            operator: In
            values: ["true"]
    loglevel: info
```

Commit and push:

```bash
git add clusters/my-cluster/sigstore/policy-controller.yaml
git commit -m "Deploy Sigstore Policy Controller via Flux"
git push
```

## Step 3: Wait for the Policy Controller to Deploy

Monitor the deployment through Flux:

```bash
# Check the HelmRelease status
flux get helmreleases -n cosign-system

# Watch the pods
kubectl get pods -n cosign-system -w

# Check the webhook configuration
kubectl get validatingwebhookconfigurations | grep policy
```

## Step 4: Create a ClusterImagePolicy for Flux Images

Define a policy that requires Flux controller images to have valid Cosign signatures:

```yaml
# clusters/my-cluster/sigstore/flux-image-policy.yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: flux-images
spec:
  images:
    - glob: "ghcr.io/fluxcd/*"
  authorities:
    - keyless:
        url: https://fulcio.sigstore.dev
        identities:
          - issuer: https://token.actions.githubusercontent.com
            subjectRegExp: "https://github.com/fluxcd/.*"
      ctlog:
        url: https://rekor.sigstore.dev
```

## Step 5: Create a ClusterImagePolicy for Application Images

Define policies for your application container images:

```yaml
# clusters/my-cluster/sigstore/app-image-policy.yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: application-images
spec:
  images:
    - glob: "myregistry.example.com/myorg/*"
  authorities:
    - key:
        data: |
          -----BEGIN PUBLIC KEY-----
          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...your-public-key...
          -----END PUBLIC KEY-----
```

## Step 6: Enable Policy Enforcement on Target Namespaces

Label the namespaces where you want the Policy Controller to enforce image verification:

```yaml
# clusters/my-cluster/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    policy.sigstore.dev/include: "true"
```

Apply the label to existing namespaces:

```bash
kubectl label namespace production policy.sigstore.dev/include=true
kubectl label namespace staging policy.sigstore.dev/include=true
```

## Step 7: Test the Policy Enforcement

Test that unsigned images are rejected:

```bash
# This should be rejected if the image is not signed
kubectl run test-unsigned --image=docker.io/library/nginx:latest -n production

# Expected output:
# Error from server (BadRequest): admission webhook "policy.sigstore.dev" denied the request:
# validation failed: no matching signatures
```

Test that signed images are accepted:

```bash
# Flux images should pass verification
kubectl run test-signed --image=ghcr.io/fluxcd/source-controller:v1.2.0 -n production --dry-run=server
```

## Verification

After completing the setup, verify the following:

1. The Policy Controller pods are running in the cosign-system namespace:

```bash
kubectl get pods -n cosign-system
```

2. The ClusterImagePolicy resources are created:

```bash
kubectl get clusterimagepolicies
```

3. The webhook is active:

```bash
kubectl get validatingwebhookconfigurations -l app.kubernetes.io/name=policy-controller
```

4. Policy enforcement is working by deploying a test workload in a labeled namespace.

## Troubleshooting

### Policy Controller pods are not starting

Check the HelmRelease status and events:

```bash
flux get helmrelease policy-controller -n cosign-system
kubectl describe helmrelease policy-controller -n cosign-system
kubectl get events -n cosign-system --sort-by='.lastTimestamp'
```

### Webhook is rejecting all images

If the webhook rejects everything, check that the failure policy and namespace selector are configured correctly:

```bash
kubectl get validatingwebhookconfiguration policy-controller-webhook -o yaml
```

Temporarily set the failure policy to Ignore while debugging:

```yaml
# In the HelmRelease values
values:
  webhook:
    failurePolicy: Ignore
```

### Flux system namespace images are being blocked

Ensure the flux-system namespace is not labeled for policy enforcement, or add Flux images to a permissive policy:

```bash
# Check if flux-system is labeled
kubectl get namespace flux-system --show-labels

# Remove the label if present
kubectl label namespace flux-system policy.sigstore.dev/include-
```

### ClusterImagePolicy not matching images

Verify the glob pattern in your policy matches the images being pulled:

```bash
# Check the policy configuration
kubectl get clusterimagepolicy flux-images -o yaml

# Verify image references in your deployments
kubectl get pods -n production -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}'
```

## Summary

Deploying the Sigstore Policy Controller with Flux provides automated, cluster-wide enforcement of image signature verification. By defining ClusterImagePolicy resources and managing them through GitOps, you create a consistent and auditable approach to supply chain security. This setup ensures that only verified container images can run in your protected namespaces, significantly reducing the risk of deploying compromised or unauthorized software.
