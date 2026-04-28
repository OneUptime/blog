# How to Configure NeuVector for Multi-Cluster Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Multi-Cluster, Federation, Kubernetes, Container Security

Description: Set up NeuVector's multi-cluster federation to manage security policies across multiple Kubernetes clusters from a single control plane.

## Introduction

As Kubernetes adoption grows, organizations typically manage multiple clusters - for development, staging, and production, or across regions. NeuVector's multi-cluster federation feature allows you to manage security policies from a single master cluster and push them to member clusters, ensuring consistent security posture across your entire fleet.

## Multi-Cluster Architecture

NeuVector's federated model consists of:

- **Master Cluster**: The primary cluster where you manage policies centrally
- **Member Clusters**: Remote clusters that receive and enforce pushed policies
- **Federated Policies**: Global policies applied to all member clusters
- **Local Policies**: Cluster-specific policies that override or supplement federated policies

## Prerequisites

- NeuVector installed on at least two Kubernetes clusters
- Network connectivity between master and member clusters (port 11443)
- TLS certificates or valid HTTPS endpoints for each NeuVector instance
- Admin access to all clusters

## Step 1: Configure the Master Cluster

Enable federation on the master cluster:

```bash
# In the master cluster - expose the federation API

kubectl patch svc neuvector-svc-controller-fed-master \
  -n neuvector \
  --type merge \
  -p '{"spec":{"type":"LoadBalancer"}}'

# Get the master cluster's federation service IP
MASTER_IP=$(kubectl get svc neuvector-svc-controller-fed-master \
  -n neuvector \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Master IP: ${MASTER_IP}"
```

Configure federation in the UI:
1. Log in to the master cluster's NeuVector Manager
2. Go to **Settings** > **Federation**
3. Click **Promote to Master**
4. Note the **Master Cluster Token** (needed for joining member clusters)

Via API:

```bash
# Promote master cluster
MASTER_TOKEN=$(curl -sk -X POST \
  "${MASTER_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"masterpass"}}' \
  | jq -r '.token.token')

curl -sk -X POST \
  "${MASTER_URL}/v1/fed/promote" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" \
  -d '{
    "name": "primary-cluster",
    "ping_interval": 5,
    "poll_interval": 60,
    "master_rest_info": {
      "server": "neuvector-master.company.com",
      "port": 11443
    },
    "use_proxy": ""
  }'
```

## Step 2: Get the Join Token

```bash
# Get the federation join token from the master
curl -sk \
  "${MASTER_URL}/v1/fed/join_token" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" | jq '.join_token'
```

Save this token - you'll need it to join each member cluster.

## Step 3: Join Member Clusters

On each member cluster:

```bash
# Authenticate to member cluster
MEMBER_TOKEN=$(curl -sk -X POST \
  "${MEMBER_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"memberpass"}}' \
  | jq -r '.token.token')

# Join the master cluster
curl -sk -X POST \
  "${MEMBER_URL}/v1/fed/join" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${MEMBER_TOKEN}" \
  -d '{
    "name": "production-us-east-1",
    "server": "neuvector-master.company.com",
    "port": 11443,
    "join_token": "your-join-token-here",
    "joint_rest_info": {
      "server": "neuvector-member1.company.com",
      "port": 10443
    },
    "use_proxy": ""
  }'
```

In the member cluster UI:
1. Go to **Settings** > **Federation**
2. Click **Join Federation**
3. Enter the master cluster address and join token
4. Set a cluster name for identification

## Step 4: Create Federated Policies

Federated policies apply to all member clusters:

```bash
# Create a federated network rule (applies to all clusters)
curl -sk -X PATCH \
  "${MASTER_URL}/v1/policy/rule?scope=fed" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" \
  -d '{
    "insert": {
      "after": 0,
      "rules": [
        {
          "comment": "Global: Block all outbound to known malicious IPs",
          "from": "any",
          "to": "nv.ip.threat",
          "ports": "any",
          "action": "deny",
          "cfg_type": "federal"
        }
      ]
    }
  }'
```

Federated policies are identified by `cfg_type: "federal"` and cannot be modified on member clusters.

## Step 5: Configure Federated Groups

```bash
# Create a federated group (applies to all clusters)
curl -sk -X POST \
  "${MASTER_URL}/v1/group" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" \
  -d '{
    "config": {
      "name": "fed.production-critical",
      "comment": "All production-critical workloads across clusters",
      "criteria": [
        {
          "key": "label",
          "value": "criticality=high",
          "op": "="
        }
      ],
      "cfg_type": "federal"
    }
  }'
```

## Step 6: Manage Federation from Master UI

The master cluster UI shows all member clusters:

1. Go to **Settings** > **Federation**
2. View all connected member clusters with their status
3. Click a cluster name to manage it from the master
4. Use **Policy** > **Federal Security Policies** to manage global rules

## Step 7: Monitor Federation Health

```bash
# Check federation status from master
curl -sk \
  "${MASTER_URL}/v1/fed/member" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" | jq '.joint_clusters[] | {
    name: .name,
    id: .id,
    status: .status,
    rest_info: .rest_info
  }'

# Check for sync issues
curl -sk \
  "${MASTER_URL}/v1/fed/member" \
  -H "X-Auth-Token: ${MASTER_TOKEN}" | jq '.joint_clusters[] |
    select(.status != "synced" and .status != "connected") | {
    name: .name,
    status: .status
  }'
```

## Step 8: Remove a Member Cluster

```bash
# Remove a member cluster from federation
CLUSTER_ID="cluster-uuid-here"
curl -sk -X DELETE \
  "${MASTER_URL}/v1/fed/cluster/${CLUSTER_ID}" \
  -H "X-Auth-Token: ${MASTER_TOKEN}"
```

## Conclusion

NeuVector's multi-cluster federation enables centralized security management across your entire Kubernetes fleet. By defining global federated policies on the master cluster and allowing local overrides, you achieve consistent baseline security while giving individual cluster teams flexibility. For large enterprises with many clusters, federation significantly reduces the operational burden of maintaining security policies.
