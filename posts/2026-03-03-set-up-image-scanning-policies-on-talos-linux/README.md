# How to Set Up Image Scanning Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Scanning, Container Security, Kubernetes, Policy Enforcement, Admission Control

Description: Learn how to enforce image scanning policies on Talos Linux to prevent vulnerable or untrusted container images from running in your cluster.

---

One of the biggest risks in any Kubernetes environment is running container images that contain known vulnerabilities or come from untrusted sources. Even with Talos Linux providing an immutable and hardened host operating system, a compromised container can still cause damage from within the cluster. Image scanning policies give you the ability to define rules about which images are allowed to run and automatically block anything that does not meet your security standards.

This guide covers setting up comprehensive image scanning policies on Talos Linux using a combination of admission controllers, policy engines, and scanning tools.

## The Problem with Unscanned Images

Without image scanning policies, anyone with deployment access to your cluster can run any image. This creates several risks:

- Images from public registries may contain known CVEs
- Base images can become outdated and accumulate vulnerabilities over time
- Developers might use convenience images that include unnecessary tools
- Supply chain attacks can inject malicious code into popular images

Image scanning policies address these risks by automatically checking images against vulnerability databases and enforcing rules before pods are created.

## Setting Up Image Policy Admission

Kubernetes has a built-in ImagePolicyWebhook admission controller that can check images before allowing pods to start. On Talos Linux, you enable this through the machine configuration:

```yaml
# talos-image-policy.yaml
# Enable ImagePolicyWebhook admission controller
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: "NodeRestriction,PodSecurity,ImagePolicyWebhook"
      admission-control-config-file: "/etc/kubernetes/admission-control-config.yaml"
    extraVolumes:
      - hostPath: /var/etc/kubernetes/admission-control-config.yaml
        mountPath: /etc/kubernetes/admission-control-config.yaml
        readonly: true
      - hostPath: /var/etc/kubernetes/image-policy-webhook.yaml
        mountPath: /etc/kubernetes/image-policy-webhook.yaml
        readonly: true

machine:
  files:
    # Admission control configuration
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: AdmissionConfiguration
        plugins:
          - name: ImagePolicyWebhook
            path: /etc/kubernetes/image-policy-webhook.yaml
      path: /var/etc/kubernetes/admission-control-config.yaml
      permissions: 0644
      op: create

    # Image policy webhook configuration
    - content: |
        imagePolicy:
          kubeConfigFile: /etc/kubernetes/image-policy-kubeconfig.yaml
          allowTTL: 300
          denyTTL: 60
          retryBackoff: 500
          defaultAllow: false
      path: /var/etc/kubernetes/image-policy-webhook.yaml
      permissions: 0644
      op: create
```

## Using Kyverno for Image Policies

Kyverno is a Kubernetes-native policy engine that works well on Talos Linux. It does not require learning a separate policy language since policies are written as Kubernetes resources.

Install Kyverno:

```bash
# Install Kyverno using Helm
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --create-namespace \
  --set replicaCount=3
```

### Require Image Scanning Before Deployment

Create a policy that requires all images to have a passing Trivy scan:

```yaml
# require-scan-results.yaml
# Blocks pods unless vulnerability scan results exist
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-vulnerability-scan
  annotations:
    policies.kyverno.io/title: Require Vulnerability Scan
    policies.kyverno.io/description: >
      Requires all container images to have been scanned
      by Trivy with no critical vulnerabilities.
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: check-vulnerability-report
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{request.operation}}"
            operator: In
            value: ["CREATE", "UPDATE"]
      validate:
        message: >
          Image {{ element.image }} has not been scanned or contains
          critical vulnerabilities. Please scan images before deployment.
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                any:
                  - key: "{{ element.image }}"
                    operator: AnyNotIn
                    value: "{{ images.containers.*.registry_url }}"
```

### Restrict Image Registries

Only allow images from trusted registries:

```yaml
# restrict-registries.yaml
# Only allows images from approved container registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
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
          Images must come from approved registries.
          Allowed: ghcr.io/myorg, myregistry.azurecr.io,
          docker.io/library
        foreach:
          - list: "request.object.spec.[initContainers, containers, ephemeralContainers][]"
            deny:
              conditions:
                all:
                  - key: "{{ element.image }}"
                    operator: AnyNotIn
                    value:
                      - "ghcr.io/myorg/*"
                      - "myregistry.azurecr.io/*"
                      - "docker.io/library/*"
```

### Require Image Digests

Prevent using mutable tags by requiring image digests:

```yaml
# require-image-digest.yaml
# Forces all images to be referenced by digest instead of tag
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Images must use a digest (sha256) instead of a mutable tag."
        foreach:
          - list: "request.object.spec.containers"
            deny:
              conditions:
                all:
                  - key: "{{ contains(element.image, '@sha256:') }}"
                    operator: NotEquals
                    value: true
```

### Block Images with Critical Vulnerabilities

Use Kyverno to check Trivy Operator vulnerability reports:

```yaml
# block-critical-vulns.yaml
# Prevents running images that have critical vulnerability findings
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-critical-vulnerabilities
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-critical-count
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: vulnReports
          apiCall:
            urlPath: "/apis/aquasecurity.github.io/v1alpha1/namespaces/{{request.namespace}}/vulnerabilityreports"
            jmesPath: "items[?report.artifact.repository == '{{request.object.spec.containers[0].image}}'].report.summary.criticalCount | [0]"
      validate:
        message: "Image has {{ vulnReports }} critical vulnerabilities. Maximum allowed: 0"
        deny:
          conditions:
            any:
              - key: "{{ vulnReports }}"
                operator: GreaterThan
                value: 0
```

## Using OPA Gatekeeper as an Alternative

If you prefer Open Policy Agent, Gatekeeper provides similar capabilities:

```bash
# Install Gatekeeper
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace
```

Create a constraint template for allowed registries:

```yaml
# allowed-repos-template.yaml
# OPA Gatekeeper template for registry restrictions
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
          msg := sprintf("Container image %v is not from an allowed registry. Allowed: %v", [container.image, input.parameters.repos])
        }

        startswith_any(str, prefixes) {
          prefix := prefixes[_]
          startswith(str, prefix)
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
      - gatekeeper-system
  parameters:
    repos:
      - "ghcr.io/myorg/"
      - "myregistry.azurecr.io/"
```

## Integrating with Image Signing

For the highest level of trust, combine scanning with image signing using Cosign and Sigstore:

```yaml
# verify-image-signature.yaml
# Kyverno policy to verify Cosign image signatures
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

## Monitoring Policy Violations

Set up alerts for policy violations to track compliance over time:

```bash
# View recent policy violations
kubectl get policyreport -A -o wide

# Get detailed violation information
kubectl get clusterpolicyreport -o json | \
  jq '.items[].results[] | select(.result == "fail") |
  {policy: .policy, rule: .rule, message: .message}'
```

## Summary

Image scanning policies are essential for maintaining a secure Talos Linux cluster. While Talos protects the infrastructure layer, these policies protect the workload layer by ensuring only scanned, trusted images run in your environment. Whether you choose Kyverno, OPA Gatekeeper, or the built-in ImagePolicyWebhook, the key is to enforce policies at admission time so vulnerable images never reach a running state. Combined with image signing and continuous scanning through the Trivy Operator, you create a comprehensive supply chain security framework for your Kubernetes workloads.
