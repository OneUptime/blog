# How to Set Up Runtime Security Monitoring on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Runtime Security, Falco, Kubernetes, Threat Detection

Description: Learn how to deploy and configure runtime security monitoring on Talos Linux using Falco and Tetragon for real-time threat detection in your Kubernetes cluster.

---

Static security controls like pod security contexts and network policies are important, but they only define what should happen. Runtime security monitoring watches what actually happens inside your containers and alerts you when something unexpected occurs. On Talos Linux, where the operating system is already locked down, runtime monitoring catches threats that make it past your preventive controls - a compromised dependency, a supply chain attack, or an insider threat.

This guide covers deploying runtime security monitoring on Talos Linux using Falco and Tetragon, two of the most popular tools in this space.

## What Runtime Security Monitoring Catches

Runtime security monitoring observes system calls, network connections, file access patterns, and process execution in real time. It can detect activities like:

- A container spawning a shell process (potential attacker interaction)
- Reading sensitive files like /etc/shadow or service account tokens
- Unexpected outbound network connections (data exfiltration or command-and-control)
- Privilege escalation attempts
- Binary modifications inside running containers
- Cryptocurrency mining processes

These are behaviors that cannot be prevented by admission controllers alone because they happen inside legitimate, already-running containers.

## Deploying Falco on Talos Linux

Falco is the de facto standard for Kubernetes runtime security. It uses eBPF probes to monitor system calls without requiring kernel modules.

### Installing Falco with Helm

```bash
# Add the Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts

# Update the chart cache
helm repo update

# Install Falco with eBPF driver (required for Talos Linux)
helm install falco \
  falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set driver.kind=ebpf \
  --set tty=true \
  --set falcosidekick.enabled=true \
  --set falcosidekick.webui.enabled=true
```

On Talos Linux, you must use the eBPF driver because the kernel module driver requires a writeable filesystem and build tools, neither of which are available on Talos.

```bash
# Verify Falco is running
kubectl get pods -n falco

# Check Falco logs to confirm it is detecting events
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=50

# Verify the eBPF probe is loaded
kubectl logs -n falco -l app.kubernetes.io/name=falco | grep "eBPF"
```

### Falco Configuration

Customize Falco's behavior through the Helm values.

```yaml
# falco-values.yaml
falco:
  # Output format for alerts
  jsonOutput: true
  jsonIncludeOutputProperty: true

  # Log level
  logLevel: info

  # Time format
  timeFormatISO8601: true

  # Rule priorities to alert on
  priority: warning

  # gRPC output for integration with Falcosidekick
  grpc:
    enabled: true
  grpcOutput:
    enabled: true

# Falcosidekick for forwarding alerts
falcosidekick:
  enabled: true
  config:
    # Send alerts to Slack
    slack:
      webhookurl: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
      minimumpriority: "warning"

    # Send alerts to a webhook
    webhook:
      address: "https://your-siem.example.com/falco"
      minimumpriority: "notice"

  # Enable the web UI for viewing alerts
  webui:
    enabled: true
    service:
      type: ClusterIP
```

```bash
# Upgrade Falco with custom values
helm upgrade falco \
  falcosecurity/falco \
  --namespace falco \
  -f falco-values.yaml
```

### Custom Falco Rules

Write custom rules that match your environment and threat model.

```yaml
# custom-rules-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-custom-rules
  namespace: falco
data:
  custom-rules.yaml: |
    - rule: Shell Spawned in Container
      desc: Detect shell execution inside a container
      condition: >
        spawned_process and
        container and
        proc.name in (bash, sh, zsh, dash, ash) and
        not proc.pname in (crond, sshd)
      output: >
        Shell spawned in container
        (user=%user.name container=%container.name
        image=%container.image.repository
        shell=%proc.name parent=%proc.pname
        cmdline=%proc.cmdline)
      priority: WARNING
      tags: [container, shell, mitre_execution]

    - rule: Sensitive File Read in Container
      desc: Detect reading of sensitive files
      condition: >
        open_read and
        container and
        fd.name in (/etc/shadow, /etc/gshadow) and
        not proc.name in (groupadd, useradd)
      output: >
        Sensitive file read in container
        (user=%user.name file=%fd.name
        container=%container.name
        image=%container.image.repository)
      priority: WARNING
      tags: [container, filesystem, mitre_credential_access]

    - rule: Outbound Connection to Suspicious Port
      desc: Detect outbound connections to common C2 ports
      condition: >
        outbound and
        container and
        fd.sport in (4444, 5555, 6666, 8888, 1337)
      output: >
        Suspicious outbound connection from container
        (user=%user.name container=%container.name
        connection=%fd.name port=%fd.sport
        image=%container.image.repository)
      priority: CRITICAL
      tags: [container, network, mitre_command_and_control]

    - rule: Crypto Mining Process Detected
      desc: Detect known crypto mining binaries
      condition: >
        spawned_process and
        container and
        proc.name in (xmrig, minerd, minergate, cpuminer, ethminer)
      output: >
        Crypto mining process detected
        (user=%user.name container=%container.name
        process=%proc.name
        image=%container.image.repository)
      priority: CRITICAL
      tags: [container, crypto, mitre_execution]
```

## Deploying Tetragon for Advanced Monitoring

Tetragon by Cilium provides deeper eBPF-based security observability with the ability to enforce policies at the kernel level.

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/

# Install Tetragon
helm install tetragon \
  cilium/tetragon \
  --namespace kube-system \
  --set tetragon.enableProcessCred=true \
  --set tetragon.enableProcessNs=true
```

```bash
# Verify Tetragon is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=tetragon

# Use the tetra CLI to view events
kubectl exec -n kube-system -l app.kubernetes.io/name=tetragon -c tetragon -- \
  tetra getevents -o compact
```

### Tetragon Tracing Policies

Create tracing policies to monitor specific behaviors.

```yaml
# tracing-policy-file-access.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: file-access-monitoring
spec:
  kprobes:
    - call: "fd_install"
      syscall: false
      args:
        - index: 0
          type: int
        - index: 1
          type: "file"
      selectors:
        - matchArgs:
            - index: 1
              operator: "Prefix"
              values:
                - "/etc/shadow"
                - "/etc/passwd"
                - "/var/run/secrets/kubernetes.io"
```

```yaml
# tracing-policy-network.yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: network-monitoring
spec:
  kprobes:
    - call: "tcp_connect"
      syscall: false
      args:
        - index: 0
          type: "sock"
```

```bash
# Apply the tracing policies
kubectl apply -f tracing-policy-file-access.yaml
kubectl apply -f tracing-policy-network.yaml

# View events matching the policies
kubectl logs -n kube-system -l app.kubernetes.io/name=tetragon -c export-stdout | \
  jq 'select(.process_kprobe != null)'
```

## Alerting and Integration

Connect your runtime security tools to your monitoring and alerting stack.

```yaml
# Falcosidekick output to Prometheus
falcosidekick:
  config:
    prometheus:
      extralabels: "source:falco"

# Create alert rules based on Falco metrics
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: falco-alerts
  namespace: falco
spec:
  groups:
    - name: falco.rules
      rules:
        - alert: FalcoCriticalAlert
          expr: rate(falco_events{priority="Critical"}[5m]) > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Falco critical event detected"
```

## Testing Your Setup

Trigger some test events to verify monitoring is working.

```bash
# Trigger a shell execution alert
kubectl run test-shell --image=busybox --rm -it --restart=Never -- sh -c "echo test"

# Trigger a sensitive file read alert
kubectl run test-read --image=busybox --rm -it --restart=Never -- cat /etc/shadow

# Check Falco logs for the alerts
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=20
```

## Wrapping Up

Runtime security monitoring on Talos Linux gives you visibility into what your containers are actually doing, not just what they are allowed to do. Falco and Tetragon use eBPF to watch system calls in real time with minimal performance overhead. By deploying both preventive controls (security contexts, network policies) and detective controls (runtime monitoring), you create a security posture where threats are both harder to execute and quickly detected when they do occur. Start with the default Falco rules, add custom rules for your specific threat model, and integrate alerts with your team's incident response workflow.
