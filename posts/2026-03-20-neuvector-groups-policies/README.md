# How to Configure NeuVector Groups and Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Group, Policy Management, Container Security, Kubernetes

Description: Learn how to create and manage NeuVector security groups to organize containers and apply consistent policies across your Kubernetes workloads.

## Introduction

Groups are the fundamental building block of NeuVector's security model. Every container belongs to one or more groups, and policies are applied at the group level. Understanding how to create, organize, and manage groups is essential for building an effective security policy. This guide explains NeuVector's group system and how to define policies for your workloads.

## Understanding NeuVector Groups

NeuVector creates groups automatically through two mechanisms:

1. **Auto-discovered groups**: Automatically created based on container labels, names, and namespaces
2. **User-defined groups**: Manually created with custom criteria for flexible grouping

### Auto-Generated Group Naming

```text
Pattern: nv.<service-name>.<namespace>

Examples:
nv.nginx.default          - nginx service in default namespace
nv.backend-api.production - backend-api service in production namespace
nv.ip.internet            - Internet IP address group

Reserved special groups (no nv. prefix):
external                  - All external network traffic
nodes                     - All nodes (hosts) in the cluster
containers                - All containers in the cluster
```

## Prerequisites

- NeuVector installed and running
- Workloads deployed in your Kubernetes cluster
- NeuVector Manager access

## Step 1: View Auto-Discovered Groups

```bash
# List all groups

curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.groups[] | {
    name: .name,
    kind: .kind,
    policy_mode: .policy_mode,
    member_count: (.members | length),
    platform_role: .platform_role
  }'
```

## Step 2: Create a Custom Group

Define groups using container criteria:

```bash
# Create a group matching containers by label
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "production-web-tier",
      "comment": "All web tier containers in production",
      "criteria": [
        {
          "key": "label",
          "value": "tier=web",
          "op": "="
        },
        {
          "key": "namespace",
          "value": "production",
          "op": "="
        }
      ],
      "cfg_type": "user"
    }
  }'
```

### Create Group by Namespace

```bash
# Create a group for all containers in a namespace
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "all-production",
      "comment": "All containers in production namespace",
      "criteria": [
        {
          "key": "namespace",
          "value": "production",
          "op": "="
        }
      ],
      "cfg_type": "user"
    }
  }'
```

### Create Group by Image Name

```bash
# Group all nginx containers across namespaces
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "all-nginx",
      "comment": "All nginx containers",
      "criteria": [
        {
          "key": "image",
          "value": "nginx",
          "op": "contains"
        }
      ],
      "cfg_type": "user"
    }
  }'
```

## Step 3: Set Group Policy Mode

Configure the security mode for a group:

```bash
# Set group to Monitor mode (generates alerts, no blocking)
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/production-web-tier" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "mode": "Monitor"
    }
  }'

# Set group to Protect mode (blocks violations)
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/production-web-tier" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "mode": "Protect"
    }
  }'
```

## Step 4: Define Group Policies as CRDs

Manage groups and policies through Kubernetes manifests:

```yaml
# security-groups.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.web.production
  namespace: production
spec:
  target:
    policymode: Protect
    selector:
      name: nv.web.production
      criteria:
        - key: service
          op: "="
          value: web.production
        - key: domain
          op: "="
          value: production
  ingress:
    - action: allow
      name: allow-lb-ingress
      selector:
        name: nv.ingress-nginx.ingress-nginx
        criteria:
          - key: service
            op: "="
            value: ingress-nginx.ingress-nginx
          - key: domain
            op: "="
            value: ingress-nginx
      applications:
        - HTTP
        - SSL
      ports: tcp/80,tcp/443
  egress:
    - action: allow
      name: allow-api-egress
      selector:
        name: nv.api.production
        criteria:
          - key: service
            op: "="
            value: api.production
          - key: domain
            op: "="
            value: production
      applications:
        - HTTP
      ports: tcp/8080
  process:
    - name: nginx
      path: /usr/sbin/nginx
      action: allow
    - name: sh
      path: /bin/sh
      action: deny
  file: []
```

```bash
kubectl apply -f security-groups.yaml
```

## Step 5: Use Reserved Groups for Cluster-Wide Policies

The `nodes` group represents all nodes (hosts) in the cluster, and `fed.nodes` is its federated equivalent. Setting the mode on these reserved groups applies to all nodes at once:

```bash
# Set policy mode for the all-nodes group
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/nodes" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "mode": "Protect"
    }
  }'
```

## Step 6: Apply Batch Mode Changes

Change multiple groups at once:

```bash
# Set all groups in a namespace to Protect mode
for GROUP in $(curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.groups[] | select(.name | contains(".production")) | .name'); do

  echo "Setting ${GROUP} to Protect mode..."
  curl -sk -X PATCH \
    "https://neuvector-manager:8443/v1/group/${GROUP}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${TOKEN}" \
    -d '{"config": {"mode": "Protect"}}'
done
```

## Step 7: Delete Unused Groups

Clean up stale groups from deleted workloads:

```bash
# Find groups with no members (potentially stale)
curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.groups[] | select(.members | length == 0) | .name'

# Delete a stale group
curl -sk -X DELETE \
  "https://neuvector-manager:8443/v1/group/old-decommissioned-service" \
  -H "X-Auth-Token: ${TOKEN}"
```

## Conclusion

Groups are the cornerstone of NeuVector's policy model. Well-organized groups that reflect your application architecture make policies easier to understand, manage, and audit. By combining auto-discovered groups with custom user-defined groups and managing them through Kubernetes CRDs, you create a GitOps-compatible security policy that evolves with your infrastructure.
