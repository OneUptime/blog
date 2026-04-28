# How to Migrate NeuVector Policies Between Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Policy Migration, Multi-Cluster, Kubernetes, Security

Description: Export and import NeuVector security policies between Kubernetes clusters to maintain consistent security across environments.

## Introduction

When managing multiple Kubernetes clusters - development, staging, and production - you need a reliable way to migrate security policies between them. NeuVector supports policy export and import through both the UI and REST API, enabling you to maintain consistent security configurations across clusters.

## Migration Scenarios

Common migration use cases:

- **Dev → Staging → Production**: Promote policies through environments
- **Cluster cloning**: Replicate security config to a new cluster
- **Disaster recovery**: Restore policies to a replacement cluster
- **Multi-region deployment**: Keep identical policies across regions
- **Policy as code**: Store policies in Git and apply to clusters

## Prerequisites

- Source and destination NeuVector instances running
- Admin access to both clusters
- Sufficient storage for policy export files

## Step 1: Export Policies from Source Cluster

```bash
# Export all policies from source cluster

SOURCE_URL="https://neuvector-source.company.com:8443"
SOURCE_TOKEN="source-cluster-token"

# Get auth token
SOURCE_TOKEN=$(curl -sk -X POST \
  "${SOURCE_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"sourcepassword"}}' \
  | jq -r '.token.token')

# Export all policies (network rules, process profiles, DLP, WAF)
curl -sk \
  "${SOURCE_URL}/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" > policy-rules.json

# Export group configurations
curl -sk \
  "${SOURCE_URL}/v1/group?start=0&limit=500" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" > groups.json

# Export process profiles
curl -sk \
  "${SOURCE_URL}/v1/process_profile?start=0&limit=500" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" > process-profiles.json

# Export admission control rules
curl -sk \
  "${SOURCE_URL}/v1/admission/rules?start=0&limit=500" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" > admission-rules.json

echo "Export complete"
```

## Step 2: Export Full Configuration via UI

The UI provides a comprehensive export:

1. Go to **Policy** > **Security Policy**
2. Click **Export** (top right)
3. Select what to export:
   - Network Rules
   - Process Profiles
   - File Access Rules
   - DLP Sensors
   - WAF Sensors
   - Response Rules
4. Click **Export** to download `policy.yaml`

## Step 3: Use Kubernetes CRDs for Portable Policies

The most reliable migration method uses NeuVector's CRD format:

```bash
# Export all NeuVector CRDs from source cluster
kubectl get nvsecurityrules -A -o yaml > nv-security-rules.yaml
kubectl get nvclusterSecurityrules -o yaml > nv-cluster-rules.yaml
kubectl get nvadmissioncontrolsecurityrules -o yaml > nv-admission-rules.yaml
kubectl get nvdlpsecurityrules -A -o yaml > nv-dlp-rules.yaml
kubectl get nvwafsecurityrules -A -o yaml > nv-waf-rules.yaml

# Bundle all into a single file
cat nv-security-rules.yaml \
    nv-cluster-rules.yaml \
    nv-admission-rules.yaml \
    nv-dlp-rules.yaml \
    nv-waf-rules.yaml > neuvector-policies-complete.yaml
```

## Step 4: Clean the Exported CRDs

Remove cluster-specific metadata before importing:

```bash
# Remove cluster-specific fields
cat neuvector-policies-complete.yaml | \
  python3 -c "
import sys, yaml

docs = list(yaml.safe_load_all(sys.stdin))
cleaned = []
for doc in docs:
    if doc:
        # Remove cluster-specific metadata
        if 'metadata' in doc:
            doc['metadata'].pop('uid', None)
            doc['metadata'].pop('resourceVersion', None)
            doc['metadata'].pop('creationTimestamp', None)
            doc['metadata'].pop('generation', None)
            doc['metadata'].pop('managedFields', None)
        cleaned.append(doc)

print(yaml.dump_all(cleaned, default_flow_style=False))
" > neuvector-policies-clean.yaml

echo "Cleaned policy file ready for import"
```

## Step 5: Import Policies to Destination Cluster

```bash
# Target cluster context
kubectl config use-context destination-cluster

# Ensure CRDs exist on destination
kubectl get crd | grep neuvector

# Apply the cleaned policies
kubectl apply -f neuvector-policies-clean.yaml

# Verify resources were created
kubectl get nvsecurityrules -A
kubectl get nvclusterSecurityrules
kubectl get nvadmissioncontrolsecurityrules
```

## Step 6: Import via NeuVector REST API

For programmatic import without CRDs:

```bash
DEST_URL="https://neuvector-dest.company.com:8443"
DEST_TOKEN=$(curl -sk -X POST \
  "${DEST_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"destpassword"}}' \
  | jq -r '.token.token')

# Import network rules
cat policy-rules.json | jq -c '.rules[]' | while read -r rule; do
  curl -sk -X PATCH \
    "${DEST_URL}/v1/policy/rule" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${DEST_TOKEN}" \
    -d "{\"insert\": {\"after\": 0, \"rules\": [${rule}]}}"
done
```

## Step 7: Verify Policy Migration

```bash
# Compare policy counts between clusters
echo "Source cluster:"
curl -sk \
  "${SOURCE_URL}/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" | jq '.rules | length'

echo "Destination cluster:"
curl -sk \
  "${DEST_URL}/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${DEST_TOKEN}" | jq '.rules | length'

# Verify group modes match
echo "Source groups in Protect mode:"
curl -sk \
  "${SOURCE_URL}/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${SOURCE_TOKEN}" | \
  jq '[.groups[] | select(.policy_mode == "Protect")] | length'
```

## Step 8: Store Policies in Git

Use GitOps to manage NeuVector policies:

```bash
# Initialize a policies repository
mkdir neuvector-policies && cd neuvector-policies
git init
mkdir policies

# Export all policies to the repo
kubectl get nvsecurityrules -A -o yaml > policies/security-rules.yaml
kubectl get nvclusterSecurityrules -o yaml > policies/cluster-rules.yaml
kubectl get nvadmissioncontrolsecurityrules -o yaml > policies/admission-rules.yaml

# Commit and push
git add policies/
git commit -m "Export NeuVector policies from production cluster"
git push origin main
```

## Conclusion

Migrating NeuVector policies between clusters enables consistent security across your multi-cluster infrastructure. The CRD-based approach is the most reliable method, integrating naturally with GitOps workflows and providing a complete, version-controlled policy definition. By treating security policies as code and storing them in Git, you get auditability, rollback capability, and the ability to review policy changes through pull requests.
