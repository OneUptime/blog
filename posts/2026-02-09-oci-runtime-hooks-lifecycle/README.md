# How to Configure OCI Runtime Hooks for Custom Container Lifecycle Events in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OCI, Container Runtime, Hooks, Lifecycle Management

Description: Learn how to implement OCI runtime hooks to execute custom logic during container lifecycle events for monitoring, security enforcement, and integration with external systems in Kubernetes.

---

OCI runtime hooks allow executing custom code at specific points in a container's lifecycle. These hooks enable integrating containers with external systems, enforcing security policies, configuring networking, or collecting telemetry without modifying application code. This guide shows you how to implement and use OCI hooks effectively in Kubernetes.

## Understanding OCI Hook Types

The OCI runtime specification defines several hook points during container lifecycle. Prestart hooks run after the container is created but before the user process starts. Poststart hooks execute after the user process starts. Poststop hooks run after the container is deleted. Each hook receives container state information via stdin and can perform actions based on that state.

Hooks execute in the runtime namespace, not the container namespace, giving them access to host resources. This makes hooks powerful for system-level operations like network configuration, volume mounting, or security policy enforcement. Understanding when each hook fires is critical for implementing correct behavior.

## Configuring Runtime Hooks in containerd

Configure containerd to execute hooks at container lifecycle points.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
    runtime_type = "io.containerd.runc.v2"
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
      SystemdCgroup = true
      # Path to runtime hooks configuration
      ConfigPath = "/etc/containerd/hooks/config.json"
```

Define hooks configuration:

```json
{
  "hooks": {
    "prestart": [
      {
        "path": "/usr/local/bin/container-prestart-hook",
        "args": ["prestart-hook", "--log-level=info"],
        "env": ["HOOK_TYPE=prestart"]
      }
    ],
    "poststart": [
      {
        "path": "/usr/local/bin/container-poststart-hook",
        "args": ["poststart-hook"],
        "env": ["HOOK_TYPE=poststart"],
        "timeout": 30
      }
    ],
    "poststop": [
      {
        "path": "/usr/local/bin/container-poststop-hook",
        "args": ["poststop-hook"],
        "env": ["HOOK_TYPE=poststop"]
      }
    ]
  }
}
```

## Implementing a Prestart Hook

Create a hook that enforces security policies before container startup.

```go
// prestart-hook/main.go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "os"
    "github.com/opencontainers/runtime-spec/specs-go"
)

func main() {
    // Read container state from stdin
    var state specs.State
    if err := json.NewDecoder(os.Stdin).Decode(&state); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to decode state: %v\n", err)
        os.Exit(1)
    }

    // Perform security checks
    if err := enforceSecurityPolicy(state); err != nil {
        fmt.Fprintf(os.Stderr, "Security policy violation: %v\n", err)
        os.Exit(1)
    }

    // Configure network policies
    if err := configureNetworkPolicies(state); err != nil {
        fmt.Fprintf(os.Stderr, "Failed to configure network: %v\n", err)
        os.Exit(1)
    }

    // Register container with monitoring system
    if err := registerWithMonitoring(state); err != nil {
        // Log but don't fail
        fmt.Fprintf(os.Stderr, "Warning: Failed to register monitoring: %v\n", err)
    }

    fmt.Println("Prestart hook completed successfully")
}

func enforceSecurityPolicy(state specs.State) error {
    // Check if container is running as root
    spec, err := readContainerSpec(state.Bundle)
    if err != nil {
        return err
    }

    if spec.Process.User.UID == 0 {
        return fmt.Errorf("containers must not run as root")
    }

    // Verify required capabilities are dropped
    requiredDrops := []string{"CAP_SYS_ADMIN", "CAP_NET_ADMIN"}
    for _, cap := range requiredDrops {
        if !isCapabilityDropped(spec, cap) {
            return fmt.Errorf("capability %s must be dropped", cap)
        }
    }

    return nil
}

func configureNetworkPolicies(state specs.State) error {
    // Apply iptables rules specific to this container
    // Implementation depends on your network policy requirements
    return nil
}

func registerWithMonitoring(state specs.State) error {
    // Send container metadata to monitoring system
    // Implementation depends on your monitoring infrastructure
    return nil
}
```

Build and install the hook:

```bash
go build -o /usr/local/bin/container-prestart-hook .
chmod +x /usr/local/bin/container-prestart-hook
```

## Creating a Poststart Hook for Registration

Implement a hook that registers containers with external systems after they start.

```python
#!/usr/bin/env python3
# poststart-hook.py

import json
import sys
import requests
import os

def main():
    # Read container state from stdin
    state = json.load(sys.stdin)
    
    container_id = state.get('id')
    bundle_path = state.get('bundle')
    
    # Read container configuration
    config_path = os.path.join(bundle_path, 'config.json')
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Extract container metadata
    labels = config.get('annotations', {})
    
    # Register with service discovery
    try:
        register_service(container_id, labels)
        print(f"Registered container {container_id}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to register: {e}", file=sys.stderr)
        # Don't fail the container start
    
    # Update inventory system
    try:
        update_inventory(container_id, config)
        print(f"Updated inventory for {container_id}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to update inventory: {e}", file=sys.stderr)

def register_service(container_id, labels):
    """Register container with service discovery system"""
    service_name = labels.get('io.kubernetes.pod.name', 'unknown')
    namespace = labels.get('io.kubernetes.pod.namespace', 'default')
    
    payload = {
        'container_id': container_id,
        'service': service_name,
        'namespace': namespace,
        'labels': labels
    }
    
    response = requests.post(
        'http://service-registry:8080/register',
        json=payload,
        timeout=5
    )
    response.raise_for_status()

def update_inventory(container_id, config):
    """Update CMDB with container information"""
    payload = {
        'container_id': container_id,
        'image': config['root']['path'],
        'created_at': config.get('created'),
        'process': config['process']['args']
    }
    
    requests.post(
        'http://cmdb:8080/containers',
        json=payload,
        timeout=5
    )

if __name__ == '__main__':
    main()
```

## Implementing a Poststop Hook for Cleanup

Create a hook that performs cleanup after container termination.

```bash
#!/bin/bash
# poststop-hook.sh

set -e

# Read container state from stdin
STATE=$(cat)

CONTAINER_ID=$(echo "$STATE" | jq -r '.id')
BUNDLE_PATH=$(echo "$STATE" | jq -r '.bundle')

# Log container termination
logger -t "oci-hook" "Container $CONTAINER_ID stopped"

# Clean up network resources
cleanup_network() {
    # Remove iptables rules for this container
    iptables -D FORWARD -m comment --comment "container-$CONTAINER_ID" -j ACCEPT 2>/dev/null || true
    
    # Remove network namespace if it exists
    ip netns del "$CONTAINER_ID" 2>/dev/null || true
}

# Deregister from service discovery
deregister_service() {
    curl -X DELETE \
        -H "Content-Type: application/json" \
        "http://service-registry:8080/deregister/$CONTAINER_ID" \
        --max-time 5 || true
}

# Archive logs
archive_logs() {
    local log_dir="/var/log/containers/$CONTAINER_ID"
    
    if [ -d "$log_dir" ]; then
        tar czf "/var/log/archives/$CONTAINER_ID-$(date +%s).tar.gz" "$log_dir"
        rm -rf "$log_dir"
    fi
}

# Execute cleanup operations
cleanup_network
deregister_service
archive_logs

echo "Poststop hook completed for $CONTAINER_ID" >&2
exit 0
```

## Using Hooks for Security Scanning

Implement hooks that scan containers for vulnerabilities before allowing them to start.

```go
// security-scan-hook.go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "os/exec"
    
    specs "github.com/opencontainers/runtime-spec/specs-go"
)

func main() {
    var state specs.State
    json.NewDecoder(os.Stdin).Decode(&state)
    
    // Read container spec
    spec, _ := readSpec(state.Bundle)
    
    // Extract image reference from annotations
    imageRef := spec.Annotations["io.kubernetes.cri.image-ref"]
    
    // Scan image for vulnerabilities
    vulnerabilities, err := scanImage(imageRef)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Scan failed: %v\n", err)
        os.Exit(1)
    }
    
    // Check for critical vulnerabilities
    criticalCount := countCritical(vulnerabilities)
    if criticalCount > 0 {
        fmt.Fprintf(os.Stderr, "CRITICAL: Image has %d critical vulnerabilities\n", criticalCount)
        os.Exit(1)
    }
    
    fmt.Printf("Security scan passed: %d total vulnerabilities\n", len(vulnerabilities))
}

func scanImage(imageRef string) ([]Vulnerability, error) {
    // Use trivy or similar scanner
    cmd := exec.Command("trivy", "image", "--format", "json", imageRef)
    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }
    
    var result ScanResult
    json.Unmarshal(output, &result)
    
    return result.Vulnerabilities, nil
}

type Vulnerability struct {
    Severity string `json:"severity"`
    VulnID   string `json:"vulnerabilityID"`
}

type ScanResult struct {
    Vulnerabilities []Vulnerability `json:"Results"`
}

func countCritical(vulns []Vulnerability) int {
    count := 0
    for _, v := range vulns {
        if v.Severity == "CRITICAL" {
            count++
        }
    }
    return count
}
```

## Monitoring Hook Execution

Track hook performance and failures to ensure they don't impact container startup times.

```yaml
# prometheus-hook-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hook-metrics
data:
  queries.yml: |
    groups:
    - name: oci-hooks
      rules:
      - record: hook_execution_duration_seconds
        expr: histogram_quantile(0.99, rate(oci_hook_duration_seconds_bucket[5m]))
      
      - record: hook_failure_rate
        expr: rate(oci_hook_failures_total[5m]) / rate(oci_hook_executions_total[5m])
```

Instrument hooks with metrics:

```go
// Add metrics to your hook
import "github.com/prometheus/client_golang/prometheus"

var (
    hookDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "oci_hook_duration_seconds",
            Help: "Duration of hook execution",
        },
        []string{"hook_type"},
    )
    
    hookFailures = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "oci_hook_failures_total",
            Help: "Total hook failures",
        },
        []string{"hook_type", "reason"},
    )
)

func init() {
    prometheus.MustRegister(hookDuration)
    prometheus.MustRegister(hookFailures)
}
```

## Troubleshooting Hook Issues

Debug problems with hook execution.

```bash
# Enable hook debugging in containerd
# Add to /etc/containerd/config.toml:
[debug]
  level = "debug"

# Restart containerd
sudo systemctl restart containerd

# View hook execution logs
sudo journalctl -u containerd -f | grep hook

# Test hook manually
echo '{"id":"test","bundle":"/tmp/test"}' | /usr/local/bin/container-prestart-hook

# Check hook exit codes
sudo crictl inspect <container-id> | jq '.info.runtimeSpec.hooks'
```

OCI runtime hooks provide powerful extension points for customizing container behavior in Kubernetes. By implementing hooks for security enforcement, service registration, and resource management, you can integrate containers seamlessly with existing infrastructure without modifying applications. Keep hooks lightweight and fast to avoid impacting container startup latency, and implement proper error handling to prevent hook failures from blocking legitimate containers.
