# How to Implement Image Allow Lists on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Allow Lists, Kubernetes, Container Security, Admission Control

Description: Learn how to implement container image allow lists on Talos Linux using admission controllers to ensure only trusted images run in your cluster.

---

Allowing any container image to run in your Kubernetes cluster is a significant security risk. An attacker who gains access to create pods could deploy a cryptocurrency miner, a reverse shell, or a data exfiltration tool using any public image. Image allow lists solve this problem by restricting which container registries and images are permitted to run. On Talos Linux, where the host OS is already locked down, image allow lists close the gap at the container layer by ensuring that only vetted, trusted images make it into production.

This guide covers implementing image allow lists on Talos Linux using Kyverno, OPA Gatekeeper, and Kubernetes-native admission controls.

## Why Image Allow Lists Are Important

Without image restrictions, anyone with pod creation permissions can pull and run any image from Docker Hub, GitHub Container Registry, or any other public registry. This means:

- Unvetted images with known vulnerabilities can run in your cluster
- Images from untrusted sources could contain malware
- Developers might accidentally use development images in production
- Supply chain attacks become much easier to execute

Image allow lists restrict container images to those from approved registries, with approved names, and optionally with specific tags or digests.

## Approach 1: Kyverno Policies

Kyverno is a Kubernetes-native policy engine that is straightforward to set up and configure.

### Installing Kyverno

```bash
# Add the Kyverno Helm repository
helm repo add kyverno https://kyverno.github.io/kyverno/

# Update the chart cache
helm repo update

# Install Kyverno
helm install kyverno \
  kyverno/kyverno \
  --namespace kyverno \
  --create-namespace \
  --set replicaCount=3
```

```bash
# Verify Kyverno is running
kubectl get pods -n kyverno

# Verify the CRDs are installed
kubectl get crds | grep kyverno
```

### Creating an Image Allow List Policy

```yaml
# image-allow-list.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/description: >
      Restricts container images to approved registries only.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >
          Images must come from an approved registry.
          Allowed registries: registry.example.com, ghcr.io/myorg,
          docker.io/library
        pattern:
          spec:
            containers:
              - image: "registry.example.com/* | ghcr.io/myorg/* | docker.io/library/*"
            =(initContainers):
              - image: "registry.example.com/* | ghcr.io/myorg/* | docker.io/library/*"
            =(ephemeralContainers):
              - image: "registry.example.com/* | ghcr.io/myorg/* | docker.io/library/*"
```

```bash
# Apply the policy
kubectl apply -f image-allow-list.yaml

# Test with an allowed image
kubectl run test-allowed --image=registry.example.com/myapp:latest
# Should succeed

# Test with a denied image
kubectl run test-denied --image=docker.io/randomuser/suspicious-image:latest
# Should be rejected with the policy message
```

### More Granular Image Policies

You can create more specific policies that control which images are allowed in which namespaces.

```yaml
# namespace-specific-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-image-restrictions
spec:
  validationFailureAction: Enforce
  rules:
    # Production namespace: only allow specific tagged images
    - name: production-images
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      validate:
        message: "Production images must use SHA digests, not tags"
        pattern:
          spec:
            containers:
              - image: "registry.example.com/*@sha256:*"

    # Staging namespace: allow tags but only from approved registry
    - name: staging-images
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - staging
      validate:
        message: "Staging images must come from the approved registry"
        pattern:
          spec:
            containers:
              - image: "registry.example.com/*"

    # Development namespace: broader but still restricted
    - name: dev-images
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - development
      validate:
        message: "Dev images must come from approved registries"
        pattern:
          spec:
            containers:
              - image: "registry.example.com/* | ghcr.io/myorg/* | docker.io/library/*"
```

### Requiring Image Digests

For the highest level of assurance, require images to be referenced by their SHA256 digest rather than a mutable tag.

```yaml
# require-image-digests.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      validate:
        message: "Images must use SHA256 digests in production"
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
            =(initContainers):
              - image: "*@sha256:*"
```

## Approach 2: OPA Gatekeeper

OPA Gatekeeper is another popular option for admission control with a different policy language (Rego).

### Installing Gatekeeper

```bash
# Install Gatekeeper
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts

helm install gatekeeper \
  gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace
```

### Creating a Constraint Template

```yaml
# allowed-repos-template.yaml
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
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf(
            "Container image '%v' is not from an allowed repository. Allowed: %v",
            [container.image, input.parameters.repos]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf(
            "Init container image '%v' is not from an allowed repository. Allowed: %v",
            [container.image, input.parameters.repos]
          )
        }

        startswith_any(str, prefixes) {
          prefix := prefixes[_]
          startswith(str, prefix)
        }
```

### Creating a Constraint

```yaml
# allowed-repos-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
      - staging
  parameters:
    repos:
      - "registry.example.com/"
      - "ghcr.io/myorg/"
      - "docker.io/library/"
```

```bash
# Apply the template and constraint
kubectl apply -f allowed-repos-template.yaml
kubectl apply -f allowed-repos-constraint.yaml

# Check constraint status
kubectl get k8sallowedrepos allowed-repos -o yaml
```

## Approach 3: Kubernetes ImagePolicyWebhook

For a lower-level approach, Kubernetes supports an ImagePolicyWebhook admission controller. This calls an external webhook to validate images.

On Talos Linux, configure this through the API server settings in the machine configuration.

```yaml
# Talos machine config snippet
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: "ImagePolicyWebhook,PodSecurity"
      admission-control-config-file: "/etc/kubernetes/admission/config.yaml"
```

## Monitoring and Auditing

Track which images are being blocked and which are running in your cluster.

```bash
# With Kyverno, check policy reports
kubectl get policyreport -A

# Get detailed violation information
kubectl get policyreport -A -o json | \
  jq '.items[].results[] | select(.result == "fail") | {policy: .policy, message: .message}'

# List all unique images currently running
kubectl get pods -A -o json | \
  jq '[.items[].spec.containers[].image] | unique | sort'
```

## Handling Exceptions

Some system components need to pull from specific registries. Create exceptions for these.

```yaml
# exception-for-system.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  rules:
    - name: validate-registries
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
                - falco
                - monitoring
      validate:
        message: "Images must come from an approved registry"
        pattern:
          spec:
            containers:
              - image: "registry.example.com/* | ghcr.io/myorg/*"
```

## Wrapping Up

Image allow lists on Talos Linux ensure that only trusted, vetted container images run in your cluster. Whether you use Kyverno for its simplicity, Gatekeeper for its flexibility, or the built-in ImagePolicyWebhook for minimal dependencies, the result is the same: unauthorized images cannot make it into your cluster. Combined with Talos Linux's immutable OS and image scanning, allow lists create a supply chain security model where every layer of your stack is controlled and auditable. Start by inventorying your current images, define your approved registries, deploy the policy in audit mode, and then switch to enforcement once you are confident in the configuration.
