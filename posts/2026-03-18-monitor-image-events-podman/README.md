# How to Monitor Image Events with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Image, Security, Registry

Description: Learn how to monitor image events with Podman to track image pulls, pushes, removals, and tags for security auditing and operational awareness.

---

> Monitoring image events is a security imperative - knowing what images enter and leave your environment is the foundation of supply chain security.

Container images are the building blocks of your deployments. Monitoring image events lets you track when images are pulled from registries, tagged, untagged, pushed, or removed. This visibility is essential for security auditing, compliance, and operational awareness. This guide shows you how to monitor and act on image events in Podman.

---

## Understanding Image Events

Podman tracks several types of image events:

```bash
# Image event types:

# pull    - Image was pulled from a registry
# push    - Image was pushed to a registry
# save    - Image was saved to a file
# remove  - Image was removed
# tag     - Image was tagged
# untag   - Image was untagged

# Filter for all image events
podman events --filter type=image
```

## Monitoring Image Pull Events

Track when images are pulled from registries - a critical security concern.

```bash
# Start monitoring image pulls
podman events --filter type=image --filter event=pull \
    --format '{{.Time}} PULL {{.Name}}' &
WATCHER_PID=$!
sleep 1

# Pull some images
podman pull alpine:latest
podman pull nginx:latest
podman pull busybox:latest

# Stop the watcher
sleep 2
kill $WATCHER_PID 2>/dev/null
```

## Monitoring Image Removals

Track when images are removed to maintain awareness of available images.

```bash
# Monitor image removals
podman events --filter type=image --filter event=remove \
    --format '{{.Time}} REMOVE {{.Name}}'

# In another terminal, remove an image
podman rmi busybox:latest
```

## Monitoring Tag Operations

Track image tagging and untagging operations.

```bash
# Monitor tag and untag events
podman events --filter type=image --filter event=tag \
    --format '{{.Time}} TAG {{.Name}}' &
TAG_WATCHER_PID=$!

podman events --filter type=image --filter event=untag \
    --format '{{.Time}} UNTAG {{.Name}}' &
UNTAG_WATCHER_PID=$!
sleep 1

# Perform tag operations
podman tag alpine:latest myalpine:v1
podman tag alpine:latest myalpine:v2
podman untag alpine:latest myalpine:v2
podman rmi myalpine:v1 2>/dev/null

# Stop the watchers
sleep 2
kill $TAG_WATCHER_PID $UNTAG_WATCHER_PID 2>/dev/null
```

## Building an Image Event Audit Log

```bash
#!/bin/bash
# image-audit.sh - Audit all image operations

AUDIT_FILE="/tmp/image-audit.jsonl"

echo "Auditing image operations to: ${AUDIT_FILE}"

podman events --filter type=image --format json | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // .Image // "unknown"')
    image_id=$(echo "$event" | jq -r '.ID // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    # Log the event
    log_entry=$(jq -n \
        --arg ts "$timestamp" \
        --arg action "$status" \
        --arg image "$name" \
        --arg id "$image_id" \
        --arg host "$(hostname)" \
        '{
            timestamp: $ts,
            action: $action,
            image: $image,
            image_id: $id,
            host: $host
        }')

    echo "$log_entry" >> "$AUDIT_FILE"
    echo "[${timestamp}] ${status}: ${name}"
done
```

## Security Monitoring for Unauthorized Images

Detect when images are pulled from unapproved registries.

```bash
#!/bin/bash
# image-security-monitor.sh - Alert on pulls from unapproved registries

# Define approved registries
APPROVED_REGISTRIES=(
    "docker.io"
    "quay.io"
    "registry.access.redhat.com"
    "gcr.io"
)

echo "Monitoring image pulls for unapproved registries..."
echo "Approved: ${APPROVED_REGISTRIES[*]}"
echo ""

podman events --filter type=image --filter event=pull --format json | \
while IFS= read -r event; do
    image=$(echo "$event" | jq -r '.Name // .Image // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    # Check if the image comes from an approved registry
    approved=false
    for registry in "${APPROVED_REGISTRIES[@]}"; do
        if echo "$image" | grep -q "^${registry}/\|^${registry}$"; then
            approved=true
            break
        fi
    done

    if [ "$approved" = true ]; then
        echo "[${timestamp}] APPROVED: ${image}"
    else
        echo "[${timestamp}] WARNING: Unapproved registry! Image: ${image}"
        # Could trigger an alert here
    fi
done
```

## Tracking Image Disk Usage

Monitor how image operations affect disk space.

```bash
#!/bin/bash
# image-disk-monitor.sh - Track disk usage from image operations

echo "=== Image Disk Usage Report ==="
echo ""

# Current image inventory
echo "Current images:"
podman images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | \
    sort | while read -r line; do
    echo "  $line"
done

echo ""

# Total disk usage
echo "Total image storage:"
podman system df --format '{{.Type}}\t{{.Total}}\t{{.Size}}\t{{.Reclaimable}}' | \
    grep -i image

echo ""

# Recent image events
echo "Recent image events:"
podman events --since 24h --filter type=image \
    --format '  {{.Time}} {{.Status}} {{.Name}}' 2>/dev/null
```

## Monitoring Image Events During Builds

Track image events that occur during local builds, such as pulling base images and tagging the final image.

```bash
# Monitor image events while a build runs
podman events --filter type=image \
    --format '{{.Time}} {{.Status}} {{.Name}}' &
WATCHER_PID=$!
sleep 1

# Create a simple Containerfile and build to generate events
cat > /tmp/test-Containerfile << 'EOF'
FROM alpine:latest
RUN echo "test build"
CMD ["echo", "built"]
EOF

podman build -t test-build:v1 -f /tmp/test-Containerfile /tmp/
podman rmi test-build:v1

# Clean up
sleep 2
kill $WATCHER_PID 2>/dev/null
rm /tmp/test-Containerfile
```

## Creating an Image Event Report

```bash
#!/bin/bash
# image-event-report.sh - Generate image event report
# Usage: ./image-event-report.sh [hours]

HOURS="${1:-24}"

echo "============================================"
echo "  Image Event Report"
echo "  Period: Last ${HOURS} hours"
echo "  Generated: $(date)"
echo "============================================"
echo ""

# Summary by event type
echo "--- Events by Type ---"
podman events --since "${HOURS}h" --filter type=image --format json 2>/dev/null | \
    jq -r '.Status' | sort | uniq -c | sort -rn
echo ""

# Images pulled
echo "--- Images Pulled ---"
podman events --since "${HOURS}h" --filter type=image --filter event=pull \
    --format json 2>/dev/null | \
    jq -r '"  \(.Time) \(.Name // .Image // "unknown")"'
echo ""

# Images removed
echo "--- Images Removed ---"
podman events --since "${HOURS}h" --filter type=image --filter event=remove \
    --format json 2>/dev/null | \
    jq -r '"  \(.Time) \(.Name // .Image // "unknown")"'
echo ""

# Current image count
echo "--- Current Image Inventory ---"
echo "  Total images: $(podman images -q | wc -l)"
echo "  Dangling images: $(podman images -f dangling=true -q | wc -l)"
```

## Forwarding Image Events to External Systems

```bash
#!/bin/bash
# forward-image-events.sh - Forward image events for external monitoring

WEBHOOK_URL="${1:-}"

podman events --filter type=image --format json | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    image=$(echo "$event" | jq -r '.Name // .Image // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    # Log locally
    echo "[${timestamp}] Image ${status}: ${image}"

    # Forward to webhook if configured
    if [ -n "$WEBHOOK_URL" ]; then
        payload=$(jq -n \
            --arg action "$status" \
            --arg image "$image" \
            --arg time "$timestamp" \
            --arg host "$(hostname)" \
            '{type: "image_event", action: $action, image: $image, timestamp: $time, host: $host}')

        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" > /dev/null
    fi
done
```

## Cleanup

```bash
# Remove test images
podman rmi myalpine:v1 myalpine:v2 2>/dev/null
podman rmi nginx:latest 2>/dev/null

# Clean up audit files
rm -f /tmp/image-audit.jsonl
```

## Summary

Monitoring image events with Podman provides critical visibility into the container image lifecycle. By tracking pulls, pushes, tags, untags, saves, and removals, you can maintain a complete audit trail of image operations. Security monitoring for unapproved registries, disk usage tracking, and event forwarding to external systems ensure your image management is both secure and well-governed. Image event monitoring is a fundamental component of container supply chain security.
