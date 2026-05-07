# How to Configure AppArmor Profiles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, AppArmor, Security, Linux, Kubernetes

Description: Step-by-step guide to creating and enforcing AppArmor profiles on containerized workloads in Rancher.

## Introduction

Configuring AppArmor profiles in Rancher-managed Kubernetes environments is a practical way to harden Linux workloads. In Rancher, AppArmor is configured on the Linux nodes and then referenced from Kubernetes manifests for the workloads you deploy.

## Why This Matters

Container and Kubernetes environments face unique security challenges:
- Dynamic workloads create large attack surfaces
- Container escape vulnerabilities can compromise host systems
- Supply chain attacks target container images and dependencies
- Lateral movement is easy in flat networks

How to Configure AppArmor Profiles in Rancher addresses these challenges by adding defense-in-depth controls.

## Prerequisites

- A Rancher-managed Linux cluster with cluster admin access
- Kubernetes 1.33+ and `kubectl` access to the cluster
- Access to each Linux worker node to load AppArmor profiles
- AppArmor enabled on the nodes, with the AppArmor tools installed
- Understanding of Linux security concepts

## Step 1: Assess Current Security Posture

```bash
# Verify that AppArmor is enabled and the tooling is present on every node.
# This example assumes node names match host names and are reachable over SSH.
NODES=($( kubectl get node -o jsonpath='{.items[*].status.addresses[?(.type == "Hostname")].address}' ))
for NODE in "${NODES[@]}"; do
  echo "== $NODE =="
  ssh "$NODE" 'cat /sys/module/apparmor/parameters/enabled && command -v apparmor_parser && sudo cat /sys/kernel/security/apparmor/profiles | sort | head'
done
```

## Step 2: Create and Load an AppArmor Profile

```bash
# Load this profile on every Linux node.
# This example assumes node names match host names and are reachable over SSH.
NODES=($( kubectl get node -o jsonpath='{.items[*].status.addresses[?(.type == "Hostname")].address}' ))
for NODE in "${NODES[@]}"; do
  ssh "$NODE" 'sudo apparmor_parser -q <<EOF
#include <tunables/global>

profile k8s-apparmor-example-deny-write flags=(attach_disconnected) {
  #include <abstractions/base>

  file,

  # Deny all file writes.
  deny /** w,
}
EOF'
done
```

## Step 3: Apply Pod Security Standards

```yaml
# namespace-security-labels.yaml
# Label namespace to enforce Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce strict Pod Security Standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

## Step 4: Configure AppArmor for the Workload

```yaml
# hello-apparmor.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello-apparmor
  namespace: production
spec:
  securityContext:
    appArmorProfile:
      type: Localhost
      localhostProfile: k8s-apparmor-example-deny-write
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: hello
    image: busybox:1.36
    command: ["sh", "-c", "echo 'Hello AppArmor!' && sleep 1h"]

    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

## Step 5: Deploy the Workload

```bash
kubectl apply -f namespace-security-labels.yaml
kubectl apply -f hello-apparmor.yaml

kubectl get pod hello-apparmor -n production
```

## Step 6: Test the Profile

```bash
# This write should be denied by the AppArmor profile.
kubectl exec -n production hello-apparmor -- touch /tmp/test
```

## Step 7: Verify Security Controls

```bash
#!/bin/bash
# apparmor-verification.sh

echo "=== AppArmor Verification ==="

echo "1. Checking the AppArmor profile applied to the pod..."
kubectl exec -n production hello-apparmor -- cat /proc/1/attr/current

echo ""
echo "2. Checking Pod Security labels on the namespace..."
kubectl get namespace production --show-labels

echo ""
echo "3. Checking that the profile is loaded on the scheduled node..."
NODE=$(kubectl get pod -n production hello-apparmor -o jsonpath='{.spec.nodeName}')
HOSTNAME=$(kubectl get node "$NODE" -o jsonpath='{.status.addresses[?(.type == "Hostname")].address}')
ssh "$HOSTNAME" "sudo cat /sys/kernel/security/apparmor/profiles | grep k8s-apparmor-example-deny-write"

echo ""
echo "4. Checking recent pod events..."
kubectl describe pod -n production hello-apparmor

echo "=== Verification Complete ==="
```

## Conclusion

Implementing AppArmor profiles in Rancher adds an important layer of defense to your Kubernetes security posture. Because Rancher-managed clusters rely on the underlying Kubernetes nodes for AppArmor enforcement, make sure the profile is loaded everywhere the workload can schedule. Combine AppArmor with other security controls (network policies, RBAC, admission webhooks) for comprehensive defense-in-depth. Regular security audits and automated compliance checks ensure controls remain effective over time.
