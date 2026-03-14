# How to Prevent Calico Node CrashLoopBackOff

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Node preparation, configuration validation, and deployment practices that prevent calico-node pods from entering CrashLoopBackOff.

---

## Introduction

Preventing calico-node CrashLoopBackOff starts with treating node preparation as a first-class concern in your cluster provisioning process. Most CrashLoopBackOff incidents are caused by conditions that existed before Calico was deployed: missing kernel modules, residual CNI configuration from a previous plugin, or an incomplete RBAC setup. A pre-flight validation checklist catches these before calico-node ever starts.

Beyond initial setup, ongoing prevention involves monitoring node kernel versions, ensuring Calico manifests are applied consistently via GitOps, and setting up alerting that catches restart storms before they cascade. The goal is to create a cluster environment where calico-node has everything it needs to start successfully on every node, every time.

This guide covers pre-deployment checks, node preparation steps, and ongoing operational practices that collectively prevent calico-node CrashLoopBackOff.

## Symptoms

- Recurring CrashLoopBackOff after node replacements or OS upgrades
- New nodes joining the cluster unable to run calico-node successfully
- CrashLoopBackOff appearing after cluster upgrades

## Root Causes

- Node OS images without required kernel modules
- Leftover CNI configuration from previous CNI plugin installation
- RBAC manifests out of sync with Calico version requirements
- Resource limits too restrictive for node count or pod density

## Diagnosis Steps

```bash
# Pre-flight check script for a new node
NODE=<new-node-hostname>

# Check kernel modules
ssh $NODE "lsmod | grep -E 'ipip|xt_set|nf_conntrack'"

# Check for existing CNI configs
ssh $NODE "ls /etc/cni/net.d/"

# Check kernel version compatibility
ssh $NODE "uname -r"
```

## Solution

**Prevention 1: Run pre-flight checks before adding nodes**

```bash
#!/bin/bash
# pre-flight-calico.sh - run on each new node
REQUIRED_MODULES="ipip xt_set nf_conntrack ip_tables"
for mod in $REQUIRED_MODULES; do
  if ! lsmod | grep -q "^$mod"; then
    echo "Loading module: $mod"
    modprobe $mod
    echo $mod >> /etc/modules
  else
    echo "Module present: $mod"
  fi
done

# Remove any leftover CNI configs
if ls /etc/cni/net.d/ | grep -vq "calico"; then
  echo "WARNING: Non-Calico CNI config found - review manually"
  ls /etc/cni/net.d/
fi
```

**Prevention 2: Use a node configuration DaemonSet to ensure kernel modules**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-prereqs
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: calico-prereqs
  template:
    metadata:
      labels:
        app: calico-prereqs
    spec:
      hostPID: true
      initContainers:
      - name: load-modules
        image: busybox
        securityContext:
          privileged: true
        command: ["/bin/sh", "-c"]
        args:
        - modprobe ipip; modprobe xt_set; modprobe nf_conntrack; echo "Modules loaded"
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
      containers:
      - name: pause
        image: gcr.io/google-containers/pause:3.2
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
```

**Prevention 3: Pin Calico manifests in version control**

Store the Calico install manifests in your GitOps repository and use a CI check to validate RBAC resources are present and correct.

**Prevention 4: Set resource requests/limits conservatively**

```yaml
# In calico-node DaemonSet
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

```mermaid
flowchart LR
    A[Node provisioning] --> B[Run pre-flight script]
    B --> C[Kernel modules loaded]
    C --> D[Old CNI configs removed]
    D --> E[Calico DaemonSet deploys]
    E --> F[calico-node 1/1 Ready]
    F --> G[Continuous: monitor restarts]
```

## Prevention

- Incorporate `calico-prereqs` DaemonSet into your base cluster configuration
- Test node images in staging before rolling to production
- Alert on calico-node restart counts above baseline

## Conclusion

Preventing calico-node CrashLoopBackOff is primarily a node preparation problem. Running pre-flight checks for kernel modules, removing conflicting CNI configurations, and keeping RBAC manifests in sync with the installed Calico version eliminates the majority of crash scenarios before they occur in production.
