# How to Run ArgoCD in FIPS Compliance Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Compliance

Description: A comprehensive guide to running ArgoCD in FIPS 140-2 compliance mode for government and regulated environments requiring cryptographic standards.

---

Federal Information Processing Standards (FIPS) 140-2 defines the security requirements for cryptographic modules used by the US federal government. If you work in a government agency, defense contractor, or any regulated industry that requires FIPS compliance, you need to ensure that ArgoCD uses only FIPS-approved cryptographic algorithms. This guide walks through the process of making ArgoCD FIPS-compliant.

## What Is FIPS 140-2 Compliance

FIPS 140-2 specifies which cryptographic algorithms and implementations are approved for use in federal systems. Key requirements include:

- Only using approved encryption algorithms (AES, SHA-256, RSA 2048+)
- No use of deprecated algorithms (MD5, DES, SHA-1 for signing)
- Cryptographic modules must be validated by NIST
- TLS 1.2 or higher (TLS 1.0 and 1.1 are prohibited)

For ArgoCD, this affects several areas: the Go runtime's crypto libraries, TLS connections to Git repositories, internal gRPC communication, and the Redis cache layer.

## Using FIPS-Compliant Go Builds

Standard Go binaries use the Go standard library's crypto packages, which are not FIPS-validated. To get FIPS-compliant crypto, you need Go binaries built with a FIPS-validated crypto module.

### Option 1: Red Hat's FIPS-Compliant ArgoCD

Red Hat OpenShift GitOps includes a FIPS-compliant build of ArgoCD. If you are on OpenShift, this is the easiest path:

```bash
# Install OpenShift GitOps operator (includes FIPS-compliant ArgoCD)
# This is done through the OperatorHub in OpenShift

# Verify the operator is installed
oc get csv -n openshift-gitops | grep gitops
```

Red Hat builds ArgoCD using Go toolchains that link against FIPS-validated OpenSSL libraries, ensuring all cryptographic operations use validated modules.

### Option 2: Building ArgoCD with BoringCrypto

Google's BoringCrypto is a FIPS 140-2 validated crypto module. Go supports building with BoringCrypto through the GOEXPERIMENT=boringcrypto flag:

```bash
# Clone the ArgoCD repository
git clone https://github.com/argoproj/argo-cd.git
cd argo-cd
git checkout v2.13.0

# Build with BoringCrypto (FIPS mode)
GOEXPERIMENT=boringcrypto CGO_ENABLED=1 go build \
  -o argocd-fips \
  ./cmd

# Verify the binary uses BoringCrypto
go tool nm argocd-fips | grep -i boring
```

Build a FIPS-compliant container image:

```dockerfile
# Dockerfile.fips
FROM golang:1.22-bookworm AS builder

# Enable BoringCrypto
ENV GOEXPERIMENT=boringcrypto
ENV CGO_ENABLED=1

WORKDIR /src
COPY . .
RUN make argocd-all

FROM ubuntu:22.04

# Install FIPS-validated OpenSSL
RUN apt-get update && \
    apt-get install -y openssl libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/dist/argocd /usr/local/bin/argocd
```

### Verifying BoringCrypto Is Active

After building, verify that the binary actually uses BoringCrypto:

```bash
# Check for BoringCrypto symbols
go tool nm argocd-fips 2>/dev/null | grep -c "_Cfunc__goboringcrypto"

# If the count is greater than 0, BoringCrypto is linked
```

## Configuring FIPS-Compliant TLS

Even with a FIPS-compliant binary, you need to ensure your TLS configuration only uses approved cipher suites.

### ArgoCD Server TLS Configuration

Configure the ArgoCD server to use only FIPS-approved TLS settings:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enforce TLS 1.2 minimum
  server.tls.minversion: "1.2"
  # Only allow FIPS-approved cipher suites
  server.tls.ciphersuites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
```

### Redis TLS Configuration

Redis connections also need FIPS-compliant TLS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  redis.tls.enabled: "true"
  redis.tls.minversion: "1.2"
```

### Repository Connections

Ensure Git repository connections use FIPS-compliant algorithms. When connecting over SSH, restrict to approved key exchange algorithms:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    # Only use FIPS-approved host key types
    git.example.com ssh-rsa AAAA...
    git.example.com ecdsa-sha2-nistp256 AAAA...
```

## Configuring the FIPS Kernel Mode

On Linux systems, you can enable FIPS mode at the kernel level. This ensures all processes on the node use FIPS-compliant crypto:

```bash
# Check if FIPS mode is enabled on the node
cat /proc/sys/crypto/fips_enabled

# Enable FIPS mode (requires reboot)
# On RHEL/CentOS:
fips-mode-setup --enable
systemctl reboot
```

For Kubernetes nodes running ArgoCD, configure the node OS to run in FIPS mode:

```yaml
# Example for AWS EKS with FIPS-enabled AMI
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: fips-cluster
  region: us-east-1
spec:
  nodeGroups:
    - name: fips-nodes
      ami: ami-fips-enabled-xxxxx  # Use a FIPS-enabled AMI
      instanceType: m5.large
```

## FIPS-Compliant ArgoCD Deployment

Here is a complete deployment manifest for a FIPS-compliant ArgoCD installation:

```yaml
apiVersion: argoproj.io/v1beta1
kind: ArgoCD
metadata:
  name: argocd-fips
  namespace: argocd
spec:
  server:
    image: your-registry.example.com/argocd-fips:v2.13.0
    tls:
      minVersion: "1.2"
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
  repo:
    image: your-registry.example.com/argocd-fips:v2.13.0
  controller:
    image: your-registry.example.com/argocd-fips:v2.13.0
  redis:
    image: redis:7-fips
  dex:
    image: dexidp/dex:v2.38.0-fips
```

## Validating FIPS Compliance

After deploying, validate that FIPS mode is working correctly:

```bash
# Check TLS cipher suites being used
nmap --script ssl-enum-ciphers -p 443 argocd.example.com

# Verify only FIPS-approved ciphers are offered
echo | openssl s_client -connect argocd.example.com:443 -tls1_2 2>/dev/null | \
  grep "Cipher"

# Test that non-FIPS ciphers are rejected
echo | openssl s_client -connect argocd.example.com:443 \
  -cipher RC4-SHA 2>&1 | grep -i "handshake failure"
```

## Audit and Documentation

For compliance audits, document your FIPS configuration:

```bash
# Generate a FIPS compliance report
echo "=== ArgoCD FIPS Compliance Report ==="
echo "Date: $(date)"
echo ""

# Check ArgoCD version
echo "ArgoCD Version:"
argocd version --short

# Check TLS configuration
echo ""
echo "TLS Configuration:"
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml | grep -i tls

# Check image versions
echo ""
echo "Container Images:"
kubectl get pods -n argocd -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}'

# Check FIPS mode on nodes
echo ""
echo "Node FIPS Status:"
kubectl get nodes -o name | while read node; do
  echo "$node: FIPS=$(kubectl debug $node -it --image=busybox -- cat /proc/sys/crypto/fips_enabled 2>/dev/null || echo 'unknown')"
done
```

## Common Pitfalls

There are several things that can break FIPS compliance in ArgoCD:

1. Using the standard ArgoCD image instead of a FIPS-built one
2. Not restricting TLS cipher suites, allowing non-FIPS ciphers
3. Using SSH with non-FIPS key types (like ed25519, which is not yet FIPS-approved)
4. Redis running without TLS, allowing unencrypted cache data
5. Helm charts pulling non-FIPS sidecar images

## Conclusion

Running ArgoCD in FIPS compliance mode requires attention to every component in the stack. Start with FIPS-compliant binaries (Red Hat OpenShift GitOps or custom BoringCrypto builds), configure TLS to use only approved cipher suites, and validate your setup with real tests. FIPS compliance is not a one-time task - it requires ongoing monitoring to ensure that updates and configuration changes do not introduce non-compliant components.

For related security hardening, check out our guide on [hardening ArgoCD server for production](https://oneuptime.com/blog/post/2026-02-26-argocd-harden-server-production/view).
