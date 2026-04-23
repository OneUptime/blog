# How to Configure RKE2 with CIS Hardened Profile

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, CIS, Security, Hardening, Compliance, Rancher

Description: Learn how to configure RKE2 with the built-in CIS hardened profile to automatically apply security benchmark configurations to your Kubernetes cluster.

RKE2 includes a built-in CIS hardened profile that automatically applies many of the security configurations required by the CIS Kubernetes Benchmark. This is one of RKE2's key differentiators - it provides a secure-by-default Kubernetes distribution. This guide covers how to enable and work with the RKE2 CIS hardened profile.

## Prerequisites

- Linux nodes meeting the CIS benchmark prerequisites
- RKE2 installed but not yet running
- Understanding of CIS Kubernetes Benchmark requirements
- Appropriate OS-level hardening (kernel parameters, etc.)

## What the CIS Hardened Profile Configures

The RKE2 CIS hardened profile (`cis`) automatically:

- Sets secure API server flags (disables anonymous auth, configures audit logging parameters)
- Configures kubelet with secure defaults
- Applies Pod Security Standards
- Configures the etcd process and data directory ownership
- Configures network policies for built-in namespaces
- Creates a default audit policy file

## Step 1: OS Prerequisites for CIS Hardening

Before enabling the CIS profile, prepare the OS:

```bash
# Apply the RKE2-provided sysctl settings required by the CIS profile.
# Use the path that matches your installation method.

# RPM/YUM/DNF installs:
sudo cp -f /usr/share/rke2/rke2-cis-sysctl.conf /etc/sysctl.d/60-rke2-cis.conf

# Tarball installs:
# sudo cp -f /usr/local/share/rke2/rke2-cis-sysctl.conf /etc/sysctl.d/60-rke2-cis.conf

sudo systemctl restart systemd-sysctl
```

```bash
# Create required etcd user and group (for CIS compliance)
sudo groupadd -r etcd 2>/dev/null || true
sudo useradd -r -c "etcd user" -s /sbin/nologin -M -g etcd etcd 2>/dev/null || true

# Set up proper permissions for configuration directories
sudo mkdir -p /etc/rancher/rke2/
sudo chmod 700 /etc/rancher/rke2/
```

## Step 2: Configure RKE2 with CIS Hardened Profile

```yaml
# /etc/rancher/rke2/config.yaml - CIS hardened configuration
# Enable the CIS hardened profile
profile: cis

# Use profile: cis-1.23 only on older RKE2 releases that require it.

# The CIS profile automatically configures:
# - kube-apiserver: anonymous-auth=false, audit logging, etc.
# - kubelet: protect-kernel-defaults=true, anonymous-auth=false
# - etcd: proper process and data directory ownership
# - Admission controllers: PodSecurity admission on Kubernetes v1.25+

# Required for CIS 1.11; not needed for CIS 1.9 or CIS 1.10:
kube-apiserver-arg:
  - "service-account-extend-token-expiration=false"

# Additional TLS SANs
tls-san:
  - "k8s.example.com"
  - "10.0.0.10"

# Optional Pod Security Standards override.
# RKE2 creates a default CIS PSA file automatically when the CIS profile is enabled.
# pod-security-admission-config-file: /etc/rancher/rke2/psa.yaml

write-kubeconfig-mode: "0640"
```

## Step 3: Optionally Configure Pod Security Admission for CIS (Kubernetes v1.25+)

```yaml
# /etc/rancher/rke2/psa.yaml - Optional Pod Security Admission override
# Reference this file with pod-security-admission-config-file if you need to customize the generated default.
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      # CIS mode should enforce restricted Pod Security Standards by default
      enforce: "restricted"
      enforce-version: "latest"
      # Warn on restricted violations
      warn: "restricted"
      warn-version: "latest"
      # Audit restricted violations
      audit: "restricted"
      audit-version: "latest"
    exemptions:
      # Exempt system namespaces
      usernames: []
      runtimeClasses: []
      namespaces:
      - kube-system
      - compliance-operator-system
      - tigera-operator
```

## Step 4: Verify CIS Hardening Is Applied

```bash
# Start RKE2 with CIS profile
sudo systemctl start rke2-server

# Verify API server flags
sudo ps aux | grep kube-apiserver | tr ' ' '\n' | grep -E "anonymous|audit|admission|service-account"

# Expected output should include:
# --anonymous-auth=false
# --audit-log-path=...
# --admission-control-config-file=...
# --service-account-extend-token-expiration=false

# Verify kubelet flags
sudo ps aux | grep kubelet | tr ' ' '\n' | grep -E "anonymous|protect-kernel"

# Run a CIS scan to verify compliance
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: post-hardening-scan
spec:
  scanProfileName: cis-1.10-profile
EOF

kubectl get clusterscan post-hardening-scan -w
```

## Step 5: Address Remaining CIS Failures

Even with the CIS profile, some checks require manual configuration:

```bash
# 5.3.2 - Ensure all namespaces have network policies
# Add default deny policies only to application namespaces you manage.
# Create explicit allow policies for DNS and required application traffic separately.
WORKLOAD_NAMESPACES="app1 app2"
for ns in $WORKLOAD_NAMESPACES; do
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
done
```

## Step 6: Configure Audit Logging

The CIS profile configures audit log parameters and creates a default audit policy, but you should customize the policy to start logging requests:

```yaml
# /etc/rancher/rke2/audit-policy.yaml - Custom audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log secrets access at metadata level
  - level: Metadata
    verbs: ["get", "list", "watch"]
    resources:
    - group: ""
      resources: ["secrets"]

  # Log authentication failures
  - level: RequestResponse
    verbs: ["create"]
    resources:
    - group: "authentication.k8s.io"
      resources: ["tokenreviews"]

  # Log RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
      resources: ["clusterroles", "clusterrolebindings", "roles", "rolebindings"]

  # Default - log at metadata level
  - level: Metadata
    omitStages:
    - RequestReceived
```

Restart RKE2 after changing the audit policy so the API server reloads it:

```bash
sudo systemctl restart rke2-server.service
```

## Conclusion

RKE2's built-in CIS hardened profile significantly reduces the effort required to achieve a CIS-compliant Kubernetes cluster. By setting `profile: cis` in the server configuration, RKE2 automatically applies dozens of security configurations that would otherwise require manual setup. Combined with Rancher's CIS scanning capabilities, you can continuously monitor compliance and quickly identify any deviations. For organizations with strict security requirements, starting with the hardened profile from day one is strongly recommended.
