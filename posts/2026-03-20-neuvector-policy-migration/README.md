# How to Migrate NeuVector Policies Between Clusters - Policy Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Policy Migration, Kubernetes, Security, Multi-Cluster, SUSE Rancher

Description: Learn how to export NeuVector security policies from one cluster and import them into another cluster for consistent security posture across environments and disaster recovery.

---

Migrating NeuVector policies between clusters ensures consistent security posture across development, staging, and production environments. NeuVector provides built-in export and import capabilities for its policy configurations.

---

## What Can Be Migrated

- Network rules (ingress/egress rules per group)
- Process profile rules
- File access rules
- Admission control rules
- Group definitions
- Response rules
- DLP rules
- WAF rules

---

## Step 1: Export Policies via NeuVector UI

1. In the NeuVector UI, go to **Policy**
2. For each policy type, use the export (download) button
3. Policies are exported as JSON files

Or export via the NeuVector REST API:

```bash
# Get NeuVector access token

TOKEN=$(curl -sk -X POST \
  https://neuvector.example.com/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"admin"}}' \
  | jq -r '.token.token')

# Export all network rules
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  "https://neuvector.example.com/v1/policy/rule?scope=local" \
  > network-rules-export.json

# Export groups
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  "https://neuvector.example.com/v1/group?scope=local" \
  > groups-export.json
```

---

## Step 2: Export Full Configuration via REST API

For a complete policy bundle (all rule types in one file), use NeuVector's `/v1/file/config` endpoint. The download is a YAML configuration file:

```bash
# Download the full configuration as YAML
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  "https://neuvector.example.com/v1/file/config?section=all" \
  -o nv-policy-export.yaml
```

You can also restrict the export to local (non-federated) policy by passing `scope=local`.

---

## Step 3: Review and Sanitize the Export

Before importing to another cluster, review the export for cluster-specific references:

```bash
# Check for IP addresses or CIDR ranges that may be cluster-specific
grep -E 'ip_range:|cidr:' nv-policy-export.yaml

# Check for namespace references that differ between clusters
grep 'namespace:' nv-policy-export.yaml | sort | uniq
```

---

## Step 4: Import Policies into the Target Cluster

```bash
# Get token for the target cluster
TARGET_TOKEN=$(curl -sk -X POST \
  https://neuvector-target.example.com/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"admin"}}' \
  | jq -r '.token.token')

# Import the full configuration bundle exported in Step 2
curl -sk -X POST \
  -H "X-Auth-Token: $TARGET_TOKEN" \
  -F "configuration=@nv-policy-export.yaml" \
  "https://neuvector-target.example.com/v1/file/config"
```

---

## Step 5: Verify Migration

After import, verify policies are active in the target cluster:

```bash
# Check rule count
curl -sk \
  -H "X-Auth-Token: $TARGET_TOKEN" \
  "https://neuvector-target.example.com/v1/policy/rule" \
  | jq '.rules | length'

# Compare with source
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  "https://neuvector.example.com/v1/policy/rule" \
  | jq '.rules | length'
```

---

## Best Practices

- Always migrate policies to a staging cluster first and validate before applying to production.
- Store exported policy files in Git for version history and change tracking.
- Use NeuVector's **multi-cluster federation** for ongoing policy synchronization rather than manual migrations.
- Export policies before every NeuVector upgrade as a backup.
