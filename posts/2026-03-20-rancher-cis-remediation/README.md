# How to Remediate CIS Benchmark Failures in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CIS, Security, Compliance, Remediation

Description: A practical guide to remediating common CIS Kubernetes benchmark failures found by Rancher's CIS scanning tool.

After running CIS scans in Rancher, the next critical step is remediating the failures. CIS benchmark failures represent real security gaps that increase your cluster's attack surface. This guide covers the most common CIS benchmark failures in RKE2 clusters and provides step-by-step remediation guidance. Because RKE2 already hardens many CIS controls by default, start by checking whether a failing control is caused by a custom override or by a missing RKE2 CIS profile for your version.

## Prerequisites

- Rancher with CIS Benchmark scan results showing failures
- Cluster admin privileges
- `kubectl` and SSH access to cluster nodes
- Understanding of your cluster architecture

## Common CIS Benchmark Failure Categories

CIS failures typically fall into these categories:

1. **API Server configuration** (Section 1.2)
2. **etcd configuration** (Section 2)
3. **Control plane configuration** (Section 3)
4. **Worker node configuration** (Section 4)
5. **Kubernetes Policies** (Section 5)

## Remediating API Server Failures

### 1.2.1 - Anonymous Authentication Disabled

```bash
# RKE2 already starts kube-apiserver with --anonymous-auth=false by default.
# Verify the live kube-apiserver flags first.
sudo /bin/ps -ef | grep kube-apiserver | grep -v grep

# If --anonymous-auth=true is present, or the flag is missing, edit the server configuration
sudo vi /etc/rancher/rke2/config.yaml
```

```yaml
# /etc/rancher/rke2/config.yaml - Only add this override if the default was changed
kube-apiserver-arg:
  - "anonymous-auth=false"
```

```bash
# Restart the RKE2 server service to apply changes
sudo systemctl restart rke2-server
```

### 1.2.2 - Basic Authentication File Not Present

```bash
# RKE2 does not enable basic auth by default.
# Verify that the live kube-apiserver process does not include --basic-auth-file
sudo /bin/ps -ef | grep kube-apiserver | grep -v grep | grep "basic-auth-file"

# If found, remove the basic-auth-file argument from the API server config
sudo vi /etc/rancher/rke2/config.yaml
# Remove any basic-auth-file=<path> entries, then restart rke2-server
```

## Remediating etcd Failures

### 2.1 - etcd Data Directory Permissions

```bash
# Check current permissions on etcd data directory
ls -ld /var/lib/rancher/rke2/server/db/etcd

# Ensure the etcd user and group exist before fixing ownership
getent passwd etcd || sudo useradd -r -c "etcd user" -s /sbin/nologin -M etcd -U

# Fix permissions - should be 700
sudo chmod 700 /var/lib/rancher/rke2/server/db/etcd

# Fix ownership - should be owned by the etcd user and group
sudo chown etcd:etcd /var/lib/rancher/rke2/server/db/etcd

# Verify the fix
ls -ld /var/lib/rancher/rke2/server/db/etcd
```

## Remediating Kubelet Failures

### 4.2.1 - Anonymous Authentication Disabled on Kubelet

```yaml
# /etc/rancher/rke2/config.yaml - Only add these overrides if the kubelet defaults were changed
kubelet-arg:
  # Disable anonymous authentication to the kubelet API
  - "anonymous-auth=false"
  # Require authorization for kubelet
  - "authorization-mode=Webhook"
  # Enable client certificate authentication
  - "client-ca-file=/var/lib/rancher/rke2/agent/client-ca.crt"
  # Protect kernel defaults
  - "protect-kernel-defaults=true"
  # Read-only port disabled (port 0 = disabled)
  - "read-only-port=0"
```

```bash
# Restart RKE2 after changing kubelet arguments
sudo systemctl restart rke2-server

# Or restart the agent service on worker-only nodes
sudo systemctl restart rke2-agent
```

## Remediating Network Policy Failures

### 5.3.2 - All Namespaces Have Network Policies

```bash
# Check existing network policies by namespace
kubectl get networkpolicy -A

# RKE2 CIS profiles already apply network policies to the built-in namespaces.
# Add a default deny-all policy to additional namespaces that do not already have one.
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces
  if [[ "$ns" != "kube-system" ]] && \
     [[ "$ns" != "kube-public" ]] && \
     [[ "$ns" != "default" ]] && \
     [[ "$ns" != "cattle-system" ]]; then

    # Check if a deny-all policy already exists
    if ! kubectl get networkpolicy default-deny-all -n "$ns" >/dev/null 2>&1; then
      echo "Adding default-deny-all policy to namespace: $ns"
      kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: $ns
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
    fi
  fi
done
```

## Remediating RBAC Failures

### 5.1.3 - Minimize Wildcard Usage in Roles

```bash
# Find roles with wildcard permissions (security risk)
for cr in $(kubectl get clusterroles -o custom-columns=NAME:.metadata.name --no-headers); do
  if kubectl get clusterrole "$cr" -o json | grep -q '"\*"'; then
    echo "$cr"
  fi
done

# Find namespace roles with wildcards
kubectl get roles -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name --no-headers | \
while read -r ns role; do
  if kubectl get role "$role" -n "$ns" -o json | grep -q '"\*"'; then
    echo "$ns/$role"
  fi
done

# Review and replace wildcard permissions with specific ones
# Instead of this:
cat << 'EOF'
# BAD: Wildcard permissions
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
EOF

# Use this:
cat << 'EOF'
# GOOD: Specific permissions
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
EOF
```

## Remediating Pod Security Failures

### 5.2.1 - Do Not Admit Privileged Containers

```bash
# On Kubernetes v1.25 and newer, Pod Security Admission can be set with namespace labels.
# If RKE2 is started with profile: cis or profile: cis-1.23, restricted admission is already
# applied to most namespaces by default.

# Enforce restricted pod security standard
kubectl label namespace my-app \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  --overwrite

# For namespaces that need baseline (less strict)
kubectl label namespace monitoring \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  --overwrite

# On RKE2 v1.24 and older, use the cis-1.6 profile so RKE2 applies the restrictive
# PodSecurityPolicies needed for section 5.2 of the CIS benchmark.
```

## Step: Verify Remediations

```bash
# List the installed scan profiles and choose the hardened RKE2 profile that matches your cluster version
kubectl get clusterscanprofiles.cis.cattle.io

# Run a new CIS scan after remediating issues
SCAN_PROFILE="replace-with-your-hardened-rke2-profile"
kubectl apply -f - <<EOF
apiVersion: cis.cattle.io/v1
kind: ClusterScan
metadata:
  name: post-remediation-scan
spec:
  scanProfileName: ${SCAN_PROFILE}
EOF

# Wait for the scan to complete
kubectl get clusterscans.cis.cattle.io post-remediation-scan -w

# Compare results with the previous scan
# The number of failures should decrease
kubectl get clusterscans.cis.cattle.io post-remediation-scan -o yaml
```

## Conclusion

Remediating CIS benchmark failures is an iterative process that requires collaboration between security, operations, and development teams. Start with the highest-severity failures and work systematically through each category. After each round of remediations, run a new CIS scan to verify progress. Remember to test remediations in a non-production environment first, as some changes (like disabling anonymous auth on the kubelet) can impact running workloads if not implemented carefully.
