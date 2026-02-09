# How to configure proc mount type for enhanced /proc isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Isolation, Proc Filesystem, Pod Security

Description: Understand how to use procMount configuration in Kubernetes to control /proc filesystem visibility and enhance container isolation by masking sensitive kernel and process information.

---

The `/proc` filesystem exposes kernel and process information that can aid attackers in reconnaissance and exploitation. By default, containers see significant information about the host system through `/proc`. Kubernetes provides `procMount` configuration that lets you mask sensitive paths, reducing the information available to potentially compromised containers.

## Understanding /proc Filesystem Exposure

The `/proc` filesystem is a virtual filesystem that presents kernel and process information as files and directories. In containers, `/proc` reveals information about system configuration, running processes, kernel parameters, and more. While some of this information is necessary for applications, much of it aids attackers without providing legitimate value.

Information disclosure through `/proc` can reveal kernel versions, network configuration, process lists, and system capabilities. Attackers use this intelligence to identify vulnerabilities and plan privilege escalation or container escape attempts.

## Default vs Unmasked procMount

Kubernetes supports two procMount values. The default value masks certain paths in `/proc` to hide sensitive information. The unmasked value provides full `/proc` visibility, similar to running on a host system:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: proc-default-demo
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "ls -la /proc && sleep 3600"]
    securityContext:
      procMount: Default  # This is the default behavior
```

With `procMount: Default`, Kubernetes masks paths like `/proc/scsi`, `/proc/keys`, `/proc/timer_list`, and others that expose sensitive kernel information.

## Verifying procMount Configuration

Check what information is visible with different procMount settings:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: proc-test
spec:
  containers:
  - name: test
    image: ubuntu:20.04
    command: ["sleep", "3600"]
    securityContext:
      procMount: Default
      runAsUser: 1000
      runAsNonRoot: true
```

Exec into the pod and inspect what's visible:

```bash
kubectl exec -it proc-test -- bash

# Check for masked paths
ls -la /proc/scsi
# ls: cannot access '/proc/scsi': No such file or directory

ls -la /proc/keys
# ls: cannot access '/proc/keys': No such file or directory

# Check visible information
cat /proc/version
# Still accessible

cat /proc/meminfo
# Still accessible

# Check process information
ls /proc/1
# Can see init process information
```

The default procMount masks dangerous paths while leaving necessary information accessible.

## Security Implications of Unmasked Proc

Setting `procMount: Unmasked` exposes additional information that can aid attackers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: proc-unmasked-demo
spec:
  hostPID: true  # Required for Unmasked to work
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      procMount: Unmasked
```

Note that `procMount: Unmasked` requires `hostPID: true`. This combination provides extensive visibility into host processes and kernel information, which is almost always unnecessary and dangerous for application containers.

## Restricted Proc Mount in Pod Security Standards

The restricted Pod Security Standard prohibits unmasked proc mounts:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: compliant-proc
  namespace: secure-apps
spec:
  securityContext:
    runAsUser: 2000
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      procMount: Default  # Required by restricted standard
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

This configuration complies with the restricted standard, which requires `procMount: Default` to limit information disclosure.

## Combining procMount with Other Isolation Techniques

Proc mount configuration works best alongside other security measures:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: isolated-container
spec:
  securityContext:
    runAsUser: 3000
    runAsGroup: 3000
    runAsNonRoot: true
    fsGroup: 3000
    seccompProfile:
      type: RuntimeDefault
    seLinuxOptions:
      level: "s0:c100,c200"
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      procMount: Default
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

This configuration layers multiple isolation techniques including masked proc, non-root user, read-only filesystem, seccomp profiles, and SELinux labels.

## Legitimate Use Cases for Unmasked Proc

Very few legitimate use cases exist for `procMount: Unmasked`. System monitoring and debugging tools might need this access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: system-monitor
  namespace: kube-system
  annotations:
    security-exception: "Required for system monitoring"
    reviewed-by: "security-team"
    review-date: "2026-02-01"
spec:
  hostPID: true
  hostNetwork: true
  containers:
  - name: monitor
    image: system-monitor:1.0
    securityContext:
      procMount: Unmasked
      privileged: true  # Usually required with Unmasked
```

Document and justify every use of `procMount: Unmasked`. Regular security reviews should question whether this configuration remains necessary.

## Testing Application Compatibility

Before enforcing `procMount: Default`, test that applications work correctly:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-test
spec:
  containers:
  - name: test
    image: myapp:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Test application startup
      /app/start.sh &
      APP_PID=$!

      # Wait for app to start
      sleep 5

      # Verify app is running
      if kill -0 $APP_PID 2>/dev/null; then
        echo "Application started successfully"
      else
        echo "Application failed to start"
        exit 1
      fi

      # Run application tests
      /app/run-tests.sh

      # Keep container running
      wait $APP_PID
    securityContext:
      procMount: Default
      runAsUser: 4000
      runAsNonRoot: true
```

Most applications work fine with masked proc because they don't access sensitive kernel information. Applications that fail might be doing unnecessary reconnaissance or have security issues themselves.

## Monitoring for Proc Access Attempts

Monitor containers for attempts to access masked proc paths:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      procMount: Default
      runAsUser: 5000
      runAsNonRoot: true
  - name: audit-sidecar
    image: audit-tool:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Monitor for attempts to access masked paths
      inotifywait -m -e access /proc 2>&1 | while read line; do
        echo "Proc access: $line"
      done
    securityContext:
      runAsUser: 5001
      runAsNonRoot: true
```

Frequent attempts to access masked paths might indicate malicious activity or application misconfiguration.

## Comparing with Other Isolation Mechanisms

Proc mount masking complements other isolation techniques:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: defense-in-depth
spec:
  securityContext:
    runAsUser: 6000
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      procMount: Default           # Limits proc visibility
      allowPrivilegeEscalation: false  # Prevents privilege gain
      readOnlyRootFilesystem: true     # Prevents filesystem modification
      capabilities:
        drop:
        - ALL                       # Removes dangerous capabilities
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Each layer provides defense against different attack vectors. Masked proc reduces reconnaissance capability, while other measures prevent exploitation even if attackers gain information.

## Configuring PodSecurityPolicy for Proc Mount

If using the deprecated PodSecurityPolicy, you can control allowed proc mount types:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  allowedProcMountTypes:
  - Default  # Only allow Default, not Unmasked
  hostPID: false
  hostNetwork: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
```

This policy blocks pods from using `procMount: Unmasked`.

## Runtime Detection of Proc Mount Type

Applications can detect their proc mount configuration:

```bash
# Inside a container, check if certain paths are masked
if [ -e /proc/scsi ]; then
  echo "Running with Unmasked proc mount"
else
  echo "Running with Default (masked) proc mount"
fi

# Check specific masked paths
for path in /proc/scsi /proc/keys /proc/timer_list /proc/sched_debug; do
  if [ -e "$path" ]; then
    echo "$path: VISIBLE"
  else
    echo "$path: MASKED"
  fi
done
```

Applications should not rely on masked paths being absent, as the list of masked paths might change across Kubernetes versions.

## Conclusion

Configuring `procMount: Default` is a simple security measure that reduces information disclosure without impacting most applications. The masked proc mount hides sensitive kernel and system information that aids attackers in reconnaissance and exploitation planning. Use the default masked configuration for all application workloads and reserve `procMount: Unmasked` for the rare infrastructure components that genuinely need full proc visibility. Always combine proc mount configuration with other security measures like running as non-root, read-only root filesystems, and seccomp profiles. Document and justify any use of unmasked proc mounts, and regularly review whether those configurations remain necessary. The default masked proc mount should be your standard, with explicit security review required for any exceptions.
