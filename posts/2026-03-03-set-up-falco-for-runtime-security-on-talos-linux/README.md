# How to Set Up Falco for Runtime Security on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Falco, Runtime Security, Kubernetes, Security, Monitoring

Description: Step-by-step guide to deploying and configuring Falco for runtime security monitoring on Talos Linux Kubernetes clusters.

---

Runtime security is about detecting suspicious behavior as it happens. While image scanning catches known vulnerabilities before deployment, runtime security tools watch for actual malicious activity inside running containers. Falco, originally created by Sysdig and now a CNCF graduated project, is the leading open-source tool for this purpose.

Running Falco on Talos Linux presents some unique considerations. Since Talos is an immutable operating system without a traditional package manager or shell, you cannot install kernel modules the usual way. Instead, you need to use the eBPF probe or the modern libs driver approach. This guide covers the complete setup from installation through custom rule creation.

## Why Falco on Talos Linux

Talos Linux already provides a strong security baseline with its immutable filesystem and minimal attack surface. Adding Falco on top gives you visibility into what is happening inside your containers at runtime. Falco can detect:

- Shell spawned inside a container
- Unexpected network connections
- File access in sensitive directories
- Privilege escalation attempts
- Cryptomining activity
- Container escape attempts

Together, Talos and Falco create a defense-in-depth strategy where the OS prevents many attacks and Falco catches the ones that get through.

## Choosing the Right Driver

Falco uses a system call capture driver to monitor kernel events. There are three options:

1. **Kernel module** - Not practical on Talos since you cannot install kernel modules
2. **eBPF probe** - Works on Talos, requires BPF support in the kernel
3. **Modern eBPF** - The newest option, built into Falco, no external dependencies

For Talos Linux, the modern eBPF driver is the best choice. It does not require any external components and works with the Talos kernel configuration.

## Installing Falco with Helm

The recommended way to deploy Falco on Kubernetes is using the official Helm chart:

```bash
# Add the Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

# Install Falco with the modern eBPF driver
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set driver.kind=modern_ebpf \
  --set tty=true \
  --set falcosidekick.enabled=true \
  --set falcosidekick.webui.enabled=true
```

The key setting here is `driver.kind=modern_ebpf`, which tells Falco to use the built-in eBPF driver that works without kernel headers or external modules.

## Custom Helm Values for Talos

For a more complete installation, create a values file:

```yaml
# falco-values.yaml
# Falco Helm chart values optimized for Talos Linux
driver:
  kind: modern_ebpf

# Resource limits for Falco pods
resources:
  requests:
    cpu: 100m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1024Mi

# Talos-specific volume mounts
extra:
  volumes:
    - name: etc-os-release
      hostPath:
        path: /etc/os-release
  mounts:
    - mountPath: /host/etc/os-release
      name: etc-os-release
      readOnly: true

# Enable output to stdout for log collection
stdout_output:
  enabled: true

# Enable gRPC output for Falcosidekick
grpc:
  enabled: true
  bind_address: "unix:///run/falco/falco.sock"
  threadiness: 8

grpc_output:
  enabled: true

# Falcosidekick for forwarding alerts
falcosidekick:
  enabled: true
  config:
    slack:
      webhookurl: ""  # Add your Slack webhook URL
      minimumpriority: "warning"
    elasticsearch:
      hostport: "http://elasticsearch.monitoring.svc.cluster.local:9200"
      index: "falco"
      minimumpriority: "notice"
  webui:
    enabled: true
    service:
      type: ClusterIP
```

Install with the values file:

```bash
# Install Falco with custom values for Talos
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  -f falco-values.yaml
```

## Verifying the Installation

After deployment, check that Falco pods are running and the driver is loaded:

```bash
# Check Falco pods status
kubectl get pods -n falco

# View Falco logs to confirm driver loading
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=50

# You should see something like:
# "Successfully loaded the modern eBPF probe"
# "Starting Falco..."
```

Test that Falco is detecting events by spawning a shell in a container:

```bash
# Create a test pod
kubectl run test-pod --image=alpine --rm -it -- /bin/sh

# Falco should log an alert like:
# "Notice: A shell was spawned in a container"
```

Check the Falco logs for the detection:

```bash
# Look for the shell spawn detection
kubectl logs -n falco -l app.kubernetes.io/name=falco | grep "shell"
```

## Writing Custom Falco Rules

Falco rules use a YAML-based syntax. You can add custom rules to detect behavior specific to your environment.

```yaml
# custom-rules.yaml
# Custom Falco rules for Talos Linux clusters
customRules:
  custom-rules.yaml: |-
    # Detect attempts to access Talos API certificates
    - rule: Access to Talos Certificates
      desc: Detect any attempt to read Talos-related certificate files
      condition: >
        open_read and
        container and
        (fd.name startswith /var/lib/talos or
         fd.name startswith /etc/kubernetes/pki)
      output: >
        Sensitive Talos certificate accessed
        (user=%user.name command=%proc.cmdline
        file=%fd.name container=%container.name
        image=%container.image.repository)
      priority: WARNING
      tags: [security, talos, certificates]

    # Detect cryptocurrency mining
    - rule: Detect Crypto Mining
      desc: Detect cryptocurrency mining processes
      condition: >
        spawned_process and container and
        (proc.name in (xmrig, minerd, cpuminer, ethminer) or
         proc.cmdline contains "stratum+tcp" or
         proc.cmdline contains "stratum+ssl")
      output: >
        Crypto mining detected
        (user=%user.name command=%proc.cmdline
        container=%container.name image=%container.image.repository)
      priority: CRITICAL
      tags: [security, cryptomining]

    # Detect unexpected outbound connections
    - rule: Unexpected Outbound Connection from Database Pod
      desc: Database pods should not make outbound connections to the internet
      condition: >
        outbound and container and
        k8s.pod.label.app = "database" and
        not fd.sip in (rfc_1918_addresses)
      output: >
        Database pod made unexpected outbound connection
        (pod=%k8s.pod.name connection=%fd.name
        destination=%fd.sip:%fd.sport)
      priority: ERROR
      tags: [security, network, database]
```

Add custom rules during installation:

```bash
# Install Falco with custom rules
helm upgrade falco falcosecurity/falco \
  --namespace falco \
  -f falco-values.yaml \
  -f custom-rules.yaml
```

## Integrating Falco with Alerting

Falcosidekick can forward alerts to many different destinations. Here are some common configurations:

```yaml
# falcosidekick-config.yaml
# Alert routing configuration
falcosidekick:
  config:
    # Send critical alerts to PagerDuty
    pagerduty:
      routingkey: "your-pagerduty-routing-key"
      minimumpriority: "critical"

    # Send all alerts to a webhook
    webhook:
      address: "https://your-webhook-endpoint.com/falco"
      minimumpriority: "warning"

    # Store alerts in Prometheus for dashboarding
    prometheus:
      extralabels: "cluster:production,environment:prod"
```

## Setting Up Alert Response

You can pair Falco with the Falco Talon response engine to take automatic action when threats are detected:

```yaml
# talon-rules.yaml
# Automated response rules
- action: Terminate Pod
  description: Kill pods that spawn shells
  match:
    rules:
      - Terminal shell in container
    priority: WARNING
  parameters:
    grace_period_seconds: 0

- action: Label Pod
  description: Label suspicious pods for investigation
  match:
    rules:
      - Unexpected Outbound Connection
    priority: NOTICE
  parameters:
    labels:
      security.falco.org/suspicious: "true"
```

## Performance Tuning

Falco can generate significant overhead if not tuned properly. Here are some tips for Talos clusters:

```yaml
# Performance-tuned Falco settings
falco:
  # Use adaptive syscall buffer
  syscall_buf_size_preset: 4
  # Drop events rather than block under load
  syscall_drop_failed_exit: true
  # Limit output rate
  outputs:
    rate: 100
    max_burst: 1000
  # Skip rules for trusted namespaces
  rules:
    - rule: any
      condition: k8s.ns.name in (kube-system, falco, monitoring)
      enabled: false
      override:
        condition: append
```

## Summary

Falco adds an essential runtime security layer to Talos Linux clusters. Using the modern eBPF driver avoids the kernel module issues that would otherwise make deployment difficult on an immutable OS. Combined with Falcosidekick for alert routing and custom rules tailored to your workloads, Falco provides real-time detection of security threats that static analysis simply cannot catch. The combination of Talos Linux's locked-down OS with Falco's runtime monitoring gives you a strong, layered security posture for production Kubernetes environments.
