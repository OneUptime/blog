# How to Write Custom Falco Rules for Runtime Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Falco, Security, Kubernetes, Runtime Security, Cloud Native

Description: Learn how to write custom Falco rules for Kubernetes runtime security, including rule syntax, macros, lists, and detection patterns.

---

> Runtime security detects threats that slip past your admission controllers and vulnerability scanners. Falco watches syscalls and Kubernetes audit logs in real-time, alerting you when something suspicious happens.

## Understanding Falco Rules

Falco rules define what events to detect and how to alert on them. Each rule has a condition (what to match), an output (what to log), and a priority (how severe).

```yaml
# Basic rule structure
- rule: Detect Shell in Container
  desc: Alert when a shell is spawned inside a container
  condition: >
    spawned_process and
    container and
    shell_procs
  output: >
    Shell spawned in container
    (user=%user.name container=%container.name shell=%proc.name)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

## Rule Syntax and Fields

### Core Rule Components

Every rule needs these fields:

```yaml
- rule: Rule Name           # Unique identifier
  desc: Description         # Human-readable explanation
  condition: <expression>   # Boolean expression to match
  output: <format string>   # Alert message with field interpolation
  priority: <level>         # DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY
  enabled: true             # Optional - toggle rule on/off
  tags: [tag1, tag2]        # Optional - categorization
```

### Common Fields for Conditions

```yaml
# Process fields
proc.name          # Process name (e.g., bash)
proc.cmdline       # Full command line
proc.pname         # Parent process name
proc.exepath       # Executable path
proc.args          # Process arguments

# User fields
user.name          # Username
user.uid           # User ID
user.loginuid      # Login UID

# Container fields
container.id       # Container ID
container.name     # Container name
container.image    # Image name with tag
container.image.repository  # Image repository only

# File fields
fd.name            # File descriptor name (path)
fd.directory       # Directory of fd
fd.filename        # Filename only

# Network fields
fd.sip             # Source IP
fd.sport           # Source port
fd.dip             # Destination IP
fd.dport           # Destination port
```

## Using Macros for Reusability

Macros let you define reusable condition snippets. They make rules cleaner and easier to maintain.

```yaml
# Define macros for common patterns
- macro: container
  condition: container.id != host

- macro: spawned_process
  condition: evt.type = execve and evt.dir = <

- macro: shell_procs
  condition: proc.name in (bash, sh, zsh, ksh, csh, dash, ash)

- macro: sensitive_files
  condition: >
    fd.name startswith /etc/shadow or
    fd.name startswith /etc/passwd or
    fd.name startswith /etc/sudoers

- macro: package_mgmt_procs
  condition: proc.name in (apt, apt-get, yum, dnf, rpm, dpkg, pip, npm)

# Use macros in rules
- rule: Package Management in Container
  desc: Detect package manager execution in containers
  condition: >
    spawned_process and
    container and
    package_mgmt_procs
  output: >
    Package management detected
    (user=%user.name container=%container.name cmd=%proc.cmdline)
  priority: NOTICE
```

### Macro Inheritance

Macros can build on other macros:

```yaml
- macro: allowed_processes
  condition: proc.name in (nginx, node, python)

- macro: suspicious_process
  condition: >
    spawned_process and
    container and
    not allowed_processes
```

## Lists for Grouping Values

Lists are arrays of values that macros and rules can reference. They make whitelisting and blacklisting manageable.

```yaml
# Define lists
- list: shell_binaries
  items: [bash, sh, zsh, ksh, csh, tcsh, dash, ash]

- list: sensitive_mount_paths
  items: [/proc, /sys, /etc/shadow, /etc/passwd, /root/.ssh]

- list: trusted_images
  items: [gcr.io/myproject/, docker.io/mycompany/]

- list: network_tools
  items: [nc, ncat, netcat, nmap, tcpdump, wireshark, tshark]

# Use lists in macros
- macro: shell_procs
  condition: proc.name in (shell_binaries)

- macro: network_recon_tools
  condition: proc.name in (network_tools)

# Append to existing lists
- list: shell_binaries
  items: [pwsh, fish]
  append: true
```

## Common Syscall Events

Falco monitors syscalls. Here are the most useful ones:

```yaml
# Process execution
evt.type = execve           # New process started

# File operations
evt.type in (open, openat)  # File opened
evt.type in (read, write)   # File read/written
evt.type = unlink           # File deleted
evt.type = rename           # File renamed
evt.type = chmod            # Permissions changed

# Network operations
evt.type in (connect, accept)  # Network connections
evt.type in (sendto, recvfrom) # UDP operations
evt.type = listen              # Port listening

# System operations
evt.type = ptrace           # Process tracing (debugging)
evt.type = setuid           # UID change
evt.type = clone            # Process forking
```

### Practical Syscall Rules

```yaml
# Detect crypto mining
- rule: Detect Crypto Miner
  desc: Detect crypto mining processes by command patterns
  condition: >
    spawned_process and
    container and
    (proc.cmdline contains "stratum+tcp" or
     proc.cmdline contains "xmrig" or
     proc.name in (xmrig, minerd, cpuminer))
  output: >
    Crypto miner detected
    (container=%container.name image=%container.image cmd=%proc.cmdline)
  priority: CRITICAL
  tags: [cryptomining, mitre_resource_hijacking]

# Detect reverse shell
- rule: Reverse Shell Detected
  desc: Detect reverse shell connections
  condition: >
    spawned_process and
    container and
    ((proc.cmdline contains "/dev/tcp" and proc.cmdline contains "bash") or
     (proc.name = nc and proc.cmdline contains "-e") or
     (proc.name = socat and proc.cmdline contains "exec"))
  output: >
    Reverse shell detected
    (user=%user.name container=%container.name cmd=%proc.cmdline)
  priority: CRITICAL
  tags: [network, mitre_command_and_control]
```

## Container-Specific Rules

### Detect Container Escape Attempts

```yaml
# Detect privilege escalation via nsenter
- rule: Container Escape via nsenter
  desc: Detect attempts to escape container via nsenter
  condition: >
    spawned_process and
    container and
    proc.name = nsenter
  output: >
    nsenter execution detected
    (user=%user.name container=%container.name cmd=%proc.cmdline)
  priority: CRITICAL
  tags: [container, escape, mitre_privilege_escalation]

# Detect mount of sensitive host paths
- rule: Sensitive Host Path Mounted
  desc: Detect containers with sensitive host paths mounted
  condition: >
    spawned_process and
    container and
    (container.mounts contains "/var/run/docker.sock" or
     container.mounts contains "/etc/kubernetes")
  output: >
    Container with sensitive mount
    (container=%container.name mounts=%container.mounts)
  priority: WARNING
  tags: [container, configuration]

# Detect privileged container processes
- rule: Process in Privileged Container
  desc: Alert on new processes in privileged containers
  condition: >
    spawned_process and
    container and
    container.privileged = true
  output: >
    Process started in privileged container
    (user=%user.name container=%container.name image=%container.image proc=%proc.name)
  priority: WARNING
  tags: [container, privileged]
```

### Image and Namespace Rules

```yaml
# Untrusted image running
- rule: Untrusted Image Running
  desc: Detect containers running from untrusted registries
  condition: >
    spawned_process and
    container and
    not (container.image.repository startswith "gcr.io/myproject/" or
         container.image.repository startswith "docker.io/library/")
  output: >
    Untrusted image running
    (container=%container.name image=%container.image)
  priority: WARNING
  tags: [container, supply_chain]

# Process in kube-system namespace
- rule: Unexpected Process in kube-system
  desc: Detect unexpected processes in kube-system namespace
  condition: >
    spawned_process and
    container and
    k8s.ns.name = kube-system and
    not proc.name in (kube-proxy, coredns, etcd, kube-apiserver)
  output: >
    Unexpected process in kube-system
    (pod=%k8s.pod.name proc=%proc.name cmd=%proc.cmdline)
  priority: WARNING
  tags: [kubernetes, kube-system]
```

## Kubernetes Audit Rules

Falco can also process Kubernetes audit logs for API-level detection.

```yaml
# Enable audit log source in falco.yaml first
# Then create audit rules:

# Detect exec into pod
- rule: Exec into Pod
  desc: Detect kubectl exec into pods
  condition: >
    kevt and
    kevt_started and
    ka.target.resource = pods and
    ka.target.subresource = exec
  output: >
    Exec into pod
    (user=%ka.user.name pod=%ka.target.name namespace=%ka.target.namespace)
  priority: NOTICE
  source: k8s_audit
  tags: [kubernetes, exec]

# Detect secret access
- rule: Secret Accessed
  desc: Detect when secrets are accessed
  condition: >
    kevt and
    ka.target.resource = secrets and
    ka.verb in (get, list)
  output: >
    Secret accessed
    (user=%ka.user.name secret=%ka.target.name namespace=%ka.target.namespace)
  priority: NOTICE
  source: k8s_audit
  tags: [kubernetes, secrets]

# Detect cluster role bindings
- rule: ClusterRoleBinding Created
  desc: Detect creation of ClusterRoleBindings
  condition: >
    kevt and
    ka.target.resource = clusterrolebindings and
    ka.verb = create
  output: >
    ClusterRoleBinding created
    (user=%ka.user.name binding=%ka.target.name)
  priority: WARNING
  source: k8s_audit
  tags: [kubernetes, rbac]

# Detect service account token mounting
- rule: Pod Created with Service Account Token
  desc: Detect pods mounting service account tokens
  condition: >
    kevt and
    ka.target.resource = pods and
    ka.verb = create and
    not ka.req.pod.spec.automountServiceAccountToken = false
  output: >
    Pod created with SA token mounted
    (user=%ka.user.name pod=%ka.target.name namespace=%ka.target.namespace)
  priority: INFO
  source: k8s_audit
  tags: [kubernetes, serviceaccount]
```

## Testing Rules Locally

### Using falco with File Input

```bash
# Record syscalls to a capture file
sudo falco -w events.scap -M 60  # Capture for 60 seconds

# Test rules against the capture
falco -r my_rules.yaml -e events.scap

# Test a specific rule
falco -r my_rules.yaml -e events.scap --filter "rule='My Rule Name'"
```

### Using falco-driver-loader for Live Testing

```bash
# Load Falco driver
falco-driver-loader

# Run Falco with custom rules
sudo falco -r /etc/falco/falco_rules.yaml -r /etc/falco/my_custom_rules.yaml

# Dry run to validate syntax
falco -r my_rules.yaml --validate
```

### Docker-Based Testing

```bash
# Run Falco in a container for testing
docker run --rm -i -t \
  --privileged \
  -v /var/run/docker.sock:/host/var/run/docker.sock \
  -v /proc:/host/proc:ro \
  -v $(pwd)/my_rules.yaml:/etc/falco/rules.d/my_rules.yaml:ro \
  falcosecurity/falco:latest

# Trigger a test event in another terminal
docker run --rm alpine sh -c "cat /etc/shadow"
```

### Unit Testing with falco-event-generator

```bash
# Install event generator
helm install event-generator falcosecurity/event-generator \
  --namespace falco-test \
  --create-namespace

# Or run directly
docker run --rm -it falcosecurity/event-generator run syscall

# Test specific actions
docker run --rm -it falcosecurity/event-generator run \
  syscall.ReadSensitiveFile \
  syscall.WriteBelowEtc \
  syscall.SpawnShell
```

## Rule Priorities and Outputs

### Priority Levels

```yaml
# Priority levels from lowest to highest:
# DEBUG    - Detailed info for debugging
# INFO     - Informational events
# NOTICE   - Normal but significant events
# WARNING  - Warning conditions
# ERROR    - Error conditions
# CRITICAL - Critical conditions
# ALERT    - Action must be taken immediately
# EMERGENCY - System is unusable

- rule: Debug Process Start
  priority: DEBUG  # Low priority, high volume

- rule: Shell in Container
  priority: WARNING  # Medium priority

- rule: Container Escape Attempt
  priority: CRITICAL  # High priority, needs immediate attention
```

### Custom Output Formats

```yaml
# Rich output with multiple fields
- rule: File Access in Container
  condition: >
    (evt.type = open or evt.type = openat) and
    container and
    sensitive_files
  output: >
    Sensitive file accessed
    (user=%user.name uid=%user.uid
    container_id=%container.id container_name=%container.name
    image=%container.image.repository:%container.image.tag
    file=%fd.name
    command=%proc.cmdline
    parent=%proc.pname
    gparent=%proc.aname[2])
  priority: WARNING

# JSON output format in falco.yaml
# json_output: true
# json_include_output_property: true
```

### Output Channels

Configure in `/etc/falco/falco.yaml`:

```yaml
# Standard output
stdout_output:
  enabled: true

# File output
file_output:
  enabled: true
  keep_alive: false
  filename: /var/log/falco/events.log

# Webhook output for alerting
http_output:
  enabled: true
  url: https://alerts.example.com/falco

# gRPC output for sidekick
grpc:
  enabled: true
  bind_address: "0.0.0.0:5060"
  threadiness: 8

grpc_output:
  enabled: true
```

## Deployment and Management

### Helm Deployment with Custom Rules

```yaml
# values.yaml for Helm chart
falco:
  rules_file:
    - /etc/falco/falco_rules.yaml
    - /etc/falco/falco_rules.local.yaml
    - /etc/falco/rules.d

  json_output: true

  priority: debug

customRules:
  custom-rules.yaml: |-
    - macro: my_container
      condition: container.image.repository startswith "myregistry.io/"

    - rule: Shell in My Containers
      desc: Detect shell in company containers
      condition: spawned_process and my_container and shell_procs
      output: Shell in container (container=%container.name cmd=%proc.cmdline)
      priority: WARNING
```

```bash
# Deploy with custom rules
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  -f values.yaml
```

### ConfigMap for Rule Updates

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-custom-rules
  namespace: falco
data:
  custom_rules.yaml: |
    - list: allowed_images
      items: [gcr.io/myproject/, docker.io/mycompany/]

    - macro: trusted_image
      condition: container.image.repository in (allowed_images)

    - rule: Untrusted Container Running
      desc: Alert on containers from untrusted registries
      condition: spawned_process and container and not trusted_image
      output: Untrusted container (image=%container.image)
      priority: WARNING
```

### Falco Sidekick for Alert Routing

```yaml
# Deploy sidekick for flexible alerting
helm install falco-sidekick falcosecurity/falco-sidekick \
  --namespace falco \
  --set config.slack.webhookurl="https://hooks.slack.com/..." \
  --set config.pagerduty.apikey="your-api-key"
```

## Best Practices Summary

1. **Start with default rules** - Falco ships with comprehensive rules. Customize rather than rewrite.

2. **Use macros liberally** - DRY principle applies. Common patterns should be macros.

3. **Maintain allow lists** - Use lists for trusted images, processes, and paths. Easier to update than conditions.

4. **Test before deploying** - Use capture files and event-generator to validate rules work as expected.

5. **Set appropriate priorities** - Reserve CRITICAL and ALERT for events that need immediate human attention.

6. **Include context in outputs** - Container name, image, user, and command line are essential for investigation.

7. **Use tags for categorization** - MITRE ATT&CK tags help correlate events with threat frameworks.

8. **Version control rules** - Store custom rules in Git. Use Helm values or ConfigMaps for deployment.

9. **Monitor Falco itself** - Track dropped events and rule processing latency. Tune if needed.

10. **Iterate based on noise** - False positives kill alert fatigue. Tune conditions and add exceptions.

---

Runtime security with Falco catches threats that static scanning misses. Custom rules let you detect behaviors specific to your environment - from unauthorized shell access to crypto miners to container escapes. Start with the default rules, add your own detections, and integrate alerts into your incident response workflow.

**[OneUptime](https://oneuptime.com)** integrates with Falco through webhooks and log ingestion, giving you a unified view of runtime security events alongside your application metrics and alerts.
