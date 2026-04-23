# How to Set Up Image Policy in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Image Policy, Policy Enforcement

Description: Implement image policies in Rancher to control which container images can be deployed, enforce security standards, and prevent use of untrusted images.

## Introduction

Image policies control which container images are allowed to run in your Kubernetes clusters. By enforcing image policies, you can prevent deployment of images from untrusted registries, ensure images are vulnerability-free, require image signing, and maintain compliance standards. This guide covers implementing image policies with admission controllers such as Kyverno and OPA Gatekeeper in Rancher-managed clusters.

## Prerequisites

- Rancher managing clusters with admission control support
- kubectl access with cluster-admin permissions
- Optional: Harbor with vulnerability scanning configured, plus Kubewarden, OPA Gatekeeper, or Kyverno installed

## Step 1: Enforce Registry Allow-listing with Kyverno

Install Kyverno for policy enforcement:

```bash
# Install Kyverno

helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace
```

Create a policy to restrict image registries:

```yaml
# allowed-registries-policy.yaml - Only allow images from trusted registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/description: >-
      Only allow container images from approved registries.
spec:
  background: true
  rules:
    - name: check-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      validate:
        failureAction: Enforce
        message: "Images must come from approved registries: registry.example.com, harbor.internal"
        pattern:
          spec:
            "=(ephemeralContainers)":
              - image: "registry.example.com/* | harbor.internal/*"
            containers:
              # Allow only specific registry prefixes
              - image: "registry.example.com/* | harbor.internal/*"
            "=(initContainers)":
              - image: "registry.example.com/* | harbor.internal/*"
```

## Step 2: Block Latest Tag Usage

```yaml
# no-latest-tag-policy.yaml - Prevent use of mutable 'latest' tag
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
  annotations:
    policies.kyverno.io/title: Disallow Latest Tag
    policies.kyverno.io/description: >-
      Using :latest makes deployments unpredictable. Require explicit tags or digests.
spec:
  background: true
  rules:
    - name: disallow-latest-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "Images must use an explicit tag or digest; ':latest' and omitted tags are not allowed"
        deny:
          conditions:
            any:
              - key: "{{ images.containers.*.tag || `[]` }}"
                operator: AnyIn
                value:
                  - latest
              - key: "{{ images.initContainers.*.tag || `[]` }}"
                operator: AnyIn
                value:
                  - latest
              - key: "{{ images.ephemeralContainers.*.tag || `[]` }}"
                operator: AnyIn
                value:
                  - latest
```

## Step 3: Enforce Image Digest Pinning

```yaml
# require-digest-policy.yaml - Require images to be pinned by digest
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
  annotations:
    policies.kyverno.io/title: Require Image Digest
spec:
  rules:
    - name: check-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      validate:
        failureAction: Enforce
        message: "Production images must be pinned by digest (sha256:...)"
        foreach:
          - list: "request.object.spec.containers"
            pattern:
              image: "*@sha256:*"
          - list: "request.object.spec.initContainers"
            pattern:
              image: "*@sha256:*"
          - list: "request.object.spec.ephemeralContainers"
            pattern:
              image: "*@sha256:*"
```

## Step 4: Validate Vulnerability Scanning with Harbor

Harbor enforces this at the registry and project layer rather than through a Kyverno `ClusterPolicy`. Configure Harbor to scan images on push and block vulnerable images from being pulled:

1. Open the Harbor project that stores your production images.
2. Enable **Automatically scan images on push**.
3. Enable **Prevent vulnerable images from running** and choose the severity threshold you want to enforce.
4. If you need the raw scan report, Harbor exposes it through the API endpoint `/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/additions/vulnerabilities`.

## Step 5: Enforce Image Signing with Cosign

Verify that images are signed using Sigstore/Cosign:

```yaml
# verify-image-signature.yaml - Enforce signed images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  rules:
    - name: check-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/production/*"
          failureAction: Enforce
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/myorg/my-app/.github/workflows/release.yml@refs/heads/main"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Step 6: Using OPA Gatekeeper for Image Policies

```yaml
# gatekeeper-allowed-registries.yaml - OPA Gatekeeper constraint template
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          satisfied := [repo | repo := input.parameters.repos[_]; startswith(container.image, repo)]
          count(satisfied) == 0
          msg := sprintf("Container image '%v' is not from an allowed repository.", [container.image])
        }
---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  parameters:
    repos:
      - "registry.example.com/"
      - "harbor.internal/"
```

## Step 7: Audit Existing Workloads for Policy Compliance

```bash
# Find all container images not from approved registries
kubectl get pods --all-namespaces -o go-template='{{range .items}}{{ $ns := .metadata.namespace }}{{ $name := .metadata.name }}{{range .spec.initContainers}}{{printf "%s\t%s\t%s\n" $ns $name .image}}{{end}}{{range .spec.containers}}{{printf "%s\t%s\t%s\n" $ns $name .image}}{{end}}{{range .spec.ephemeralContainers}}{{printf "%s\t%s\t%s\n" $ns $name .image}}{{end}}{{end}}' | \
  awk '$3 !~ /^(registry\.example\.com|harbor\.internal)\//'

# Generate a Kyverno policy report
kubectl get policyreports --all-namespaces -o wide
```

## Step 8: Rancher OPA Integration

Enable OPA integration in Rancher if your Rancher version still includes the built-in Gatekeeper integration:

1. Navigate to **Cluster Management** and click **Explore** for the target cluster.
2. In the cluster sidebar, go to **Apps** > **Charts**.
3. Install **OPA Gatekeeper**.
4. Configure constraint templates and constraints through the Rancher UI.

On recent Rancher releases, Rancher's documentation marks OPA Gatekeeper as deprecated and recommends Kubewarden as the replacement policy engine.

## Conclusion

Image policies are a critical security control for production Kubernetes environments. Start with registry allow-listing to prevent image pulls from untrusted sources, then progressively add controls like tag restrictions, vulnerability scanning requirements, and image signing. Use Kyverno or a policy engine such as OPA Gatekeeper or Kubewarden through Rancher for a comprehensive policy enforcement approach, and regularly audit your clusters to catch policy violations before they become security incidents.
