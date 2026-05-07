# How to Audit Podman Container Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Auditing, Compliance

Description: Learn how to audit the security configuration of Podman containers to identify misconfigurations and enforce best practices.

---

> You cannot secure what you do not measure. Regular security audits of your container configurations are essential to maintaining a strong defense posture.

Auditing Podman containers involves inspecting their runtime configuration, checking for overly permissive settings, and ensuring that security best practices are followed. This guide walks through practical techniques to audit container security settings systematically.

---

## Inspecting Container Security Configuration

Start by examining the security-relevant settings of your running containers.

```bash
# Launch a sample container for auditing

podman run --rm -d --name audit-target docker.io/library/nginx:alpine

# Inspect key security settings
podman inspect audit-target --format '
  ReadOnly: {{.HostConfig.ReadonlyRootfs}}
  Privileged: {{.HostConfig.Privileged}}
  Capabilities: {{.EffectiveCaps}}
  User: {{.Config.User}}
  ProcessLabel: {{.ProcessLabel}}
'
```

## Building an Audit Script

Create a script that checks multiple security properties of all running containers.

```bash
#!/bin/bash
# podman-audit.sh - Audit security settings of all running Podman containers

echo "========================================"
echo "Podman Container Security Audit Report"
echo "Date: $(date)"
echo "========================================"

# Get all running container IDs
containers=$(podman ps -q)

if [ -z "$containers" ]; then
  echo "No running containers found."
  exit 0
fi

for cid in $containers; do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  echo ""
  echo "--- Container: $name ($cid) ---"

  # Check read-only root filesystem
  ro=$(podman inspect "$cid" --format '{{.HostConfig.ReadonlyRootfs}}')
  if [ "$ro" = "false" ]; then
    echo "[WARN] Root filesystem is writable"
  else
    echo "[PASS] Root filesystem is read-only"
  fi

  # Check privileged mode
  priv=$(podman inspect "$cid" --format '{{.HostConfig.Privileged}}')
  if [ "$priv" = "true" ]; then
    echo "[FAIL] Container is running in privileged mode"
  else
    echo "[PASS] Container is not privileged"
  fi

  # Check if running as root
  user=$(podman inspect "$cid" --format '{{.Config.User}}')
  if [ -z "$user" ] || [ "$user" = "root" ] || [ "$user" = "0" ]; then
    echo "[WARN] Container is running as root"
  else
    echo "[PASS] Container is running as user: $user"
  fi

  # Check capabilities
  caps=$(podman inspect "$cid" --format '{{.EffectiveCaps}}')
  cap_count=$(echo "$caps" | tr ' ' '\n' | wc -w)
  if [ "$cap_count" -gt 5 ]; then
    echo "[WARN] Container has $cap_count capabilities (consider reducing)"
  else
    echo "[PASS] Container has $cap_count capabilities"
  fi

  # Check for host network mode
  netmode=$(podman inspect "$cid" --format '{{.HostConfig.NetworkMode}}')
  if [ "$netmode" = "host" ]; then
    echo "[FAIL] Container uses host network mode"
  else
    echo "[PASS] Container uses isolated network: $netmode"
  fi

  # Check for host PID namespace
  pidmode=$(podman inspect "$cid" --format '{{.HostConfig.PidMode}}')
  if [ "$pidmode" = "host" ]; then
    echo "[FAIL] Container shares host PID namespace"
  else
    echo "[PASS] Container has isolated PID namespace"
  fi
done

echo ""
echo "========================================"
echo "Audit complete."
echo "========================================"
```

```bash
# Save and run the audit script
chmod +x podman-audit.sh
./podman-audit.sh
```

## Checking for Privileged Containers

Privileged containers should almost never be used in production.

```bash
# Find any privileged containers
podman ps -q | while read cid; do
  priv=$(podman inspect "$cid" --format '{{.HostConfig.Privileged}}')
  name=$(podman inspect "$cid" --format '{{.Name}}')
  if [ "$priv" = "true" ]; then
    echo "ALERT: $name is running in privileged mode"
  fi
done
```

## Auditing Container Images

Check the images your containers are using for security concerns.

```bash
# List all images with their sizes and creation dates
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.Created}}"
```

```bash
# Check if any containers use the latest tag (not recommended for production)
podman ps --format '{{.Image}}' | while read img; do
  ref_without_digest=${img%@*}
  last_component=${ref_without_digest##*/}
  if [ "$last_component" = "latest" ] || ! echo "$last_component" | grep -q ":"; then
    echo "[WARN] Using 'latest' tag: $img"
  fi
done
```

## Auditing Volume Mounts

Check for potentially dangerous volume mounts.

```bash
# Inspect volume mounts for all running containers
podman ps -q | while read cid; do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  mounts=$(podman inspect "$cid" --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{println}}{{end}}')
  if [ -n "$mounts" ]; then
    echo "Container: $name"
    echo "$mounts"
    echo "---"
  fi
done
```

## Auditing Network Exposure

```bash
# List all containers with published ports
podman ps --format '{{.Names}}: {{.Ports}}' | grep -v "^$"
```

```bash
# Check for containers binding to all interfaces (0.0.0.0)
podman ps --format '{{.Names}} {{.Ports}}' | while read line; do
  if echo "$line" | grep -q "0.0.0.0"; then
    echo "[WARN] $line (bound to all interfaces)"
  fi
done
```

## Generating an Audit Report

```bash
# Generate a JSON audit report for all containers
first=true
printf '[\n'
podman ps -q | while read cid; do
  if [ "$first" = true ]; then
    first=false
  else
    printf ',\n'
  fi
  podman inspect "$cid" --format '  {
    "name": "{{.Name}}",
    "image": "{{.Config.Image}}",
    "readonly": {{.HostConfig.ReadonlyRootfs}},
    "privileged": {{.HostConfig.Privileged}},
    "user": "{{.Config.User}}",
    "network_mode": "{{.HostConfig.NetworkMode}}",
    "capabilities": "{{.EffectiveCaps}}"
  }'
done
printf '\n]\n'
```

## Cleanup

```bash
podman stop audit-target 2>/dev/null
podman rm audit-target 2>/dev/null
```

## Summary

Regular security audits of Podman containers help you catch misconfigurations before they become vulnerabilities. By scripting these checks and running them as part of your CI/CD pipeline or periodic review process, you can enforce a baseline security posture across all container deployments. Focus on the key areas: privilege levels, capabilities, filesystem access, network exposure, and image provenance.
