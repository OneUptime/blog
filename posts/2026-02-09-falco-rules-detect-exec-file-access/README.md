# How to Write Falco Rules to Detect Suspicious Exec and File Access in Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Falco

Description: Learn how to create specific Falco rules that detect suspicious command execution and file access patterns in Kubernetes pods to identify potential security breaches.

---

Attackers who compromise containers often execute commands and access files to escalate privileges, exfiltrate data, or establish persistence. Detecting these activities requires monitoring process execution and file access patterns. Falco rules that focus on exec operations and file access provide early warning of container compromises.

## Detecting Process Execution

Monitor process spawning with precision:

```yaml
- rule: Unexpected Binary Execution
  desc: Detect execution of binaries not typically found in application containers
  condition: >
    spawned_process and
    container and
    not container.image.repository in (jenkins, gitlab-runner, build-tools) and
    proc.name in (nc, ncat, socat, nmap, tcpdump, strace, gdb)
  output: >
    Suspicious binary executed
    (user=%user.name command=%proc.cmdline container=%container.name image=%container.image.repository)
  priority: WARNING
  tags: [process, suspicious]

- rule: Shell Execution Pattern
  desc: Detect shell execution with suspicious arguments
  condition: >
    spawned_process and
    container and
    (proc.name in (bash, sh, dash) and
    (proc.cmdline contains "wget" or
    proc.cmdline contains "curl http" or
    proc.cmdline contains "base64 -d" or
    proc.cmdline contains "python -c" or
    proc.cmdline contains "perl -e"))
  output: >
    Suspicious shell command executed
    (user=%user.name command=%proc.cmdline container=%container.name pod=%k8s.pod.name)
  priority: WARNING
  tags: [shell, execution]
```

These rules catch common post-exploitation activities like downloading additional tools or executing encoded payloads.

## Monitoring kubectl exec Usage

Track when operators execute commands in containers:

```yaml
- rule: Terminal Shell in Container
  desc: Detect interactive shell sessions in containers
  condition: >
    spawned_process and
    container and
    proc.name in (bash, sh, zsh) and
    proc.tty != 0 and
    not k8s.pod.name startswith "debug-"
  output: >
    Interactive shell session started
    (user=%user.name shell=%proc.name tty=%proc.tty container=%container.name pod=%k8s.pod.name namespace=%k8s.ns.name)
  priority: NOTICE
  tags: [terminal, access]

- rule: Exec in Production Namespace
  desc: Alert on any exec in production namespaces
  condition: >
    spawned_process and
    container and
    k8s.ns.name in (production, prod, critical) and
    proc.pname in (bash, sh, zsh) and
    not k8s.pod.name startswith "maintenance-"
  output: >
    Command executed in production namespace
    (user=%user.name command=%proc.cmdline pod=%k8s.pod.name namespace=%k8s.ns.name)
  priority: WARNING
  tags: [production, exec]
```

## File Access Detection

Monitor sensitive file access:

```yaml
- rule: Read Sensitive Files
  desc: Detect reading of sensitive credential files
  condition: >
    open_read and
    container and
    fd.name in (
      /etc/shadow,
      /etc/sudoers,
      /etc/pam.d/common-password,
      /etc/pam.d/common-auth,
      /root/.ssh/id_rsa,
      /root/.ssh/id_dsa,
      /root/.ssh/id_ecdsa,
      /root/.ssh/id_ed25519,
      /root/.bash_history,
      /home/*/.bash_history,
      /home/*/.ssh/id_rsa
    )
  output: >
    Sensitive file read detected
    (user=%user.name file=%fd.name process=%proc.name container=%container.name pod=%k8s.pod.name)
  priority: CRITICAL
  tags: [filesystem, credentials]

- rule: Write to Binary Directories
  desc: Detect writes to system binary directories
  condition: >
    open_write and
    container and
    (fd.name startswith /bin/ or
    fd.name startswith /sbin/ or
    fd.name startswith /usr/bin/ or
    fd.name startswith /usr/sbin/ or
    fd.name startswith /usr/local/bin/)
  output: >
    Write to binary directory detected
    (user=%user.name file=%fd.name process=%proc.name container=%container.name)
  priority: ERROR
  tags: [filesystem, binaries]
```

## Kubernetes Secret Access

Detect unauthorized secret access:

```yaml
- rule: Service Account Token Access
  desc: Detect access to service account tokens
  condition: >
    open_read and
    container and
    fd.name glob /var/run/secrets/kubernetes.io/serviceaccount/token and
    not proc.name in (kubelet, kube-proxy, kube-apiserver) and
    not k8s.pod.name startswith "kube-"
  output: >
    Service account token accessed
    (user=%user.name process=%proc.name file=%fd.name pod=%k8s.pod.name namespace=%k8s.ns.name)
  priority: WARNING
  tags: [k8s, secrets, tokens]

- rule: Secret Volume Access
  desc: Detect access to mounted secret volumes
  condition: >
    open_read and
    container and
    fd.name glob /secrets/* and
    not proc.name in (app, service, worker)
  output: >
    Secret volume accessed by unexpected process
    (user=%user.name process=%proc.name file=%fd.name container=%container.name)
  priority: WARNING
  tags: [secrets, volume]
```

## Configuration File Modification

Monitor changes to application configuration:

```yaml
- rule: Container Config File Modified
  desc: Detect modification of container configuration files
  condition: >
    open_write and
    container and
    (fd.name glob /etc/*.conf or
    fd.name glob /etc/*.cfg or
    fd.name glob /etc/nginx/* or
    fd.name glob /etc/apache2/* or
    fd.name glob /etc/mysql/* or
    fd.name glob /app/config/*)
  output: >
    Configuration file modified
    (user=%user.name file=%fd.name process=%proc.name container=%container.name pod=%k8s.pod.name)
  priority: WARNING
  tags: [filesystem, config]

- rule: SSL Certificate Access
  desc: Detect access to SSL certificates and keys
  condition: >
    open_read and
    container and
    (fd.name glob *.pem or
    fd.name glob *.key or
    fd.name glob *.crt or
    fd.name glob /etc/ssl/*)
  output: >
    SSL certificate or key accessed
    (user=%user.name file=%fd.name process=%proc.name container=%container.name)
  priority: WARNING
  tags: [filesystem, ssl]
```

## Database-Specific Rules

Monitor database container activities:

```yaml
- rule: Database Container Shell
  desc: Detect shell execution in database containers
  condition: >
    spawned_process and
    container and
    container.image.repository in (postgres, mysql, mongodb, redis, cassandra) and
    proc.name in (bash, sh, zsh)
  output: >
    Shell executed in database container
    (user=%user.name shell=%proc.name container=%container.name pod=%k8s.pod.name)
  priority: WARNING
  tags: [database, shell]

- rule: Database Data Directory Access
  desc: Detect unauthorized access to database data directories
  condition: >
    open_read and
    container and
    container.image.repository in (postgres, mysql, mongodb) and
    (fd.name glob /var/lib/postgresql/data/* or
    fd.name glob /var/lib/mysql/* or
    fd.name glob /data/db/*) and
    not proc.name in (postgres, mysqld, mongod)
  output: >
    Unauthorized access to database data directory
    (user=%user.name file=%fd.name process=%proc.name container=%container.name)
  priority: ERROR
  tags: [database, filesystem]
```

## Network Tool Execution

Detect execution of network reconnaissance tools:

```yaml
- rule: Network Tool Execution
  desc: Detect execution of network scanning and reconnaissance tools
  condition: >
    spawned_process and
    container and
    proc.name in (nmap, masscan, nc, netcat, socat, tcpdump, wireshark, tshark)
  output: >
    Network tool executed in container
    (user=%user.name tool=%proc.name command=%proc.cmdline container=%container.name pod=%k8s.pod.name)
  priority: CRITICAL
  tags: [network, reconnaissance]

- rule: Port Scanning Activity
  desc: Detect port scanning patterns
  condition: >
    spawned_process and
    container and
    (proc.cmdline contains "nmap" or
    proc.cmdline contains "for i in" and proc.cmdline contains "telnet" or
    proc.cmdline contains "nc -z")
  output: >
    Port scanning activity detected
    (user=%user.name command=%proc.cmdline container=%container.name)
  priority: CRITICAL
  tags: [network, scanning]
```

## Privilege Escalation Detection

Monitor privilege escalation attempts:

```yaml
- rule: Setuid Binary Execution
  desc: Detect execution of setuid binaries
  condition: >
    spawned_process and
    container and
    proc.name in (sudo, su, newgrp, newrole, pkexec, doas)
  output: >
    Setuid binary executed
    (user=%user.name binary=%proc.name command=%proc.cmdline container=%container.name pod=%k8s.pod.name)
  priority: WARNING
  tags: [privilege_escalation]

- rule: Capability Modification
  desc: Detect attempts to modify process capabilities
  condition: >
    spawned_process and
    container and
    proc.name in (capsh, setcap, getcap)
  output: >
    Capability modification attempted
    (user=%user.name command=%proc.cmdline container=%container.name)
  priority: CRITICAL
  tags: [capabilities, privilege_escalation]
```

## Compiler and Development Tool Detection

Prevent in-container compilation:

```yaml
- rule: Compiler in Container
  desc: Detect compiler usage in containers
  condition: >
    spawned_process and
    container and
    proc.name in (gcc, g++, cc, clang, rustc, go) and
    not container.image.repository in (build, ci, dev)
  output: >
    Compiler executed in container
    (user=%user.name compiler=%proc.name container=%container.name image=%container.image.repository)
  priority: WARNING
  tags: [compiler, development]

- rule: Package Manager in Production
  desc: Detect package manager usage in production containers
  condition: >
    spawned_process and
    container and
    k8s.ns.name in (production, prod) and
    proc.name in (apt-get, yum, dnf, apk, pip, npm, gem)
  output: >
    Package manager executed in production
    (user=%user.name command=%proc.cmdline pod=%k8s.pod.name namespace=%k8s.ns.name)
  priority: WARNING
  tags: [package_manager, production]
```

## Combining Multiple Indicators

Create rules that combine multiple suspicious activities:

```yaml
- rule: Suspicious Activity Sequence
  desc: Detect sequence of suspicious activities indicating compromise
  condition: >
    (spawned_process and
    container and
    proc.name in (wget, curl) and
    proc.cmdline contains "http") or
    (open_write and
    container and
    fd.name startswith /tmp/ and
    fd.name contains ".sh") or
    (spawned_process and
    proc.name in (chmod) and
    proc.cmdline contains "+x")
  output: >
    Suspicious activity sequence detected
    (user=%user.name process=%proc.name command=%proc.cmdline file=%fd.name container=%container.name)
  priority: ERROR
  tags: [attack_sequence]
```

## Testing Exec and File Access Rules

Validate detection capabilities:

```bash
# Test shell execution detection
kubectl exec -it nginx-pod -- /bin/bash

# Test file access detection
kubectl exec -it nginx-pod -- cat /etc/shadow

# Test binary execution
kubectl exec -it nginx-pod -- wget http://example.com/test

# Test configuration modification
kubectl exec -it nginx-pod -- touch /etc/nginx/test.conf

# Check Falco alerts
kubectl logs -n falco daemonset/falco | grep -E "shell|file|exec"
```

## Performance Considerations

Optimize rules for performance:

```yaml
# Bad: Too broad, high overhead
- rule: All File Access
  condition: open and container

# Good: Specific, lower overhead
- rule: Sensitive File Access
  condition: >
    open_read and
    container and
    fd.name in (/etc/shadow, /etc/sudoers)
```

## Best Practices

Focus on high-signal rules that detect actual attacks rather than normal operations. Excessive alerts lead to alert fatigue.

Layer multiple detection mechanisms. Combine process execution, file access, and network activity rules for comprehensive coverage.

Test rules against legitimate application behavior before deploying to production. Understand what your applications do normally.

Use macros to define reusable conditions. This improves maintainability and consistency across rules.

Document why each rule exists and what attacks it detects. Include references to MITRE ATT&CK techniques when applicable.

## Conclusion

Falco rules targeting exec operations and file access provide critical visibility into container runtime behavior. By detecting suspicious command execution, unauthorized file access, and privilege escalation attempts, you can identify container compromises early. Build comprehensive rule sets that cover your attack surface while minimizing false positives through careful tuning and testing.
