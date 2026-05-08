# How to Format Image List Output in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image

Description: Learn how to customize and format the output of Podman image listings using Go templates, JSON output, and table formatting.

---

> Custom formatting transforms raw image data into exactly the information you need for monitoring, reporting, and automation.

Podman's default image list output is useful but not always what you need. Whether you are building scripts, generating reports, or integrating with other tools, Podman's formatting options give you complete control over how image data is displayed. This guide covers Go templates, JSON output, table formatting, and practical formatting recipes.

---

## Default Output Format

The standard `podman images` output includes five columns.

```bash
# Default output

podman images

# Output columns:
# REPOSITORY  TAG  IMAGE ID  CREATED  SIZE
```

## Using Go Templates

Podman uses Go template syntax for custom formatting.

```bash
# Show only repository and tag
podman images --format "{{.Repository}}:{{.Tag}}"

# Show image ID and size
podman images --format "{{.ID}} {{.Size}}"

# Show all available fields
podman images --format "Repo: {{.Repository}}, Tag: {{.Tag}}, ID: {{.ID}}, Created: {{.Created}}, Size: {{.Size}}"
```

## Available Template Fields

Here are the fields you can use in format templates.

```bash
# Common fields and their usage
podman images --format "Repository: {{.Repository}}"
podman images --format "Tag: {{.Tag}}"
podman images --format "ID: {{.ID}}"
podman images --format "Digest: {{.Digest}}"
podman images --format "Created: {{.Created}}"
podman images --format "CreatedAt: {{.CreatedAt}}"
podman images --format "Size: {{.Size}}"
podman images --format "Labels: {{.Labels}}"

# Show all fields for the first image
podman images --format "{{json .}}" | head -1 | python3 -m json.tool
```

## Table Formatting

Create tabular output with aligned columns using the `table` keyword.

```bash
# Custom table with selected columns
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Table with digest included
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Digest}}\t{{.Size}}"

# Table with creation timestamp
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"

# Minimal table with just names and IDs
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}"
```

## JSON Output

Get structured JSON output for programmatic processing.

```bash
# Full JSON output
podman images --format json

# Pretty-print JSON
podman images --format json | python3 -m json.tool

# Extract specific fields with jq
podman images --format json | jq '.[].names'

# Get image sizes in JSON
podman images --format json | jq '.[] | {name: .names[0], size: .size}'

# Filter JSON output
podman images --format json | jq '.[] | select(.size > 100000000) | .names[0]'
```

## Practical Formatting Recipes

Common formatting patterns for real-world use cases.

```bash
# CSV output for spreadsheet import
echo "Repository,Tag,Size,Created"
podman images --format "{{.Repository}},{{.Tag}},{{.Size}},{{.CreatedAt}}"

# Markdown table output
echo "| Repository | Tag | Size |"
echo "|------------|-----|------|"
podman images --format "| {{.Repository}} | {{.Tag}} | {{.Size}} |"

# Show images sorted by size with human-readable output
podman images --sort size \
  --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

# Show images with their creation age
podman images --format "{{.Repository}}:{{.Tag}} (created {{.Created}})"
```

## Conditional Formatting

Use Go template conditionals for smarter output.

```bash
# Show tag or "none" for dangling images
podman images -a --format '{{.Repository}}:{{if eq .Tag "<none>"}}none{{else}}{{.Tag}}{{end}} {{.Size}}'

# Flag large images
podman images --format json | jq -r '.[] |
  if .size > 500000000 then "LARGE: \(.names[0]) (\(.size / 1000000 | floor)MB)"
  else "OK: \(.names[0]) (\(.size / 1000000 | floor)MB)"
  end'
```

## Scripting with Formatted Output

Use formatted output in automation scripts.

```bash
#!/bin/bash
# Generate an image inventory report

REPORT_FILE="image-report-$(date +%Y%m%d).txt"

echo "=== Podman Image Inventory Report ===" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Total image count
COUNT=$(podman images -q | wc -l)
echo "Total images: ${COUNT}" >> "$REPORT_FILE"

# Total disk usage
echo "" >> "$REPORT_FILE"
echo "--- Disk Usage ---" >> "$REPORT_FILE"
podman system df >> "$REPORT_FILE"

# Image details
echo "" >> "$REPORT_FILE"
echo "--- Image Details ---" >> "$REPORT_FILE"
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.Created}}" \
  >> "$REPORT_FILE"

echo "Report saved to ${REPORT_FILE}"
cat "$REPORT_FILE"
```

## Combining Format with Filters

Use formatting together with filters for precise output.

```bash
# Show only dangling images with their IDs and size
podman images --filter dangling=true \
  --format "table {{.ID}}\t{{.Size}}\t{{.Created}}"

# Show large images (piped through sort)
podman images --format "{{.VirtualSize}}\t{{.Repository}}:{{.Tag}}" | sort -rn

# Show images from a specific registry with custom format
podman images --filter reference='quay.io/*' \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## Summary

Podman's formatting options give you full control over image list output. Go templates are ideal for custom text formats, JSON output works best for programmatic processing, and table formatting provides clean columnar displays. Master these formatting techniques to build effective image management scripts, reports, and monitoring solutions.
