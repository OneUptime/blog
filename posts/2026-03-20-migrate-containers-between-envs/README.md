# How to Migrate Containers Between Portainer Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Docker, Environment, DevOps

Description: Learn the process for migrating Docker containers, stacks, and volumes from one Portainer environment to another with minimal downtime.

## Introduction

Whether promoting from staging to production, moving to new hardware, or reorganizing environments, migrating containers between Portainer-managed environments is a common operational task. This guide covers migrating stacks, images, volumes, and configurations between environments.
The API examples below assume both the source and target are Docker Standalone environments managed by Portainer.

## Migration Strategy

Choose your approach based on the workload:

1. **Stack re-deployment** (stateless apps) - Redeploy from the same compose file on the new environment
2. **Image + volume migration** (stateful apps) - Export data, migrate volumes, redeploy
3. **API-driven migration** - Script the entire process via the Portainer API

## Step 1: Export Images from Source Environment

```bash
# List tagged images available in the source environment

curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/images/json" \
  | python3 -c "
import sys, json
images = json.load(sys.stdin)
for img in images:
    for tag in img.get('RepoTags') or []:
        if tag and '<none>' not in tag:
            print(tag)
" | sort -u > source-images.txt

# On the source Docker host: save each image to a tar archive
mkdir -p /tmp/images
while IFS= read -r image; do
  filename=$(echo "$image" | tr '/:' '--')
  docker image save -o "/tmp/images/$filename.tar" "$image"
  echo "Saved: $image"
done < source-images.txt

# Transfer image archives to the target server
rsync -av /tmp/images/ user@target-server:/tmp/images/
```

## Step 2: Export Stack Configurations

```bash
# Export all stacks from the source environment via API
curl -s -G \
  -H "X-API-Key: your-api-key" \
  --data-urlencode 'filters={"EndpointID":1}' \
  "https://portainer.example.com/api/stacks" \
  | python3 -c "
import sys, json
stacks = json.load(sys.stdin)
for s in stacks:
    print(s['Id'], s['Name'])
" > stack-list.txt

# Export each stack's compose file
mkdir -p /tmp/stacks
while read -r id name; do
  curl -s \
    -H "X-API-Key: your-api-key" \
    "https://portainer.example.com/api/stacks/$id/file" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['StackFileContent'])" \
    > "/tmp/stacks/$name.yml"
  curl -s \
    -H "X-API-Key: your-api-key" \
    "https://portainer.example.com/api/stacks/$id" \
    | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('Env') or []))" \
    > "/tmp/stacks/$name.env.json"
  echo "Exported stack: $name"
done < stack-list.txt

# Transfer stack files to the target server
rsync -av /tmp/stacks/ user@target-server:/tmp/stacks/
```

## Step 3: Export Volumes

```bash
# List volumes in source environment
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/volumes" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for v in data.get('Volumes', []):
    print(v['Name'])
"

# On the source Docker host: backup each volume
VOLUMES=("app-data" "db-data" "config-data")
mkdir -p /tmp/vol-backups
for vol in "${VOLUMES[@]}"; do
  docker run --rm \
    -v $vol:/data \
    -v /tmp/vol-backups:/backup \
    alpine tar czf /backup/$vol.tar.gz -C /data .
  echo "Backed up volume: $vol"
done

# Transfer to target server
rsync -av /tmp/vol-backups/ user@target-server:/tmp/vol-restore/
```

## Step 4: Deploy on Target Environment

```bash
# On the target server: Load images
for tar in /tmp/images/*.tar; do
  docker load -i $tar
  echo "Loaded: $tar"
done

# Restore volumes
for archive in /tmp/vol-restore/*.tar.gz; do
  vol_name=$(basename $archive .tar.gz)
  docker volume create $vol_name
  docker run --rm \
    -v $vol_name:/data \
    -v /tmp/vol-restore:/backup \
    alpine tar xzf /backup/$(basename $archive) -C /data
  echo "Restored volume: $vol_name"
done

# Deploy standalone stacks via Portainer API (target environment)
for compose_file in /tmp/stacks/*.yml; do
  stack_name=$(basename $compose_file .yml)
  env_json=$(cat "/tmp/stacks/$stack_name.env.json")
  content=$(python3 -c "
import json, sys
with open('$compose_file') as f:
    print(json.dumps(f.read()))
")
  
  curl -s -X POST \
    -H "X-API-Key: your-api-key" \
    -H "Content-Type: application/json" \
    -d "{\"Name\": \"$stack_name\", \"StackFileContent\": $content, \"Env\": $env_json}" \
    "https://portainer.example.com/api/stacks/create/standalone/string?endpointId=2"
  
  echo "Deployed stack: $stack_name"
done
```

## Step 5: Update Environment Variables

Environments often have different env vars (different database URLs, API keys, etc.). The exported stack `Env` values can be updated after deployment for the target environment:

```bash
# Update stack with environment-specific variables
curl -s -X PUT \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "StackFileContent": "...",
    "Env": [
      {"name": "DATABASE_URL", "value": "postgres://prod-db:5432/mydb"},
      {"name": "APP_ENV", "value": "production"},
      {"name": "LOG_LEVEL", "value": "warn"}
    ]
  }' \
  "https://portainer.example.com/api/stacks/STACK_ID?endpointId=2"
```

## Step 6: DNS Cutover

```bash
# Update DNS to point to the new environment
# For gradual migration, use weighted DNS records

# Test the new target before cutover by resolving the production hostname to the new IP
curl -I --resolve your-app.example.com:443:203.0.113.10 https://your-app.example.com
```

## Conclusion

Migrating containers between Portainer environments requires careful coordination of images, volumes, and configurations. Using the Portainer API automates most of this process. For stateless applications, re-deploying from compose files is sufficient. For stateful workloads, volume migration ensures data continuity. Always test in a staging environment before migrating production workloads.
