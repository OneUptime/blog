# How to Configure Image Allowlisting Policies for Kubernetes Using Admission Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Admission Controllers, Container Images, Supply Chain

Description: Implement container image allowlisting policies using Kubernetes admission controllers to restrict deployments to approved registries and verified images, preventing supply chain attacks and ensuring compliance.

---

Allowing arbitrary container images to run in your Kubernetes cluster opens the door to supply chain attacks, malware injection, and compliance violations. Without image allowlisting, developers can pull images from untrusted registries or deploy unverified containers that haven't undergone security scanning or compliance review.

Image allowlisting creates a positive security model where only explicitly approved images can run. This prevents accidental deployment of malicious images, enforces use of internal registries for sensitive workloads, and ensures all production images pass through your security pipeline. Admission controllers enforce these policies automatically at deployment time.

## Understanding Image Allowlisting Strategies

Several allowlisting strategies exist, each with different security properties. Registry-based allowlisting permits images from specific registries like your internal registry or approved vendors. Digest-based allowlisting requires images to be referenced by SHA256 digest rather than mutable tags. Signature-based allowlisting verifies cryptographic signatures before allowing deployment. Hybrid approaches combine multiple strategies for defense in depth.

Choose strategies based on your threat model. If you primarily worry about accidental use of untrusted registries, registry allowlisting suffices. For supply chain attack prevention, require both approved registries and signature verification.

## Implementing Registry Allowlisting with OPA Gatekeeper

Create OPA Gatekeeper policies that restrict images to approved registries:

```yaml
# registry-allowlist-template.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: allowedregistries
  annotations:
    description: "Restrict container images to approved registries"
spec:
  crd:
    spec:
      names:
        kind: AllowedRegistries
      validation:
        openAPIV3Schema:
          properties:
            registries:
              type: array
              items:
                type: string
            exemptNamespaces:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package allowedregistries

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        image := container.image

        # Check if namespace is exempt
        namespace := input.review.object.metadata.namespace
        not exempt_namespace(namespace)

        # Check if image is from allowed registry
        not registry_allowed(image)

        msg := sprintf("Container image '%v' is not from an allowed registry. Allowed registries: %v", [image, input.parameters.registries])
      }

      # Check init containers too
      violation[{"msg": msg}] {
        container := input.review.object.spec.initContainers[_]
        image := container.image
        namespace := input.review.object.metadata.namespace

        not exempt_namespace(namespace)
        not registry_allowed(image)

        msg := sprintf("Init container image '%v' is not from an allowed registry. Allowed registries: %v", [image, input.parameters.registries])
      }

      registry_allowed(image) {
        registry := input.parameters.registries[_]
        startswith(image, registry)
      }

      exempt_namespace(namespace) {
        namespace == input.parameters.exemptNamespaces[_]
      }

---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: prod-registry-allowlist
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["production", "staging"]
  parameters:
    registries:
    - "gcr.io/my-company/"
    - "registry.company.internal/"
    - "ghcr.io/my-org/"
    exemptNamespaces:
    - "kube-system"
    - "monitoring"
```

Apply the policy:

```bash
kubectl apply -f registry-allowlist-template.yaml

# Test with unauthorized image
kubectl run test-pod --image=docker.io/nginx:latest -n production
# Should be rejected

# Test with approved image
kubectl run test-pod --image=gcr.io/my-company/nginx:latest -n production
# Should succeed
```

## Enforcing Image Digest References

Require all images to be referenced by immutable SHA256 digests instead of mutable tags:

```yaml
# require-digest-template.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: requireimagedigest
  annotations:
    description: "Require container images to be referenced by digest"
spec:
  crd:
    spec:
      names:
        kind: RequireImageDigest
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package requiredigest

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        image := container.image

        # Check if image has digest (@sha256:)
        not has_digest(image)

        msg := sprintf("Container image '%v' must be referenced by digest (e.g., image@sha256:...)", [image])
      }

      violation[{"msg": msg}] {
        container := input.review.object.spec.initContainers[_]
        image := container.image

        not has_digest(image)

        msg := sprintf("Init container image '%v' must be referenced by digest", [image])
      }

      has_digest(image) {
        contains(image, "@sha256:")
      }

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireImageDigest
metadata:
  name: require-digest-production
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["production"]
```

Apply digest requirement:

```bash
kubectl apply -f require-digest-template.yaml

# This will be rejected
kubectl run test --image=nginx:latest -n production

# This will be accepted
kubectl run test --image=nginx@sha256:67f9a4f10d147a6e04629340e6493c9703300ca23a2f7f3aa56fe615d75d31ca -n production
```

## Implementing Signature Verification with Cosign

Verify image signatures using Cosign before allowing deployment:

```yaml
# cosign-verification-policy.yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: requireimagesignature
  annotations:
    description: "Require container images to have valid signatures"
spec:
  crd:
    spec:
      names:
        kind: RequireImageSignature
      validation:
        openAPIV3Schema:
          properties:
            publicKey:
              type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package imagesignature

      import future.keywords.if

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        image := container.image

        # Call external service to verify signature
        not signature_verified(image)

        msg := sprintf("Container image '%v' does not have a valid signature", [image])
      }

      signature_verified(image) if {
        # This would call an external admission webhook
        # that runs: cosign verify --key cosign.pub <image>
        # For now, this is a placeholder
        false
      }
```

For actual signature verification, deploy a validation webhook:

```python
# cosign-validation-webhook.py
#!/usr/bin/env python3

from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

COSIGN_PUBLIC_KEY = os.getenv('COSIGN_PUBLIC_KEY', '/etc/cosign/cosign.pub')

def verify_image_signature(image):
    """Verify image signature using cosign"""
    try:
        cmd = [
            'cosign',
            'verify',
            '--key', COSIGN_PUBLIC_KEY,
            image
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10
        )

        return result.returncode == 0

    except Exception as e:
        print(f"Signature verification error: {e}")
        return False

@app.route('/validate', methods=['POST'])
def validate():
    admission_review = request.get_json()

    uid = admission_review['request']['uid']
    pod = admission_review['request']['object']

    # Check all container images
    allowed = True
    messages = []

    for container in pod['spec'].get('containers', []):
        image = container['image']

        if not verify_image_signature(image):
            allowed = False
            messages.append(f"Image {image} signature verification failed")

    # Check init containers
    for container in pod['spec'].get('initContainers', []):
        image = container['image']

        if not verify_image_signature(image):
            allowed = False
            messages.append(f"Init container image {image} signature verification failed")

    response = {
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": allowed,
            "status": {
                "message": "; ".join(messages) if messages else "All image signatures verified"
            }
        }
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context='adhoc')
```

Deploy the validation webhook:

```yaml
# cosign-webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cosign-validator
  namespace: image-security
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cosign-validator
  template:
    metadata:
      labels:
        app: cosign-validator
    spec:
      containers:
      - name: validator
        image: cosign-validator:latest
        ports:
        - containerPort: 8443
        env:
        - name: COSIGN_PUBLIC_KEY
          value: /etc/cosign/cosign.pub
        volumeMounts:
        - name: cosign-key
          mountPath: /etc/cosign
          readOnly: true
      volumes:
      - name: cosign-key
        secret:
          secretName: cosign-public-key

---
apiVersion: v1
kind: Service
metadata:
  name: cosign-validator
  namespace: image-security
spec:
  selector:
    app: cosign-validator
  ports:
  - port: 443
    targetPort: 8443

---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: cosign-image-validator
webhooks:
- name: validate-signatures.image-security.svc
  clientConfig:
    service:
      name: cosign-validator
      namespace: image-security
      path: /validate
    caBundle: <base64-ca-cert>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
  namespaceSelector:
    matchLabels:
      image-signature-required: "true"
```

## Creating Multi-Tier Allowlisting Policies

Implement different allowlisting policies for different environments:

```yaml
# multi-tier-allowlisting.yaml
---
# Development: Allow most registries but require digest
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: dev-registry-allowlist
spec:
  enforcementAction: warn  # Warning only in dev
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["development", "dev-*"]
  parameters:
    registries:
    - "gcr.io/"
    - "ghcr.io/"
    - "docker.io/"
    - "registry.company.internal/"
    exemptNamespaces: []

---
# Staging: Require company registries and digest
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: staging-registry-allowlist
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["staging"]
  parameters:
    registries:
    - "gcr.io/my-company/"
    - "registry.company.internal/"
    exemptNamespaces: []

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireImageDigest
metadata:
  name: require-digest-staging
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["staging"]

---
# Production: Require company registries, digest, and signature
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: prod-registry-allowlist
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["production"]
  parameters:
    registries:
    - "gcr.io/my-company-prod/"
    - "registry.company.internal/production/"
    exemptNamespaces: []

---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireImageDigest
metadata:
  name: require-digest-production
spec:
  enforcementAction: deny
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces: ["production"]

# Production also requires signature verification via webhook
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    image-signature-required: "true"
```

## Monitoring Allowlisting Policy Violations

Track policy violations to identify issues and unauthorized access attempts:

```yaml
# prometheus-allowlist-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: image-allowlist-alerts
  namespace: monitoring
spec:
  groups:
  - name: image_security
    interval: 1m
    rules:
    - alert: UnauthorizedImageAttempt
      expr: |
        rate(gatekeeper_violations_total{
          constraint_name=~".*allowlist.*"
        }[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Unauthorized image deployment attempts"
        description: "{{ $value }} attempts/sec to deploy unauthorized images"

    - alert: SignatureVerificationFailure
      expr: |
        rate(cosign_verification_failures_total[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Image signature verification failures"
        description: "{{ $value }} images failed signature verification"
```

## Automating Allowlist Updates

Create a process for adding approved images to the allowlist:

```bash
# update-allowlist.sh
#!/bin/bash

IMAGE=$1
ENVIRONMENT=$2

if [ -z "$IMAGE" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <image> <environment>"
  exit 1
fi

# Verify image signature
cosign verify --key cosign.pub "$IMAGE" || {
  echo "Error: Image signature verification failed"
  exit 1
}

# Scan image for vulnerabilities
trivy image --severity HIGH,CRITICAL "$IMAGE" || {
  echo "Error: Image has high/critical vulnerabilities"
  exit 1
}

# Add to allowlist (example: updating a ConfigMap)
REGISTRY=$(echo "$IMAGE" | cut -d'/' -f1)

kubectl get configmap image-allowlist -n image-security -o json | \
  jq --arg reg "$REGISTRY" --arg env "$ENVIRONMENT" \
  '.data[$env] += ($reg + "\n")' | \
  kubectl apply -f -

echo "Image $IMAGE added to $ENVIRONMENT allowlist"
```

Image allowlisting transforms your cluster security from a reactive blacklist approach to a proactive allowlist model. By restricting deployments to verified images from approved registries, you prevent supply chain attacks and ensure all production workloads meet your security standards. Implement allowlisting progressively, starting with warnings in development and strict enforcement in production.
