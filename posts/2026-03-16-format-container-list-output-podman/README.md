# How to Format Container List Output in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Management, Formatting

Description: Learn how to customize Podman container list output using Go templates, table formats, and JSON for readable and scriptable results.

---

> Custom output formatting transforms raw container data into exactly the view you need, whether for human reading or machine parsing.

The `--format` flag in `podman ps` uses Go templates to give you complete control over what columns appear and how they are displayed. This guide covers commonly used format fields, template functions, and practical formatting patterns.

---

## Available Format Fields

Here are common template fields you can use with `podman ps --format`:

| Field | Description |
|-------|-------------|
| `{{.ID}}` | Container ID |
| `{{.Names}}` | Container name |
| `{{.Image}}` | Image name |
| `{{.Command}}` | Command being run |
| `{{.Created}}` | Creation time |
| `{{.CreatedAt}}` | Creation timestamp |
| `{{.RunningFor}}` | Time since created |
| `{{.Status}}` | Container status |
| `{{.State}}` | Container state |
| `{{.Ports}}` | Published ports |
| `{{.Size}}` | Container size |
| `{{.Labels}}` | All labels |
| `{{.Mounts}}` | Volume mounts |
| `{{.Networks}}` | Networks |
| `{{.Pod}}` | Pod ID |
| `{{.PodName}}` | Pod name |
| `{{.ExitCode}}` | Exit code |
| `{{.Pid}}` | Process ID |

## Basic Custom Format

```bash
# Show only names and status

podman ps --format "{{.Names}} - {{.Status}}"

# Show ID, name, and image
podman ps -a --format "{{.ID}} {{.Names}} {{.Image}}"
```

## Table Format

Use the `table` keyword to get aligned columns with headers.

```bash
# Simple table with specific columns
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Detailed table
podman ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.ExitCode}}"

# Table with size information
podman ps -a --size --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
```

## JSON Output

```bash
# Full JSON output
podman ps --format json

# Pretty-print with jq
podman ps --format json | jq '.'

# Extract specific fields with jq
podman ps --format json | jq '.[] | {name: .Names[0], image: .Image, state: .State}'

# Create custom JSON structure
podman ps --format json | jq '[.[] | {name: .Names[0], ports: .Ports, status: .State}]'
```

## Go Template Functions

Use Go template functions for conditional formatting and string manipulation.

```bash
# Uppercase names
podman ps --format "{{upper .Names}}: {{.Status}}"

# Lowercase image names
podman ps --format "{{lower .Image}}"

# Truncate long fields
podman ps --format "{{.Names}}\t{{truncate .Image 30}}"

# Conditional output with if/else
podman ps -a --format '{{.Names}} {{if eq .State "running"}}[OK]{{else}}[DOWN]{{end}}'
```

## Formatting for Scripts

### CSV Output

```bash
# Generate CSV format
echo "Name,Image,Status,Ports"
podman ps --format json | jq -r '.[] | [.Names[0], .Image, .Status, (.Ports | tostring)] | @csv'
```

### TSV Output

```bash
# Tab-separated values for spreadsheet import
podman ps --format "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

### One Value Per Line

```bash
# List just container names, one per line
podman ps --format "{{.Names}}"

# List just container IDs
podman ps --format "{{.ID}}"
```

## Practical Format Examples

### Operations Dashboard

```bash
# Create a compact dashboard view
podman ps --format "table {{.Names}}\t{{.State}}\t{{.RunningFor}}\t{{.Ports}}"
```

### Network Overview

```bash
# Show containers with their network configuration
podman ps --format "table {{.Names}}\t{{.Networks}}\t{{.Ports}}"
```

Resource Report

```bash
# Show containers with resource-related info
podman ps --size --format "table {{.Names}}\t{{.Image}}\t{{.Size}}"
```

### Label Inspection

```bash
# Show containers with their labels
podman ps --format "table {{.Names}}\t{{.Labels}}"

# Show containers with their labels (use inspect for specific label values)
podman ps --format "{{.Names}}: {{.Labels}}"
```

### Container Details

```bash
# Detailed view with all useful fields
podman ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Command}}\t{{.Created}}\t{{.Status}}\t{{.Ports}}"
```

## Formatting with Sorting

```bash
# Sort by name with custom format
podman ps --sort names --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"

# Sort by creation time
podman ps --sort created --format "table {{.Names}}\t{{.Created}}\t{{.Status}}"
```

## Saving Format Aliases

Create shell aliases for frequently used formats.

```bash
# Add to ~/.bashrc or ~/.zshrc

# Compact container list
alias psc='podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# All containers with exit codes
alias psa='podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"'

# Container names only
alias psn='podman ps --format "{{.Names}}"'

# JSON output
alias psj='podman ps --format json | jq .'
```

## Reporting Script

```bash
#!/bin/bash
# report.sh - Formatted container report

echo "=== Container Report $(date) ==="
echo ""

echo "--- Running ---"
podman ps --format "table {{.Names}}\t{{.Image}}\t{{.RunningFor}}\t{{.Ports}}"

echo ""
echo "--- Stopped ---"
podman ps -a --filter status=exited \
  --format "table {{.Names}}\t{{.Image}}\t{{.ExitCode}}\t{{.Status}}"

echo ""
echo "--- Summary ---"
echo "Running: $(podman ps -q | wc -l)"
echo "Total: $(podman ps -a -q | wc -l)"
```

## Summary

The `--format` flag in `podman ps` provides complete control over container list output. Use Go templates for custom text formats, `table` for aligned columns, and `json` for machine-readable output. Create shell aliases for your most-used formats and combine formatting with filters and sorting for powerful container management views.
