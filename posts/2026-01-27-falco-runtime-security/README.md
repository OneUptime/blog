# How to Get Started with Falco for Runtime Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Falco, Runtime Security, Kubernetes, Container Security, Cloud Native, Threat Detection, eBPF, DevSecOps

Description: A comprehensive guide to deploying and configuring Falco for runtime threat detection across Kubernetes, Docker, and bare metal environments.

---

> Runtime security is not optional. Traditional security tools scan images at build time, but attackers exploit running containers. Falco watches system calls in real-time and alerts you the moment something suspicious happens - whether that is a shell spawning in a container, sensitive files being read, or unexpected network connections.

## What is Falco?

Falco is an open-source runtime security tool originally created by Sysdig and now a CNCF graduated project. It uses kernel-level instrumentation (via eBPF or a kernel module) to monitor system calls and detect anomalous behavior based on customizable rules.

```mermaid
flowchart LR
    subgraph Host["Host / Node"]
        Kernel[Linux Kernel]
        Driver[Falco Driver<br/>eBPF or Kernel Module]
        Engine[Falco Engine]
        Rules[Rules Engine]
    end

    subgraph Containers["Containers"]
        C1[Container A]
        C2[Container B]
        C3[Container C]
    end

    C1 --> Kernel
    C2 --> Kernel
    C3 --> Kernel
    Kernel --> Driver
    Driver --> Engine
    Engine --> Rules
    Rules --> Alerts[Alerts]
```

## Installation

Falco can be installed in multiple ways depending on your environment.

### Installing on Kubernetes with Helm

Helm is the recommended method for Kubernetes deployments. Falco runs as a DaemonSet, ensuring coverage on every node.

```bash
# Add the Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

# Create a dedicated namespace for security tools
kubectl create namespace falco
```

```yaml
# falco-values.yaml
# Helm values for production Falco deployment

# Use eBPF driver instead of kernel module (recommended for modern kernels)
driver:
  kind: ebpf
  # Enable the modern eBPF probe (requires kernel 5.8+)
  ebpf:
    hostNetwork: true

# Configure Falco engine settings
falco:
  # Set to true for more verbose logging during troubleshooting
  logLevel: info
  # Priority threshold for alerts (emergency, alert, critical, error, warning, notice, info, debug)
  priority: warning
  # Enable JSON output for easier parsing by log aggregators
  jsonOutput: true
  # Include output fields in JSON format
  jsonIncludeOutputProperty: true

# Resource limits for the Falco pods
resources:
  requests:
    cpu: 100m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1024Mi

# Tolerations to ensure Falco runs on all nodes including masters
tolerations:
  - effect: NoSchedule
    operator: Exists

# Configure where Falco sends alerts
falcosidekick:
  # Enable Falcosidekick for flexible alert routing
  enabled: true
```

```bash
# Install Falco with custom values
helm install falco falcosecurity/falco \
  --namespace falco \
  --values falco-values.yaml

# Verify the installation
kubectl get pods -n falco -w
```

### Installing on Docker

For Docker-only environments, run Falco as a privileged container.

```bash
# Pull the latest Falco image
docker pull falcosecurity/falco:latest

# Run Falco with access to host kernel
docker run -d \
  --name falco \
  --privileged \
  --pid=host \
  -v /var/run/docker.sock:/host/var/run/docker.sock \
  -v /dev:/host/dev \
  -v /proc:/host/proc:ro \
  -v /boot:/host/boot:ro \
  -v /lib/modules:/host/lib/modules:ro \
  -v /usr:/host/usr:ro \
  -v /etc:/host/etc:ro \
  falcosecurity/falco:latest
```

For Docker Compose deployments:

```yaml
# docker-compose.yml
version: "3.8"

services:
  falco:
    image: falcosecurity/falco:latest
    container_name: falco
    privileged: true
    pid: host
    volumes:
      # Docker socket for container metadata
      - /var/run/docker.sock:/host/var/run/docker.sock
      # Device access for driver
      - /dev:/host/dev
      # Proc filesystem for process information
      - /proc:/host/proc:ro
      # Boot directory for kernel headers
      - /boot:/host/boot:ro
      # Kernel modules
      - /lib/modules:/host/lib/modules:ro
      # System binaries for detection context
      - /usr:/host/usr:ro
      # System configuration
      - /etc:/host/etc:ro
      # Custom rules (optional)
      - ./custom-rules:/etc/falco/rules.d:ro
    restart: unless-stopped
```

### Installing on Bare Metal

For servers without containers, install Falco directly on the host.

```bash
# Add Falco repository (Debian/Ubuntu)
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/falcosecurity.list

sudo apt-get update
sudo apt-get install -y falco

# For RHEL/CentOS/Fedora
sudo rpm --import https://falco.org/repo/falcosecurity-packages.asc
sudo curl -fsSL -o /etc/yum.repos.d/falcosecurity.repo \
  https://falco.org/repo/falcosecurity-rpm.repo
sudo yum install -y falco
```

```bash
# Start Falco service
sudo systemctl enable falco
sudo systemctl start falco

# Check status
sudo systemctl status falco

# View logs
sudo journalctl -u falco -f
```

## Falco Architecture

Understanding Falco's architecture helps you troubleshoot issues and optimize performance.

### Components

1. **Driver**: Captures system calls from the kernel
   - **eBPF probe** (recommended): Modern, safe, no kernel module compilation needed
   - **Kernel module**: Legacy option, requires matching kernel headers

2. **Userspace Engine**: Processes events and evaluates rules

3. **Rules Engine**: YAML-based detection rules with conditions and outputs

4. **Output Channels**: Where alerts are sent (stdout, files, syslog, HTTP, gRPC)

### How Detection Works

```mermaid
sequenceDiagram
    participant App as Application
    participant Kernel as Linux Kernel
    participant Driver as Falco Driver
    participant Engine as Rules Engine
    participant Output as Output Channel

    App->>Kernel: System Call (open, execve, connect)
    Kernel->>Driver: Syscall Event
    Driver->>Engine: Filtered Event
    Engine->>Engine: Evaluate Rules
    alt Rule Matches
        Engine->>Output: Generate Alert
    end
```

## Understanding Default Rules

Falco ships with a comprehensive default ruleset covering common attack patterns.

### Rule Categories

```yaml
# Example: Detecting shell spawning in containers
# This rule fires when a shell process starts inside a container
- rule: Terminal shell in container
  desc: >
    A shell was used as the entrypoint/exec point into a container
    with an attached terminal.
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint
  output: >
    A shell was spawned in a container with an attached terminal
    (user=%user.name user_loginuid=%user.loginuid %container.info
    shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline
    terminal=%proc.tty container_id=%container.id image=%container.image.repository)
  priority: NOTICE
  tags: [container, shell, mitre_execution]
```

### Key Default Rules

| Rule | Description | Priority |
|------|-------------|----------|
| Terminal shell in container | Shell spawned with TTY | NOTICE |
| Write below etc | File created in /etc | ERROR |
| Read sensitive file untrusted | Reading /etc/shadow, /etc/passwd | WARNING |
| Launch Privileged Container | Container with --privileged | INFO |
| Unexpected outbound connection | Process connecting to unusual port | WARNING |
| Modify binary dirs | Writing to /bin, /sbin, /usr/bin | ERROR |

### Viewing Active Rules

```bash
# List all loaded rules in Kubernetes
kubectl exec -n falco -it $(kubectl get pods -n falco -l app.kubernetes.io/name=falco -o jsonpath='{.items[0].metadata.name}') -- falco --list

# On bare metal
falco --list

# Test a specific rule
falco -r /etc/falco/falco_rules.yaml --validate
```

## Output Channels

Falco supports multiple output destinations for alerts.

### Configuring Outputs

```yaml
# /etc/falco/falco.yaml
# Output configuration section

# Enable JSON format for all outputs
json_output: true
json_include_output_property: true
json_include_tags_property: true

# Stdout output (for container logs / kubectl logs)
stdout_output:
  enabled: true

# File output for persistent logging
file_output:
  enabled: true
  keep_alive: false
  filename: /var/log/falco/events.log

# Syslog output for centralized logging
syslog_output:
  enabled: true

# HTTP output for webhooks
http_output:
  enabled: true
  url: http://falcosidekick:2801/
  user_agent: "falco/0.37.0"

# gRPC output for streaming to external services
grpc_output:
  enabled: false

# Program output - pipe to external command
program_output:
  enabled: false
  keep_alive: false
  program: "jq '{text: .output}' | curl -d @- -X POST https://hooks.slack.com/services/XXX"
```

### Output Format

```json
{
  "hostname": "k8s-worker-01",
  "output": "A shell was spawned in a container with an attached terminal (user=root user_loginuid=-1 k8s.ns=production k8s.pod=nginx-7d8f675b-xyz shell=bash parent=runc cmdline=bash terminal=34816 container_id=abc123 image=nginx)",
  "priority": "Notice",
  "rule": "Terminal shell in container",
  "source": "syscall",
  "tags": ["container", "shell", "mitre_execution"],
  "time": "2026-01-27T10:30:00.000000000Z",
  "output_fields": {
    "container.id": "abc123",
    "container.image.repository": "nginx",
    "evt.time": 1737974400000000000,
    "k8s.ns.name": "production",
    "k8s.pod.name": "nginx-7d8f675b-xyz",
    "proc.cmdline": "bash",
    "proc.name": "bash",
    "proc.pname": "runc",
    "proc.tty": 34816,
    "user.loginuid": -1,
    "user.name": "root"
  }
}
```

## Falcosidekick Integration

Falcosidekick is a companion tool that routes Falco alerts to 50+ destinations.

### Architecture with Falcosidekick

```mermaid
flowchart LR
    Falco[Falco] --> Sidekick[Falcosidekick]
    Sidekick --> Slack[Slack]
    Sidekick --> PD[PagerDuty]
    Sidekick --> Elastic[Elasticsearch]
    Sidekick --> Loki[Loki]
    Sidekick --> Kafka[Kafka]
    Sidekick --> Webhook[Custom Webhook]
    Sidekick --> S3[AWS S3]
    Sidekick --> Teams[MS Teams]
```

### Deploying Falcosidekick

```yaml
# falcosidekick-values.yaml
# Configuration for Falcosidekick Helm deployment

# Slack integration
config:
  slack:
    webhookurl: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
    channel: "#security-alerts"
    username: "Falco"
    # Minimum priority to send to Slack
    minimumpriority: "warning"
    # Message format
    outputformat: "all"

  # PagerDuty integration for critical alerts
  pagerduty:
    routingkey: "your-pagerduty-integration-key"
    minimumpriority: "critical"

  # Elasticsearch for long-term storage and analysis
  elasticsearch:
    hostport: "http://elasticsearch:9200"
    index: "falco"
    type: "_doc"
    minimumpriority: "notice"

  # Loki for Grafana integration
  loki:
    hostport: "http://loki:3100"
    minimumpriority: "notice"

  # Custom webhook for integration with your systems
  webhook:
    address: "https://your-webhook-endpoint.com/falco"
    minimumpriority: "warning"
    customheaders: "Authorization: Bearer your-token"

# Enable web UI for debugging
webui:
  enabled: true
```

```bash
# Install Falcosidekick
helm install falcosidekick falcosecurity/falcosidekick \
  --namespace falco \
  --values falcosidekick-values.yaml

# Verify deployment
kubectl get pods -n falco -l app.kubernetes.io/name=falcosidekick
```

### Testing the Integration

```bash
# Generate a test alert by spawning a shell in a container
kubectl run test-shell --image=alpine --rm -it -- /bin/sh

# Check Falcosidekick received the event
kubectl logs -n falco -l app.kubernetes.io/name=falcosidekick -f
```

## Tuning Alerts and Writing Custom Rules

Default rules generate noise. Tuning is essential for production use.

### Reducing False Positives

```yaml
# /etc/falco/rules.d/custom-exceptions.yaml
# Custom exceptions to reduce noise

# Override the default Terminal shell rule to exclude specific namespaces
- rule: Terminal shell in container
  append: true
  condition: and not (k8s.ns.name in (kube-system, monitoring, logging))

# Exclude specific containers from sensitive file reads
- macro: user_sensitive_mount_containers
  condition: (container.image.repository in (vault, consul, etcd))

# Create a list of allowed images for shell access
- list: shell_allowed_images
  items: [debug-tools, troubleshooting-pod]

- rule: Terminal shell in container
  append: true
  condition: and not (container.image.repository in (shell_allowed_images))
```

### Writing Custom Rules

```yaml
# /etc/falco/rules.d/custom-rules.yaml
# Organization-specific detection rules

# Detect cryptocurrency mining
- rule: Detect crypto mining process
  desc: Detects common cryptocurrency mining processes
  condition: >
    spawned_process and
    (proc.name in (xmrig, minerd, cpuminer, cgminer, bfgminer, ethminer) or
     proc.cmdline contains "stratum+tcp" or
     proc.cmdline contains "pool.minergate" or
     proc.cmdline contains "crypto-pool")
  output: >
    Cryptocurrency mining process detected
    (user=%user.name command=%proc.cmdline container=%container.id
    image=%container.image.repository k8s.pod=%k8s.pod.name)
  priority: CRITICAL
  tags: [cryptomining, mitre_resource_hijacking]

# Detect package manager usage in production containers
- rule: Package management in production
  desc: Package managers should not run in production containers
  condition: >
    spawned_process and container and
    k8s.ns.name = "production" and
    proc.name in (apt, apt-get, yum, dnf, apk, pip, npm, gem)
  output: >
    Package manager executed in production container
    (user=%user.name command=%proc.cmdline container=%container.id
    image=%container.image.repository)
  priority: WARNING
  tags: [package_management, compliance]

# Detect kubectl exec attempts
- rule: Kubectl exec to pod
  desc: Detect kubectl exec commands to pods
  condition: >
    spawned_process and container and
    proc.pname = "runc" and
    proc.name in (bash, sh, zsh, ash)
  output: >
    Shell spawned via kubectl exec
    (user=%user.name shell=%proc.name pod=%k8s.pod.name
    namespace=%k8s.ns.name container=%container.id)
  priority: NOTICE
  tags: [kubectl, exec, access]

# Detect secrets being read from environment
- rule: Environment variable secret access
  desc: Process accessing potential secrets from environment
  condition: >
    spawned_process and container and
    (proc.cmdline contains "AWS_SECRET" or
     proc.cmdline contains "API_KEY" or
     proc.cmdline contains "PASSWORD" or
     proc.cmdline contains "TOKEN")
  output: >
    Process command line contains potential secret
    (user=%user.name command=%proc.cmdline container=%container.id)
  priority: WARNING
  tags: [secrets, credentials]
```

### Rule Syntax Reference

```yaml
# Macros - reusable conditions
- macro: container
  condition: container.id != host

- macro: spawned_process
  condition: evt.type = execve and evt.dir = <

# Lists - reusable arrays
- list: shell_binaries
  items: [bash, sh, zsh, ksh, csh, tcsh, ash, dash]

# Rules - detection logic
- rule: Rule Name
  desc: Description of what the rule detects
  condition: macro_name and field operator value
  output: Alert message with %field.name placeholders
  priority: DEBUG|INFO|NOTICE|WARNING|ERROR|CRITICAL|ALERT|EMERGENCY
  tags: [tag1, tag2]
  enabled: true
```

### Validating Custom Rules

```bash
# Validate rule syntax
falco -r /etc/falco/rules.d/custom-rules.yaml --validate

# Test rules with dry run
falco -r /etc/falco/rules.d/custom-rules.yaml --dry-run

# Check for rule conflicts
falco --list --list-detail

# In Kubernetes, apply and check logs
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-custom-rules
  namespace: falco
data:
  custom-rules.yaml: |
    # Your rules here
EOF

kubectl rollout restart daemonset/falco -n falco
kubectl logs -n falco -l app.kubernetes.io/name=falco -f
```

## Best Practices Summary

### Deployment

- Use eBPF driver on kernel 5.8+ for better performance and stability
- Deploy as DaemonSet in Kubernetes to cover all nodes
- Set appropriate resource limits to prevent Falco from impacting workloads
- Use tolerations to ensure Falco runs on all nodes including control plane

### Rule Management

- Start with default rules and tune based on your environment
- Use separate files in rules.d for custom rules and exceptions
- Test rules in staging before production deployment
- Version control your custom rules alongside application code
- Review and update rules quarterly as threats evolve

### Alert Routing

- Use Falcosidekick for flexible multi-destination routing
- Set minimum priority thresholds per destination
- Send critical alerts to PagerDuty or similar for immediate response
- Archive all alerts to Elasticsearch or Loki for forensics
- Create dashboards in Grafana for security visibility

### Operations

- Monitor Falco itself with metrics (Prometheus exporter available)
- Set up alerts for Falco failures or high drop rates
- Regularly test detection with simulated attacks
- Document exceptions with justifications for audit trails
- Integrate with incident response workflows

### Performance Tuning

- Filter high-volume, low-value events at the source
- Use buffered outputs for high-throughput environments
- Consider sampling for extremely noisy workloads
- Monitor CPU usage and adjust rules if needed

---

Runtime security with Falco provides visibility into what is actually happening inside your containers and hosts. Unlike image scanning which only catches known vulnerabilities at build time, Falco detects suspicious behavior in real-time. Start with the default rules, integrate with your alerting stack via Falcosidekick, and iteratively tune to reduce noise while maintaining security coverage.

For comprehensive observability that includes runtime security alerts alongside metrics, logs, and traces, explore [OneUptime](https://oneuptime.com) - the open-source platform for complete infrastructure monitoring.
