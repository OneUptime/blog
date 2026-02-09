# How to Automate Docker Registry Cleanup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, registry, cleanup, automation, garbage collection, retention policy, DevOps

Description: Automate Docker registry cleanup with retention policies, tag management, and garbage collection to control storage costs and maintain order.

---

Docker registries grow endlessly unless you actively manage them. Every CI/CD pipeline run pushes a new image, and none of them get deleted automatically. Over months, your registry accumulates thousands of tags, hundreds of gigabytes of layers, and a mounting storage bill. Finding the image you actually need becomes like searching through a junkyard.

Automated registry cleanup solves this by applying retention policies, removing stale tags, and running garbage collection on a schedule. This guide covers cleanup strategies for self-hosted registries and major cloud registries.

## Understanding Registry Storage

A Docker registry stores images as a collection of manifests and layers (blobs). When you push `myapp:v1.0` and `myapp:v1.1`, they likely share many layers. Deleting a tag removes the manifest reference, but the shared layers stay until garbage collection runs.

```bash
# Check the total size of a self-hosted registry's data directory
du -sh /var/lib/registry/

# Count tags across all repositories
curl -s "https://registry.example.com/v2/_catalog" | jq -r '.repositories[]' | \
while read REPO; do
    COUNT=$(curl -s "https://registry.example.com/v2/${REPO}/tags/list" | jq '.tags | length')
    echo "$REPO: $COUNT tags"
done
```

## Self-Hosted Registry Cleanup

For the official Docker registry (distribution/distribution), cleanup involves deleting tags through the API and then running garbage collection.

### Deleting Tags by Age

```bash
#!/bin/bash
# registry-cleanup-by-age.sh
# Deletes tags from a self-hosted registry that are older than the retention period

REGISTRY="https://registry.example.com"
RETENTION_DAYS=30
DRY_RUN=true  # Set to false to actually delete

echo "Registry cleanup - removing tags older than $RETENTION_DAYS days"
echo "Dry run: $DRY_RUN"

# Get all repositories
REPOS=$(curl -s "${REGISTRY}/v2/_catalog" | jq -r '.repositories[]')

for REPO in $REPOS; do
    echo ""
    echo "Repository: $REPO"

    # Get all tags for this repository
    TAGS=$(curl -s "${REGISTRY}/v2/${REPO}/tags/list" | jq -r '.tags[]?' 2>/dev/null)

    if [ -z "$TAGS" ]; then
        echo "  No tags found"
        continue
    fi

    for TAG in $TAGS; do
        # Get the manifest to find the creation date
        MANIFEST=$(curl -s \
            -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
            "${REGISTRY}/v2/${REPO}/manifests/${TAG}")

        # Get the config blob which contains the creation timestamp
        CONFIG_DIGEST=$(echo "$MANIFEST" | jq -r '.config.digest // empty')

        if [ -z "$CONFIG_DIGEST" ]; then
            continue
        fi

        CONFIG=$(curl -s "${REGISTRY}/v2/${REPO}/blobs/${CONFIG_DIGEST}")
        CREATED=$(echo "$CONFIG" | jq -r '.created // empty' | cut -dT -f1)

        if [ -z "$CREATED" ]; then
            continue
        fi

        # Calculate age in days
        CREATED_EPOCH=$(date -d "$CREATED" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        AGE_DAYS=$(( (NOW_EPOCH - CREATED_EPOCH) / 86400 ))

        if [ "$AGE_DAYS" -gt "$RETENTION_DAYS" ]; then
            echo "  DELETE: ${REPO}:${TAG} (${AGE_DAYS} days old)"

            if [ "$DRY_RUN" = false ]; then
                # Get the digest for deletion
                DIGEST=$(curl -s -I \
                    -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
                    "${REGISTRY}/v2/${REPO}/manifests/${TAG}" | \
                    grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')

                # Delete the manifest by digest
                curl -s -X DELETE "${REGISTRY}/v2/${REPO}/manifests/${DIGEST}"
            fi
        fi
    done
done

if [ "$DRY_RUN" = false ]; then
    echo ""
    echo "Tags deleted. Run garbage collection to reclaim disk space."
fi
```

### Keeping Only N Latest Tags

```bash
#!/bin/bash
# registry-keep-latest.sh
# Keeps only the N most recent tags per repository, deleting the rest

REGISTRY="https://registry.example.com"
KEEP_COUNT=10
DRY_RUN=true

echo "Registry cleanup - keeping $KEEP_COUNT latest tags per repository"

REPOS=$(curl -s "${REGISTRY}/v2/_catalog" | jq -r '.repositories[]')

for REPO in $REPOS; do
    TAGS=$(curl -s "${REGISTRY}/v2/${REPO}/tags/list" | jq -r '.tags[]?' 2>/dev/null | sort -V)
    TAG_COUNT=$(echo "$TAGS" | wc -l)

    if [ "$TAG_COUNT" -le "$KEEP_COUNT" ]; then
        echo "$REPO: $TAG_COUNT tags (keeping all)"
        continue
    fi

    DELETE_COUNT=$((TAG_COUNT - KEEP_COUNT))
    echo "$REPO: $TAG_COUNT tags, deleting $DELETE_COUNT oldest"

    # Get the tags to delete (all except the latest N)
    TAGS_TO_DELETE=$(echo "$TAGS" | head -n "$DELETE_COUNT")

    for TAG in $TAGS_TO_DELETE; do
        echo "  DELETE: ${REPO}:${TAG}"

        if [ "$DRY_RUN" = false ]; then
            DIGEST=$(curl -s -I \
                -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
                "${REGISTRY}/v2/${REPO}/manifests/${TAG}" | \
                grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')

            curl -s -X DELETE "${REGISTRY}/v2/${REPO}/manifests/${DIGEST}"
        fi
    done
done
```

### Running Garbage Collection

After deleting tags, run garbage collection to actually reclaim disk space:

```bash
# Run garbage collection on the registry container
# The --delete-untagged flag removes blobs not referenced by any manifest
docker exec registry bin/registry garbage-collect \
    /etc/docker/registry/config.yml \
    --delete-untagged

# For a dry run to see what would be deleted
docker exec registry bin/registry garbage-collect \
    /etc/docker/registry/config.yml \
    --dry-run
```

Important: garbage collection requires the registry to be in read-only mode or stopped to avoid data corruption. Schedule it during maintenance windows.

```bash
#!/bin/bash
# gc-with-downtime.sh
# Runs garbage collection safely by temporarily stopping write operations

echo "Starting garbage collection..."

# Put the registry in read-only mode by updating the config
docker exec registry sh -c '
    sed -i "s/readonly: false/readonly: true/" /etc/docker/registry/config.yml
    kill -HUP 1  # Signal the registry to reload config
'

sleep 5

# Run garbage collection
docker exec registry bin/registry garbage-collect \
    /etc/docker/registry/config.yml \
    --delete-untagged

# Restore write access
docker exec registry sh -c '
    sed -i "s/readonly: true/readonly: false/" /etc/docker/registry/config.yml
    kill -HUP 1
'

echo "Garbage collection complete"
```

## AWS ECR Cleanup

Amazon ECR has built-in lifecycle policies:

```bash
# Apply a lifecycle policy to an ECR repository
aws ecr put-lifecycle-policy \
    --repository-name myapp \
    --lifecycle-policy-text '{
        "rules": [
            {
                "rulePriority": 1,
                "description": "Remove untagged images after 1 day",
                "selection": {
                    "tagStatus": "untagged",
                    "countType": "sinceImagePushed",
                    "countUnit": "days",
                    "countNumber": 1
                },
                "action": {
                    "type": "expire"
                }
            },
            {
                "rulePriority": 2,
                "description": "Keep only 20 most recent tagged images",
                "selection": {
                    "tagStatus": "tagged",
                    "tagPrefixList": ["v"],
                    "countType": "imageCountMoreThan",
                    "countNumber": 20
                },
                "action": {
                    "type": "expire"
                }
            }
        ]
    }'
```

## Google Artifact Registry Cleanup

```bash
# Delete images older than 30 days in Google Artifact Registry
gcloud artifacts docker images list \
    us-central1-docker.pkg.dev/my-project/my-repo/myapp \
    --include-tags \
    --format="table(package,tags,createTime)" \
    --sort-by=createTime

# Use gcr-cleaner for automated cleanup
docker run -it gcr.io/gcr-cleaner/gcr-cleaner-cli \
    -repo us-central1-docker.pkg.dev/my-project/my-repo/myapp \
    -grace 720h \
    -keep 10
```

## Harbor Registry Cleanup

Harbor has a built-in garbage collection and tag retention feature:

```bash
# Trigger garbage collection via the Harbor API
curl -s -X POST \
    -u "admin:Harbor12345" \
    "https://harbor.example.com/api/v2.0/system/gc/schedule" \
    -H "Content-Type: application/json" \
    -d '{
        "schedule": {
            "type": "Manual"
        },
        "parameters": {
            "delete_untagged": true,
            "dry_run": false
        }
    }'

# Set up a tag retention policy for a project
curl -s -X POST \
    -u "admin:Harbor12345" \
    "https://harbor.example.com/api/v2.0/retentions" \
    -H "Content-Type: application/json" \
    -d '{
        "algorithm": "or",
        "rules": [
            {
                "disabled": false,
                "action": "retain",
                "params": {
                    "latestPushedK": 10
                },
                "scope_selectors": {
                    "repository": [{"kind": "doublestar", "decoration": "repoMatches", "pattern": "**"}]
                },
                "tag_selectors": [{"kind": "doublestar", "decoration": "matches", "pattern": "**"}],
                "template": "latestPushedK"
            }
        ],
        "scope": {"level": "project", "ref": 1},
        "trigger": {"kind": "Schedule", "settings": {"cron": "0 0 0 * * *"}}
    }'
```

## Scheduling Cleanup with Cron

```bash
# Run registry cleanup weekly and garbage collection after
0 2 * * 0 /opt/registry/registry-cleanup-by-age.sh >> /var/log/registry-cleanup.log 2>&1
30 2 * * 0 /opt/registry/gc-with-downtime.sh >> /var/log/registry-gc.log 2>&1
```

## Monitoring Registry Size

Track registry size over time to verify cleanup is working:

```bash
#!/bin/bash
# registry-size-report.sh
# Reports current registry size and tag counts

echo "=== Registry Size Report ==="
echo "Date: $(date)"

# Total storage
TOTAL_SIZE=$(du -sh /var/lib/registry/ 2>/dev/null | cut -f1)
echo "Total registry size: $TOTAL_SIZE"

# Count by repository
echo ""
echo "Repository breakdown:"
REPOS=$(curl -s "https://registry.example.com/v2/_catalog" | jq -r '.repositories[]')

for REPO in $REPOS; do
    TAG_COUNT=$(curl -s "https://registry.example.com/v2/${REPO}/tags/list" | jq '.tags | length')
    echo "  $REPO: $TAG_COUNT tags"
done
```

## Summary

Registry cleanup is essential maintenance, not optional. For self-hosted registries, combine tag deletion scripts with regular garbage collection runs. For cloud registries, use their native lifecycle policies. Whichever approach you use, set it up on a schedule and monitor storage usage to confirm it is working. The cost of cleanup automation is negligible compared to the storage costs and organizational overhead of an unmanaged registry.
