# How to Tag Environments in Portainer for Better Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment, Tag, Organization, Edge Computing

Description: Use tags in Portainer to label environments with metadata for filtering, organization, and dynamic edge group creation.

## Introduction

Tags in Portainer are labels attached to environments. Unlike groups, tags are flat and flexible - an environment can have multiple tags. Tags enable filtering in the UI and are the foundation for dynamic edge groups that automatically include Edge environments based on tag matches.

## Creating Tags

Tags must be created globally before assigning to environments.

### Via Web UI

1. Go to **Environment-related** → **Tags**
2. Enter the tag name (e.g., "production", "eu-west", "kubernetes")
3. Click **Create tag**

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create tags

TAGS=("production" "staging" "development" "us-east" "eu-west" "kubernetes" "docker" "edge")

for tag in "${TAGS[@]}"; do
  RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    https://portainer.example.com/api/tags \
    -d "{\"Name\": \"${tag}\"}")
  TAG_ID=$(printf '%s\n' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ID','error'))")
  echo "Created tag '$tag' with ID: $TAG_ID"
done
```

## Assigning Tags to Environments

```bash
# Get tag IDs
TAGS_LIST=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/tags \
  | python3 -c "import sys,json; [print(f'{t[\"ID\"]}:{t[\"Name\"]}') for t in json.load(sys.stdin)]")

echo "$TAGS_LIST"

# Get environment details
ENDPOINT_ID=1
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  | python3 -c "import sys,json; e=json.load(sys.stdin); print(f'Name: {e[\"Name\"]}, Tags: {e.get(\"TagIds\",[])}')"

# Add tags to an environment (replace existing tags)
# Resolve the tag IDs by name first
TAG_ARRAY=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/tags \
  | python3 -c "import sys,json; wanted=['production','us-east','kubernetes']; tags={t['Name']: t['ID'] for t in json.load(sys.stdin)}; print('[' + ', '.join(str(tags[name]) for name in wanted) + ']')")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}" \
  -d "{\"TagIDs\": ${TAG_ARRAY}}"
```

## Bulk Tagging Script

```bash
#!/bin/bash
# bulk-tag-environments.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

# Environment to tag: "endpoint_id:tag_names" (comma-separated)
ASSIGNMENTS=(
  "1:production,us-east,kubernetes"
  "2:production,eu-west,kubernetes"
  "3:staging,us-east,docker"
  "4:edge,us-east"
)

TAGS_JSON=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/tags")

for assignment in "${ASSIGNMENTS[@]}"; do
  IFS=':' read -r env_id tag_names <<< "$assignment"

  # Resolve tag names to tag IDs
  TAG_ARRAY=$(printf '%s\n' "$TAGS_JSON" | python3 -c "import json, sys; wanted=sys.argv[1].split(','); tags={t['Name']: t['ID'] for t in json.load(sys.stdin)}; print('[' + ','.join(str(tags[name]) for name in wanted) + ']')" "$tag_names")

  echo "Tagging environment $env_id with tags: $tag_names"
  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${env_id}" \
    -d "{\"TagIDs\": ${TAG_ARRAY}}"
done
```

## Dynamic Edge Groups Based on Tags

When Edge Compute features are enabled, tags let you create dynamic edge groups that automatically include Edge environments matching specified tags:

```bash
# Resolve tag IDs by name
US_EAST_TAG_ID=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/tags \
  | python3 -c "import sys,json; tags={t['Name']: t['ID'] for t in json.load(sys.stdin)}; print(tags['us-east'])")

PROD_K8S_TAG_IDS=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/tags \
  | python3 -c "import sys,json; wanted=['production','kubernetes']; tags={t['Name']: t['ID'] for t in json.load(sys.stdin)}; print('[' + ', '.join(str(tags[name]) for name in wanted) + ']')")

# Create a dynamic edge group for all "us-east" Edge environments
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_groups \
  -d "{\"Name\": \"US-East Sites\", \"Dynamic\": true, \"TagIDs\": [${US_EAST_TAG_ID}]}"

# Create a dynamic group for all production kubernetes Edge environments
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_groups \
  -d "{\"Name\": \"Production Kubernetes\", \"Dynamic\": true, \"PartialMatch\": false, \"TagIDs\": ${PROD_K8S_TAG_IDS}}"
```

When you tag a new Edge environment with `production` and `kubernetes`, it automatically joins the "Production Kubernetes" dynamic group when the group uses `PartialMatch: false`.

## Filtering Environments by Tags

In the Portainer UI:
1. Go to the **Environments** page
2. Use the search/filter input to search by tag names
3. Environments with matching tags appear

## Tag Naming Conventions

Use consistent naming conventions for tags:

```text
# Stage tags
production, staging, development, testing

# Region tags
us-east, us-west, eu-west, eu-central, ap-southeast

# Type tags
kubernetes, docker, swarm, edge, aci

# Team tags
backend-team, frontend-team, platform-team, data-team

# Custom
high-availability, low-latency, gpu-enabled
```

## Conclusion

Tags provide a flexible, multi-dimensional way to describe your environments beyond simple group membership. While groups organize environments into collections, tags allow many dimensions simultaneously - a single environment can be "production", "us-east", "kubernetes", and "high-availability" all at once. This multi-dimensional tagging is especially powerful for dynamic edge groups that automatically track Edge environments as tags are assigned or removed.
