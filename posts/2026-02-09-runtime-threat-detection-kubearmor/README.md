# How to Implement Runtime Threat Detection with KubeArmor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, KubeArmor

Description: Learn how to implement runtime threat detection in Kubernetes using KubeArmor to protect containers from malicious activities and zero-day exploits.

---

Runtime security is critical for protecting Kubernetes workloads from attacks that occur during container execution. While traditional security measures focus on preventing vulnerabilities before deployment, runtime threat detection monitors and blocks malicious behavior as it happens. KubeArmor is an open-source runtime security engine that uses eBPF and Linux Security Modules (LSM) to enforce security policies at the kernel level.

This guide will show you how to deploy KubeArmor in your Kubernetes cluster and configure runtime threat detection policies to protect your workloads.

## Why Runtime Threat Detection Matters

Container images might pass static security scans but still contain zero-day vulnerabilities or be compromised at runtime. Attackers often exploit running containers by executing shell commands, accessing sensitive files, or making unexpected network connections. Runtime threat detection provides a last line of defense by monitoring and blocking suspicious activities in real-time.

KubeArmor operates at the kernel level, making it extremely difficult for attackers to bypass. It can enforce policies that restrict file access, network connections, process execution, and system calls without modifying your application code.

## Installing KubeArmor

First, install KubeArmor using Helm. The installation includes the KubeArmor daemon that runs on each node and the KubeArmor controller that manages policies.

```bash
# Add the KubeArmor Helm repository
helm repo add kubearmor https://kubearmor.github.io/charts
helm repo update

# Install KubeArmor with default settings
helm install kubearmor kubearmor/kubearmor \
  --namespace kubearmor \
  --create-namespace \
  --set kubearmorRelay.enabled=true
```

The relay component forwards security events to external logging systems. Verify the installation:

```bash
# Check that KubeArmor pods are running
kubectl get pods -n kubearmor

# View KubeArmor status
kubectl get kubearmor -n kubearmor
```

## Understanding KubeArmor Policies

KubeArmor uses KubeArmorPolicy custom resources to define security rules. Policies can be applied at the namespace or pod level and support three enforcement modes:

- **Audit**: Log violations without blocking (useful for testing)
- **Block**: Prevent violations and log them
- **Allow**: Explicitly permit specific actions

Let's create a basic policy that prevents containers from executing shells, a common attack vector.

## Blocking Shell Execution

Create a policy that prevents bash and sh execution in your application pods:

```yaml
# shell-block-policy.yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: block-shell-execution
  namespace: production
spec:
  # Apply to pods with this label
  selector:
    matchLabels:
      app: web-server

  # Start in audit mode to test
  action: Audit

  process:
    matchPaths:
      - path: /bin/bash
        action: Block
      - path: /bin/sh
        action: Block
      - path: /usr/bin/bash
        action: Block
      - path: /usr/bin/sh
        action: Block
```

Apply the policy:

```bash
kubectl apply -f shell-block-policy.yaml
```

Test the policy by attempting to exec into a pod:

```bash
# Try to execute bash in a protected pod
kubectl exec -it web-server-pod -n production -- /bin/bash
# This should be blocked when action is set to Block
```

## Restricting File Access

Protect sensitive files and directories from unauthorized access. This policy prevents containers from reading SSL certificates except for authorized processes:

```yaml
# file-access-policy.yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: protect-tls-certs
  namespace: production
spec:
  selector:
    matchLabels:
      tier: frontend

  action: Block

  file:
    matchDirectories:
      - dir: /etc/ssl/
        recursive: true
        readOnly: true
        # Only nginx process can access
        fromSource:
          - path: /usr/sbin/nginx
            action: Allow
```

This creates a whitelist approach where only nginx can read SSL certificates, blocking all other processes.

## Monitoring Network Connections

Prevent containers from making unexpected outbound connections, which could indicate data exfiltration or command-and-control communication:

```yaml
# network-policy.yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: restrict-network-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server

  action: Block

  network:
    matchProtocols:
      # Block all outbound connections except DNS and HTTPS
      - protocol: tcp
        fromSource:
          - path: /usr/bin/curl
            action: Block
          - path: /usr/bin/wget
            action: Block

      # Allow DNS
      - protocol: udp
        port: 53
        action: Allow
```

## Restricting System Calls

Advanced policies can restrict dangerous system calls that might be used for privilege escalation:

```yaml
# syscall-policy.yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: block-privilege-escalation
  namespace: production
spec:
  selector:
    matchLabels:
      security: high

  action: Block

  syscalls:
    matchSyscalls:
      # Block privilege escalation syscalls
      - syscall:
          - setuid
          - setgid
          - setreuid
          - setregid
          - setresuid
          - setresgid
        action: Block

      # Block kernel module loading
      - syscall:
          - init_module
          - finit_module
          - delete_module
        action: Block
```

## Viewing Security Events

KubeArmor generates detailed security events that you can query using kubectl or forward to your SIEM:

```bash
# Install karmor CLI tool
curl -sfL https://raw.githubusercontent.com/kubearmor/kubearmor-client/main/install.sh | sh

# View real-time security logs
karmor logs --namespace production

# Filter for blocked events
karmor logs --namespace production --logFilter=policy

# Export logs in JSON format
karmor logs --json --logFile=/tmp/security-events.json
```

## Integrating with Observability Tools

Forward KubeArmor events to your existing monitoring stack. Configure the relay to send events to Prometheus:

```yaml
# Install with Prometheus integration
helm upgrade kubearmor kubearmor/kubearmor \
  --namespace kubearmor \
  --set kubearmorRelay.enabled=true \
  --set kubearmorRelay.prometheus.enabled=true \
  --set kubearmorRelay.prometheus.port=9090
```

Query metrics using PromQL:

```promql
# Count of blocked actions by policy
rate(kubearmor_policy_blocked_total[5m])

# Alert on unusual number of violations
sum(rate(kubearmor_alerts_total[5m])) > 10
```

## Testing Policies Safely

Always test new policies in Audit mode before enforcing them. This prevents accidentally breaking legitimate application functionality:

```bash
# Create policy in Audit mode
cat <<EOF | kubectl apply -f -
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: test-policy
  namespace: staging
spec:
  selector:
    matchLabels:
      app: test-app
  action: Audit  # Start with audit
  process:
    matchPaths:
      - path: /bin/ls
        action: Block
EOF

# Monitor audit logs for a period
karmor logs --namespace staging --logFilter=policy

# If no legitimate blocks, change to Block mode
kubectl patch kubearmor test-policy -n staging \
  --type=merge -p '{"spec":{"action":"Block"}}'
```

## Best Practices

Start with broad audit policies and progressively tighten them based on observed behavior. Apply the principle of least privilege by blocking everything and explicitly allowing only necessary actions. Use label selectors to apply different policies to different security tiers within your cluster.

Monitor KubeArmor resource usage on nodes, especially in large clusters. The eBPF-based implementation is lightweight, but complex policies can add overhead. Regularly review security events to identify new attack patterns and update policies accordingly.

Combine KubeArmor with other security layers like network policies, pod security standards, and admission controllers for defense in depth. Runtime security is most effective as part of a comprehensive security strategy.

## Conclusion

KubeArmor provides powerful runtime threat detection capabilities that protect your Kubernetes workloads from attacks that bypass traditional security controls. By leveraging eBPF and LSM at the kernel level, it can enforce fine-grained security policies without requiring changes to your applications.

Start with audit mode to understand your workload behavior, then progressively implement blocking policies. Integrate KubeArmor events with your observability stack to detect and respond to threats in real-time. With proper configuration, KubeArmor significantly reduces the attack surface of your containerized applications.
