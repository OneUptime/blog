# How to Configure NeuVector Admission Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Admission Control, Kubernetes, Container Security, Policy Enforcement

Description: Set up NeuVector's admission control webhook to automatically block vulnerable or non-compliant container images from being deployed to Kubernetes.

## Introduction

NeuVector's Admission Control acts as a gatekeeper for your Kubernetes cluster. It integrates with the Kubernetes admission webhook mechanism to intercept pod creation requests and enforce security policies before any container starts running. This prevents vulnerable images, privileged containers, and policy violations from reaching your cluster.

## How Admission Control Works

NeuVector registers a `ValidatingAdmissionWebhook` with Kubernetes. When a pod is created:

1. Kubernetes sends the pod spec to NeuVector's controller
2. NeuVector evaluates the request against your admission rules
3. NeuVector returns **Allow** or **Deny**
4. Kubernetes proceeds or rejects the deployment

## Prerequisites

- NeuVector installed with controller accessible from the Kubernetes API server
- `kubectl` cluster admin access
- TLS certificates for the webhook (NeuVector manages these automatically)

## Step 1: Enable Admission Control

Enable the admission webhook in NeuVector:

```bash
# Enable admission control via API

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/state" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "state": {
      "enable": true,
      "mode": "protect",
      "default_action": "allow"
    }
  }'
```

In the UI:
1. Go to **Policy** > **Admission Control**
2. Toggle **Enable** to **On**
3. Set mode to **Monitor** (logs only) or **Protect** (blocks violations)

## Step 2: Verify the Webhook Registration

```bash
# Check that the webhook was registered
kubectl get validatingwebhookconfigurations | grep neuvector

# View webhook details
kubectl describe validatingwebhookconfigurations neuvector-validating-admission-webhook
```

## Step 3: Create Admission Rules

### Rule: Block Images with Critical Vulnerabilities

```bash
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Block images with critical CVEs",
      "criteria": [
        {
          "name": "cveHighCount",
          "op": ">=",
          "value": "1",
          "type": "cveHighCount"
        }
      ],
      "rule_type": "deny",
      "id": 0,
      "cfg_type": "user"
    }
  }'
```

### Rule: Block Privileged Containers

```bash
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Block privileged containers",
      "criteria": [
        {
          "name": "runAsPrivileged",
          "op": "=",
          "value": "true",
          "type": "runAsPrivileged"
        }
      ],
      "rule_type": "deny",
      "cfg_type": "user"
    }
  }'
```

### Rule: Require Image from Approved Registry

```bash
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Only allow images from approved registries",
      "criteria": [
        {
          "name": "imageRegistry",
          "op": "notContainsAny",
          "value": "registry.company.com, gcr.io/my-project",
          "type": "imageRegistry"
        }
      ],
      "rule_type": "deny",
      "cfg_type": "user"
    }
  }'
```

## Step 4: Create Allow Rules for Exceptions

Allow rules run before deny rules. Use them for trusted exceptions:

```bash
# Allow the kube-system namespace to bypass checks
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Allow system namespaces",
      "criteria": [
        {
          "name": "namespace",
          "op": "containsAny",
          "value": "kube-system, kube-public, neuvector, cattle-system",
          "type": "namespace"
        }
      ],
      "rule_type": "exception",
      "cfg_type": "user"
    }
  }'
```

## Step 5: Common Admission Control Criteria

NeuVector supports many criteria types:

```text
Image criteria:
- image                - Image name (matches name and/or tag)
- imageRegistry        - Registry hostname
- imageSigned          - Whether image has a valid signature

Vulnerability criteria:
- cveHighCount         - Number of high CVEs
- cveCriticalCount     - Number of critical CVEs
- cveScoreCount        - CVEs above a CVSS score threshold
- cveNames             - Match specific CVE IDs

Kubernetes spec criteria:
- runAsPrivileged      - Privileged container flag
- runAsRoot            - Running as root user
- shareIpcWithHost     - hostIPC: true
- shareNetWithHost     - hostNetwork: true
- sharePidWithHost     - hostPID: true
- allowPrivEscalation  - allowPrivilegeEscalation: true
- namespace            - Target namespace
- labels               - Pod labels
- annotations          - Pod annotations

Resource criteria:
- resourceLimit        - CPU/memory limit and request configuration
```

## Step 6: Test Admission Control

Test that rules work before enabling Protect mode:

```bash
# Try to deploy a privileged container (should be blocked)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged
  namespace: default
spec:
  containers:
  - name: test
    image: nginx
    securityContext:
      privileged: true
EOF

# Expected error:
# Error from server: error when creating "STDIN":
# admission webhook "neuvector-validating-admission-webhook" denied the request:
# NeuVector: container security policy violation
```

## Step 7: Monitor Admission Control Events

```bash
# View admission control events
curl -sk \
  "https://neuvector-manager:8443/v1/event?type=admission&start=0&limit=50" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.events[] | {
    image: .image,
    namespace: .namespace,
    action: .action,
    reason: .message,
    timestamp: .at
  }'
```

## Conclusion

NeuVector Admission Control is the most proactive layer of your container security strategy, blocking policy violations before containers ever start. By combining vulnerability checks, registry allowlisting, and Kubernetes security context validation in admission rules, you prevent insecure images from reaching production entirely. Start in Monitor mode, validate your rules, and then switch to Protect mode for enforcement.
