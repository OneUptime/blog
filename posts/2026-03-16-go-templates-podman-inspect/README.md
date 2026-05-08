# How to Use Go Templates with podman inspect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Go Templates, Container Inspection

Description: Master Go template syntax for podman inspect to extract and format container data precisely, from simple field access to complex iterations and conditionals.

---

> Go templates transform podman inspect from a raw JSON dump into a precision data extraction tool.

The `--format` flag in `podman inspect` uses Go's template language to extract and format specific data from the inspection output. This powerful feature lets you query exact fields, iterate over lists, apply conditionals, and produce custom output. This guide teaches you Go template syntax specifically for Podman.

---

## Basic Field Access

Access fields using double curly braces and dot notation:

```bash
# Start a test container

podman run -d --name my-app -p 8080:80 -e APP_ENV=prod -e DB_HOST=localhost nginx:latest

# Access a top-level field
podman inspect my-app --format '{{.ID}}'

# Access nested fields with dots
podman inspect my-app --format '{{.State.Status}}'
podman inspect my-app --format '{{.Config.Image}}'
podman inspect my-app --format '{{.NetworkSettings.IPAddress}}'
```

## The json Function

Convert any value to JSON format for structured data:

```bash
# Get ports as JSON
podman inspect my-app --format '{{json .NetworkSettings.Ports}}'

# Get environment as JSON
podman inspect my-app --format '{{json .Config.Env}}'

# Pretty-print JSON by piping to python
podman inspect my-app --format '{{json .Config}}' | python3 -m json.tool

# Get mount info as JSON
podman inspect my-app --format '{{json .Mounts}}'
```

## Iterating with range

Loop over arrays and maps:

```bash
# Iterate over environment variables
podman inspect my-app --format '{{range .Config.Env}}{{println .}}{{end}}'

# Iterate over mounts
podman run -d --name vol-test -v /tmp:/data:z nginx:latest
podman inspect vol-test --format '{{range .Mounts}}Source: {{.Source}} -> Dest: {{.Destination}}{{println}}{{end}}'

# Iterate with index
podman inspect my-app --format '{{range $i, $v := .Config.Env}}{{$i}}: {{$v}}{{println}}{{end}}'
```

## Conditional Logic with if

Use if statements to handle conditional output:

```bash
# Check if the container is running
podman inspect my-app --format '{{if .State.Running}}Container is UP{{else}}Container is DOWN{{end}}'

# Check if a value is empty
podman inspect my-app --format '{{if .Config.WorkingDir}}Workdir: {{.Config.WorkingDir}}{{else}}No workdir set{{end}}'

# Nested conditionals
podman inspect my-app --format '{{if .State.Running}}Running since {{.State.StartedAt}}{{else}}Stopped at {{.State.FinishedAt}}{{end}}'
```

## String Functions

Go templates include several useful string functions:

```bash
# Get the length of an array
podman inspect my-app --format '{{len .Config.Env}} environment variables'

# Slice a string (get first 12 chars of container ID)
podman inspect my-app --format '{{slice .ID 0 12}}'

# Use printf for formatting
podman inspect my-app --format '{{printf "%-20s %s" .Name .State.Status}}'
```

## Comparison Operators

Use eq, ne, lt, gt, le, ge for comparisons:

```bash
# Check if status equals a specific value
podman inspect my-app --format '{{if eq .State.Status "running"}}HEALTHY{{else}}UNHEALTHY{{end}}'

# Compare numeric values (exit code)
podman inspect my-app --format '{{if eq .State.ExitCode 0}}Clean exit{{else}}Exit code: {{.State.ExitCode}}{{end}}'
```

## Combining Multiple Fields

Build custom output formats:

```bash
# Custom container summary
podman inspect my-app --format 'Name={{.Name}} | Image={{.Config.Image}} | Status={{.State.Status}} | IP={{.NetworkSettings.IPAddress}}'

# Multi-line report
podman inspect my-app --format '
Container Report
================
Name:    {{.Name}}
ID:      {{slice .ID 0 12}}
Image:   {{.Config.Image}}
Status:  {{.State.Status}}
Started: {{.State.StartedAt}}
IP:      {{.NetworkSettings.IPAddress}}'
```

## Working with Maps

Access map values using the index function:

```bash
# Access specific port mapping
podman inspect my-app --format '{{json (index .NetworkSettings.Ports "80/tcp")}}'

# Access specific labels
podman run -d --name labeled-app --label app=web --label env=prod nginx:latest
podman inspect labeled-app --format '{{index .Config.Labels "app"}}'
podman inspect labeled-app --format '{{index .Config.Labels "env"}}'
```

## Iterating Over Labels

```bash
# List all labels
podman inspect labeled-app --format '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{println}}{{end}}'
```

## Using Templates with Multiple Containers

Apply templates across multiple containers using `podman ps`:

```bash
# List all containers with custom format
podman ps --format '{{.ID}} | {{.Names}} | {{.Status}} | {{.Ports}}'

# Get IPs of all running containers
podman ps -q | xargs -I {} podman inspect {} --format '{{.Name}}: {{.NetworkSettings.IPAddress}}'
```

## Advanced Template Examples

### Container Health Dashboard

```bash
# Build a dashboard line for each container
for container in $(podman ps -q); do
    podman inspect "$container" --format \
        '{{printf "%-20s %-10s %-15s %s" .Name .State.Status .NetworkSettings.IPAddress .Config.Image}}'
done
```

### Export Container Configuration

```bash
# Generate a summary of container config suitable for documentation
podman inspect my-app --format '
## {{.Name}}
- **Image**: {{.Config.Image}}
- **Created**: {{.Created}}
- **Environment**:
{{range .Config.Env}}  - {{.}}
{{end}}- **Ports**: {{json .NetworkSettings.Ports}}'
```

## Cleanup

```bash
podman stop my-app vol-test labeled-app 2>/dev/null
podman rm my-app vol-test labeled-app 2>/dev/null
```

## Summary

Go templates in `podman inspect` provide powerful data extraction capabilities. Use dot notation for field access, `{{json .Field}}` for structured output, `{{range}}` for iteration, and `{{if}}` for conditionals. Combine these with string functions and comparison operators to build custom container reports and monitoring scripts.
