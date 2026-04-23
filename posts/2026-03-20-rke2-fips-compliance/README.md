# How to Configure RKE2 FIPS Compliance Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, FIPS, Compliance, Security, Government

Description: Learn how to enable and configure FIPS 140-2 compliance mode in RKE2 for government and regulated industry Kubernetes deployments.

FIPS 140-2 (Federal Information Processing Standard) is a US government standard specifying cryptographic module requirements. It is required for many federal agency workloads and is increasingly required in financial and healthcare regulated environments. RKE2 is built to support FIPS 140-2 compliance by using FIPS-validated cryptographic modules for its components. This guide covers enabling and verifying FIPS mode for RKE2 deployments.

## Prerequisites

- A FIPS-enabled Linux operating system (RHEL 8/9 with FIPS mode, Ubuntu Pro FIPS/FIPS-updates on a supported Ubuntu LTS)
- A supported RKE2 release on Linux AMD64/x86_64
- Understanding of FIPS cryptographic requirements

## Understanding FIPS in RKE2

When RKE2 is deployed on FIPS-enabled hosts with FIPS-compatible RKE2 components and FIPS-only TLS configuration:

- RKE2 component cryptographic operations use FIPS 140-2 approved algorithms
- TLS 1.2 endpoints are restricted to FIPS-approved cipher suites
- Key generation uses FIPS-compliant methods
- Most RKE2 components are compiled with FIPS-validated cryptographic modules (BoringCrypto)

Common approved algorithms include:
- **Symmetric encryption**: AES-128, AES-256
- **Hash functions**: SHA-256, SHA-384, SHA-512
- **Key exchange**: ECDH (P-256, P-384), RSA
- **Digital signatures**: ECDSA, RSA (2048-bit minimum)

## Step 1: Enable FIPS on the Operating System

### RHEL 8/9 (Recommended for FIPS)

```bash
# Enable FIPS mode on RHEL 8/9

sudo fips-mode-setup --enable

# Reboot to apply FIPS mode
sudo reboot

# After reboot, verify FIPS is enabled
sudo fips-mode-setup --check
# Expected: FIPS mode is enabled

# Additional verification
cat /proc/sys/crypto/fips_enabled
# Expected output: 1
```

### Ubuntu 20.04/22.04

```bash
# Enable FIPS on Ubuntu Pro. The fips-updates stream is recommended for security updates.
sudo pro enable fips-updates

# For strict certified packages where available for your Ubuntu release:
# sudo pro enable fips

# Reboot after enabling
sudo reboot

# Verify FIPS is enabled
cat /proc/sys/crypto/fips_enabled
# Expected: 1
pro status

# Check FIPS kernel and OpenSSL behavior
uname -r
openssl md5 /dev/null >/tmp/openssl-md5.out 2>&1 && \
  echo "WARNING: MD5 digest command succeeded; verify OpenSSL FIPS configuration" || \
  { echo "MD5 digest command failed"; cat /tmp/openssl-md5.out; }
```

## Step 2: Install RKE2

```bash
# RKE2's Linux AMD64 release artifacts are built with FIPS-compatible crypto.
# There is no separate "-fips" suffix or "fips" install channel.
RKE2_VERSION="v1.34.6+rke2r3"

# Install a specific supported RKE2 version
curl -sfL https://get.rke2.io | \
  sudo env INSTALL_RKE2_VERSION="${RKE2_VERSION}" \
  INSTALL_RKE2_TYPE=server \
  sh -

# Or track the stable channel
curl -sfL https://get.rke2.io | \
  sudo env INSTALL_RKE2_CHANNEL=stable \
  INSTALL_RKE2_TYPE=server \
  sh -
```

## Step 3: Configure RKE2 for FIPS Mode

```yaml
# /etc/rancher/rke2/config.yaml - FIPS configuration
# Note: RKE2 FIPS support is handled through the RKE2 build,
# host FIPS mode, the default FIPS-compliant Canal CNI, and TLS configuration.

cni: canal

kube-apiserver-arg:
  # FIPS-compliant TLS cipher suites only
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

  # Additional API server hardening
  - "anonymous-auth=false"

kube-controller-manager-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

# Use the CIS hardened profile (complements FIPS)
profile: cis
```

```yaml
# /var/lib/rancher/rke2/agent/etc/kubelet.conf.d/10-fips-tls.conf
# RKE2 v1.32 and newer should configure kubelet TLS through a kubelet config drop-in.
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
tlsMinVersion: VersionTLS12
tlsCipherSuites:
  - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
  - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
  - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
```

## Step 4: Verify FIPS Cryptography in Use

```bash
# Check the installed RKE2 version and architecture
/usr/local/bin/rke2 --version
uname -m

# Optional build string check
strings /usr/local/bin/rke2 | grep -Ei "boringcrypto|fips" | head -5

# Check TLS configuration on API server
openssl s_client -connect localhost:6443 -tls1_2 </dev/null 2>&1 | grep -E "Protocol|Cipher"

# Verify a FIPS-approved TLS 1.2 cipher can negotiate
openssl s_client -connect localhost:6443 -tls1_2 \
  -cipher ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384 </dev/null 2>&1 | grep "Cipher is"

# Spot-check that a non-FIPS TLS 1.2 cipher is not negotiated
openssl s_client -connect localhost:6443 \
  -tls1_2 \
  -cipher ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305 </dev/null 2>&1 | \
  grep -Ei "handshake failure|no cipher match|Cipher is (NONE|0000)"
```

## Step 5: Configure Applications for FIPS Compliance

Applications running on a FIPS-enabled RKE2 cluster should also use FIPS-compliant cryptography:

```yaml
# fips-compliant-app.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-workloads
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fips-app
  namespace: secure-workloads
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fips-app
  template:
    metadata:
      labels:
        app: fips-app
    spec:
      # Use a FIPS-compiled application image
      containers:
      - name: fips-app
        # Replace this with your FIPS-compiled application image built from a FIPS-capable base image
        image: registry.access.redhat.com/ubi8/ubi-minimal:latest
        command: ["/bin/sh", "-c", "sleep infinity"]
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          runAsGroup: 1001
          allowPrivilegeEscalation: false
          seccompProfile:
            type: RuntimeDefault
          capabilities:
            drop: ["ALL"]
```

## Step 6: FIPS Documentation and Attestation

```bash
# Generate FIPS compliance report
cat > /tmp/fips-compliance-check.sh << 'EOF'
#!/bin/bash
echo "=== FIPS Compliance Check for RKE2 ==="
echo "Date: $(date)"
echo ""

echo "1. OS FIPS Mode:"
cat /proc/sys/crypto/fips_enabled
fips-mode-setup --check 2>/dev/null || echo "fips-mode-setup not available"

echo ""
echo "2. Kernel FIPS Support:"
uname -r
ls /boot/vmlinuz-$(uname -r) 2>/dev/null | xargs file 2>/dev/null

echo ""
echo "3. OpenSSL FIPS Status:"
if openssl md5 /dev/null >/tmp/openssl-md5.out 2>&1; then
  echo "WARNING: MD5 digest command succeeded; verify OpenSSL FIPS provider and policy"
else
  echo "MD5 digest command failed"
  cat /tmp/openssl-md5.out
fi

echo ""
echo "4. RKE2 TLS Configuration:"
openssl s_client -connect 127.0.0.1:6443 -tls1_2 </dev/null 2>&1 | grep "Cipher\|Protocol" | head -5

echo ""
echo "5. System Crypto Policies:"
update-crypto-policies --show 2>/dev/null || echo "update-crypto-policies not available"
EOF

chmod +x /tmp/fips-compliance-check.sh
sudo /tmp/fips-compliance-check.sh
```

## Conclusion

Enabling FIPS mode for RKE2 involves both OS-level FIPS configuration and RKE2-specific TLS cipher suite restrictions. The combination helps ensure RKE2 control plane and bundled runtime components use FIPS-validated modules and approved algorithms. For government customers and regulated industries, starting with a FIPS-enabled OS (RHEL with FIPS mode or Ubuntu Pro FIPS/FIPS-updates) and a supported RKE2 release provides the foundation for a compliant Kubernetes environment. Remember that FIPS compliance is a system-wide requirement - applications deployed on the cluster must also use FIPS-compliant cryptography.
