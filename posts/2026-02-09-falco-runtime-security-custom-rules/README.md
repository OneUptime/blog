# How to Configure Runtime Security Monitoring with Falco Custom Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Monitoring

Description: Learn how to create custom Falco rules for runtime security monitoring to detect suspicious container behavior and security violations in real-time.

---

Falco provides runtime security monitoring by analyzing system calls and Kubernetes audit logs. While Falco ships with default rules detecting common threats, creating custom rules tailored to your applications and security policies allows you to catch organization-specific security violations. Custom rules detect unusual application behavior, policy violations, and potential security incidents before they cause damage.

## Understanding Falco Rule Structure

Falco rules consist of three main components:

A condition defines what triggers the rule using a filter expression. Conditions can check system calls, process names, file paths, network operations, and Kubernetes metadata.

An output template specifies what information to include in alerts. Outputs use format strings to extract relevant details from events.

A priority indicates alert severity (emergency, alert, critical, error, warning, notice, informational, debug).

Basic rule anatomy:

```yaml
- rule: Example Rule Name
  desc: Human-readable description of what this detects
  condition: system_call and suspicious_activity
  output: "Alert message with %user.name and %container.name"
  priority: WARNING
  tags: [security, containers]
```

## Installing Falco

Deploy Falco in your Kubernetes cluster:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: falco
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: falco
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      serviceAccountName: falco
      hostNetwork: true
      hostPID: true
      containers:
      - name: falco
        image: falcosecurity/falco:0.36.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: docker-socket
          mountPath: /var/run/docker.sock
        - name: dev
          mountPath: /host/dev
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: boot
          mountPath: /host/boot
          readOnly: true
        - name: lib-modules
          mountPath: /host/lib/modules
          readOnly: true
        - name: usr
          mountPath: /host/usr
          readOnly: true
        - name: etc
          mountPath: /host/etc
          readOnly: true
        - name: falco-config
          mountPath: /etc/falco
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: dev
        hostPath:
          path: /dev
      - name: proc
        hostPath:
          path: /proc
      - name: boot
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr
        hostPath:
          path: /usr
      - name: etc
        hostPath:
          path: /etc
      - name: falco-config
        configMap:
          name: falco-config
```

## Creating Custom Rules

Store custom rules in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-custom-rules
  namespace: falco
data:
  custom-rules.yaml: |
    - rule: Unauthorized Process in Container
      desc: Detect when unauthorized processes run in production containers
      condition: >
        spawned_process and
        container and
        container.image.repository in (nginx, postgres, redis) and
        not proc.name in (nginx, postgres, redis-server, redis-cli, sh, bash)
      output: >
        Unauthorized process started in container
        (user=%user.name command=%proc.cmdline container=%container.name image=%container.image.repository)
      priority: WARNING
      tags: [container, process]

    - rule: Write to System Directory
      desc: Detect writes to system directories from containers
      condition: >
        open_write and
        container and
        fd.name startswith /usr/ or fd.name startswith /bin/ or fd.name startswith /sbin/
      output: >
        Container wrote to system directory
        (user=%user.name file=%fd.name container=%container.name image=%container.image.repository)
      priority: ERROR
      tags: [container, filesystem]

    - rule: Sensitive File Read
      desc: Detect reads of sensitive files
      condition: >
        open_read and
        container and
        fd.name in (/etc/shadow, /etc/sudoers, /root/.ssh/id_rsa)
      output: >
        Sensitive file accessed
        (user=%user.name file=%fd.name process=%proc.name container=%container.name)
      priority: CRITICAL
      tags: [container, filesystem, credentials]

    - rule: Outbound Connection from Database
      desc: Detect outbound network connections from database containers
      condition: >
        outbound and
        container and
        container.image.repository in (postgres, mysql, mongodb) and
        fd.sip != "127.0.0.1" and
        fd.sip != "::1"
      output: >
        Outbound connection from database container
        (connection=%fd.name container=%container.name dest=%fd.rip:%fd.rport)
      priority: WARNING
      tags: [network, database]

    - rule: Privilege Escalation Attempt
      desc: Detect privilege escalation attempts via setuid programs
      condition: >
        spawned_process and
        container and
        proc.aname in (sudo, su, pkexec)
      output: >
        Privilege escalation attempt detected
        (user=%user.name parent=%proc.aname command=%proc.cmdline container=%container.name)
      priority: CRITICAL
      tags: [privilege_escalation]
```

Mount the custom rules:

```yaml
# Update the DaemonSet to include custom rules
volumeMounts:
- name: falco-custom-rules
  mountPath: /etc/falco/rules.d

volumes:
- name: falco-custom-rules
  configMap:
    name: falco-custom-rules
```

## Kubernetes-Specific Rules

Create rules that use Kubernetes metadata:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-k8s-rules
  namespace: falco
data:
  k8s-rules.yaml: |
    - rule: Container Running as Root in Production
      desc: Detect containers running as root in production namespaces
      condition: >
        container and
        k8s.ns.name in (production, critical) and
        user.uid = 0
      output: >
        Container running as root in production
        (namespace=%k8s.ns.name pod=%k8s.pod.name container=%container.name)
      priority: WARNING
      tags: [k8s, container, security]

    - rule: Secret Access from Non-Service Account
      desc: Detect secret access from processes not running as service accounts
      condition: >
        open_read and
        fd.name glob /var/run/secrets/kubernetes.io/serviceaccount/* and
        not proc.name in (kubelet, kube-proxy)
      output: >
        Suspicious secret access
        (process=%proc.name file=%fd.name pod=%k8s.pod.name)
      priority: ERROR
      tags: [k8s, secrets]

    - rule: Unexpected Service Account Usage
      desc: Detect pods using service accounts they shouldn't
      condition: >
        spawned_process and
        k8s.pod.name != "" and
        k8s.sa.name = "default" and
        k8s.ns.name in (production, staging)
      output: >
        Pod using default service account in production
        (namespace=%k8s.ns.name pod=%k8s.pod.name)
      priority: NOTICE
      tags: [k8s, rbac]

    - rule: ConfigMap or Secret Creation
      desc: Detect creation of ConfigMaps or Secrets
      condition: >
        jevt.value[/verb] in (create, update) and
        jevt.value[/objectRef/resource] in (configmaps, secrets) and
        not jevt.value[/user/username] startswith system:
      output: >
        ConfigMap/Secret modified
        (user=%jevt.value[/user/username] resource=%jevt.value[/objectRef/resource]
        name=%jevt.value[/objectRef/name] namespace=%jevt.value[/objectRef/namespace])
      priority: INFO
      source: k8s_audit
      tags: [k8s_audit]
```

## Application-Specific Rules

Tailor rules to your applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-app-rules
  namespace: falco
data:
  app-rules.yaml: |
    - rule: Web Shell Detection
      desc: Detect web shell execution patterns
      condition: >
        spawned_process and
        container.image.repository contains nginx and
        (proc.name in (sh, bash, zsh, dash) and
        (proc.aname in (nginx, httpd, apache2) or
        proc.cmdline contains "wget" or
        proc.cmdline contains "curl"))
      output: >
        Possible web shell detected
        (parent=%proc.aname command=%proc.cmdline container=%container.name)
      priority: CRITICAL
      tags: [webshell, attack]

    - rule: Cryptocurrency Mining
      desc: Detect cryptocurrency mining activity
      condition: >
        spawned_process and
        container and
        (proc.name in (xmrig, ethminer, minerd, cpuminer) or
        proc.cmdline contains "stratum+tcp" or
        proc.cmdline contains "cryptonight")
      output: >
        Cryptocurrency mining detected
        (command=%proc.cmdline container=%container.name image=%container.image.repository)
      priority: CRITICAL
      tags: [cryptomining, malware]

    - rule: Reverse Shell Detection
      desc: Detect reverse shell connections
      condition: >
        spawned_process and
        container and
        (proc.name in (nc, ncat, socat, bash, sh) and
        (proc.cmdline contains "-e /bin/sh" or
        proc.cmdline contains "-e /bin/bash" or
        proc.cmdline contains "-c \"/bin/sh\"" or
        proc.cmdline contains "/dev/tcp"))
      output: >
        Reverse shell detected
        (command=%proc.cmdline container=%container.name user=%user.name)
      priority: CRITICAL
      tags: [reverse_shell, attack]

    - rule: Package Manager in Container
      desc: Detect package manager usage in running containers
      condition: >
        spawned_process and
        container and
        container.image.repository in (production-app, api-server) and
        proc.name in (apt-get, yum, dnf, apk)
      output: >
        Package manager executed in production container
        (command=%proc.cmdline container=%container.name)
      priority: WARNING
      tags: [container, compliance]
```

## Macro Definitions for Reusability

Create macros for common conditions:

```yaml
- macro: production_namespace
  condition: k8s.ns.name in (production, prod, critical)

- macro: sensitive_files
  condition: >
    fd.name in (/etc/shadow, /etc/sudoers, /root/.ssh/id_rsa,
    /root/.ssh/authorized_keys, /etc/pam.d/common-auth)

- macro: database_containers
  condition: container.image.repository in (postgres, mysql, mongodb, redis, cassandra)

- macro: shell_binaries
  condition: proc.name in (sh, bash, zsh, dash, csh, tcsh, ksh)

- macro: package_managers
  condition: proc.name in (apt-get, yum, dnf, apk, pip, npm)

# Use macros in rules
- rule: Production Namespace Shell Execution
  desc: Detect shell execution in production namespaces
  condition: >
    spawned_process and
    container and
    production_namespace and
    shell_binaries
  output: >
    Shell executed in production
    (namespace=%k8s.ns.name pod=%k8s.pod.name command=%proc.cmdline)
  priority: WARNING
  tags: [shell, production]
```

## Testing Custom Rules

Validate rules before deployment:

```bash
# Install falco-ctl
wget https://github.com/falcosecurity/falcoctl/releases/download/v0.7.0/falcoctl_0.7.0_linux_amd64.tar.gz
tar -xvf falcoctl_0.7.0_linux_amd64.tar.gz
sudo mv falcoctl /usr/local/bin/

# Validate rule syntax
falcoctl rules validate custom-rules.yaml

# Test rules against sample events
falcoctl rules test custom-rules.yaml --events test-events.json
```

Create test cases:

```bash
# Trigger "Unauthorized Process in Container" rule
kubectl exec -it nginx-pod -- /bin/bash -c "python3"

# Trigger "Write to System Directory" rule
kubectl exec -it nginx-pod -- touch /usr/local/test

# Check Falco logs for alerts
kubectl logs -n falco daemonset/falco | grep "Unauthorized process"
```

## Rule Tuning and Optimization

Reduce false positives:

```yaml
- rule: Shell in Container
  desc: Detect interactive shells in containers
  condition: >
    spawned_process and
    container and
    shell_binaries and
    not (k8s.pod.name startswith "debug-" or
    k8s.pod.name startswith "troubleshoot-") and
    not proc.aname in (kubectl, docker, containerd)
  output: >
    Shell spawned in container
    (pod=%k8s.pod.name command=%proc.cmdline)
  priority: WARNING
  tags: [shell]
  exceptions:
    - name: allowed_pods
      fields: [k8s.pod.name, container.image.repository]
      values:
        - ["build-worker-.*", "jenkins/agent"]
        - ["ci-runner-.*", "gitlab/runner"]
```

## Best Practices

Start with Falco's default rules and add custom rules incrementally. Default rules cover common attack patterns and provide a security baseline.

Use descriptive rule names and detailed descriptions. Future responders need to quickly understand what each rule detects.

Tag rules appropriately for filtering and routing. Tags help organize alerts and route them to appropriate teams.

Test rules in development before deploying to production. False positives disrupt operations and train teams to ignore alerts.

Document exceptions clearly. When you add exceptions to reduce false positives, explain why specific patterns are allowed.

## Conclusion

Custom Falco rules provide runtime security monitoring tailored to your applications and security policies. By detecting suspicious behavior, unauthorized access, and policy violations in real-time, you can respond to security incidents before they escalate. Build rules incrementally, test thoroughly, and tune continuously to maintain an effective runtime security monitoring system.
