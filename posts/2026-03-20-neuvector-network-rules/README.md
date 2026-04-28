# How to Configure NeuVector Network Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Network Security, Kubernetes, Container Security, Zero Trust

Description: A detailed guide to configuring NeuVector network rules to control east-west traffic between containers and enforce zero-trust network policies.

## Introduction

NeuVector's network rules govern how containers communicate with each other and with external services. Unlike Kubernetes NetworkPolicies which operate at the IP layer, NeuVector network rules are application-aware and can inspect Layer 7 protocols including HTTP, gRPC, and databases. This guide explains how to create, manage, and optimize network rules for production workloads.

## Network Rule Components

Every NeuVector network rule has these components:

- **From Group**: Source container group
- **To Group**: Destination container group
- **Port/Protocol**: TCP/UDP port and protocol
- **Action**: Allow or Deny
- **Type**: Learned (auto-discovered) or User-created

## Prerequisites

- NeuVector running in your cluster
- Workloads in Discover mode for at least 24 hours
- NeuVector Manager access

## Step 1: View Discovered Network Rules

After the learning period, review auto-discovered rules:

1. Navigate to **Policy** > **Groups**
2. Click on a group name
3. Select the **Network Rules** tab

Via API:

```bash
# Get network rules for all groups

curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.rules[] | {
    id: .id,
    from: .from,
    to: .to,
    ports: .ports,
    action: .action
  }'
```

## Step 2: Create a Network Rule via UI

1. Go to **Policy** > **Network Rules**
2. Click **+ Add Rule**
3. Configure the rule:

```text
From Group: nv.frontend.production
To Group: nv.backend-api.production
Ports: TCP/8080
Action: Allow
```

4. Click **Add** to save

## Step 3: Create Network Rules via API

For automation and GitOps workflows:

```bash
# Create an allow rule between frontend and backend
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "after": 0,
      "rules": [
        {
          "comment": "Allow frontend to call backend API",
          "from": "nv.frontend.production",
          "to": "nv.backend-api.production",
          "ports": "tcp/8080",
          "action": "allow",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 4: Create Network Rules as Kubernetes CRDs

Define network rules declaratively using NeuVector CRDs:

```yaml
# neuvector-rules.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.frontend.production
  namespace: production
spec:
  target:
    policymode: Protect
    selector:
      name: nv.frontend.production
      criteria:
        - key: service
          op: "="
          value: frontend.production
        - key: domain
          op: "="
          value: production
  ingress: []
  egress:
    - action: allow
      name: allow-backend-api
      selector:
        name: nv.backend-api.production
        criteria:
          - key: service
            op: "="
            value: backend-api.production
          - key: domain
            op: "="
            value: production
      ports: "tcp/8080"
      applications:
        - HTTP
---
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.backend-api.production
  namespace: production
spec:
  target:
    policymode: Protect
    selector:
      name: nv.backend-api.production
      criteria:
        - key: service
          op: "="
          value: backend-api.production
        - key: domain
          op: "="
          value: production
  ingress: []
  egress:
    - action: allow
      name: allow-postgres
      selector:
        name: nv.postgres.production
        criteria:
          - key: service
            op: "="
            value: postgres.production
          - key: domain
            op: "="
            value: production
      ports: "tcp/5432"
      applications:
        - PostgreSQL
```

```bash
kubectl apply -f neuvector-rules.yaml
```

## Step 5: Configure Global Network Rules

Create cluster-wide rules using NvClusterSecurityRule:

```yaml
# cluster-wide-rules.yaml
apiVersion: neuvector.com/v1
kind: NvClusterSecurityRule
metadata:
  name: deny-external-egress
  namespace: neuvector
spec:
  target:
    policymode: Protect
    selector:
      name: production-containers
      criteria:
        - key: domain
          op: "="
          value: production
  egress:
    - action: deny
      name: deny-all-external
      selector:
        name: external
        criteria: []
    - action: allow
      name: allow-https-external
      selector:
        name: external
        criteria: []
      ports: "tcp/443"
```

```bash
kubectl apply -f cluster-wide-rules.yaml
```

## Step 6: Use Application-Layer Filtering

NeuVector can enforce application-layer protocols for precise control:

```bash
# Create an HTTP-specific rule
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "after": 0,
      "rules": [
        {
          "comment": "Only allow HTTP to API",
          "from": "nv.frontend.default",
          "to": "nv.api.default",
          "ports": "tcp/80",
          "applications": ["HTTP"],
          "action": "allow",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 7: Deny Rules and Default Deny

Implement a default deny posture:

```bash
# Add a deny-all rule at the end of the rule list
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "after": 9999,
      "rules": [
        {
          "comment": "Default deny all",
          "from": "any",
          "to": "any",
          "ports": "any",
          "action": "deny",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 8: Monitor Network Rule Violations

Review network violations to fine-tune your policy:

```bash
# Get network policy violations
curl -sk \
  "https://neuvector-manager:8443/v1/log/violation" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.violations[] | {
    from_workload: .client_name,
    to_workload: .server_name,
    port: .server_port,
    action: .policy_action,
    timestamp: .reported_at
  }'
```

## Conclusion

NeuVector's network rules provide granular, application-aware control over container communications. By combining auto-discovered rules with manually crafted policies and a default-deny posture, you can enforce zero-trust networking across your entire Kubernetes cluster. The ability to define rules as Kubernetes CRDs enables GitOps workflows and treats your security policy as code.
