# How to Configure RKE2 FIPS Compliance Mode - Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, FIPS, Compliance, Security, Kubernetes, Government, SUSE Rancher

Description: Learn how to enable FIPS 140-2 compliant mode in RKE2 to meet federal government security requirements, including OS preparation, RKE2 FIPS binary installation, and verification.

---

FIPS 140-2 compliance is required for federal government deployments and many regulated industries. RKE2 is built with FIPS-validated cryptographic libraries; for bundled CNIs, only the default Canal CNI is rebuilt for FIPS compliance.

---

## Step 1: Enable FIPS Mode on the Host OS

FIPS mode must be enabled at the OS level before installing RKE2:

```bash
# Enable FIPS on RHEL/CentOS/Rocky Linux

sudo fips-mode-setup --enable
sudo reboot

# Verify FIPS is active after reboot
fips-mode-setup --check
# Expected output: FIPS mode is enabled
```

For Ubuntu:

```bash
# Install FIPS packages (requires Ubuntu Pro subscription)
sudo pro enable fips-updates
sudo reboot

# Verify FIPS is active after reboot
cat /proc/sys/crypto/fips_enabled
# Expected output: 1
```

---

## Step 2: Install RKE2

On supported Linux AMD64 hosts, RKE2 release assets are built with FIPS-validated cryptographic libraries. Install RKE2 from the stable channel:

```bash
# Install RKE2 with FIPS-validated crypto support
curl -sfL https://get.rke2.io | \
  INSTALL_RKE2_CHANNEL=stable \
  INSTALL_RKE2_TYPE=server \
  sh -
```

---

## Step 3: Configure RKE2 for FIPS

```yaml
# /etc/rancher/rke2/config.yaml
token: my-fips-cluster-token
tls-san:
  - "rke2-fips.example.com"

# Disable non-FIPS algorithms
kube-apiserver-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

kube-controller-manager-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"

kube-scheduler-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"

kubelet-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
```

---

## Step 4: Start RKE2 and Verify

```bash
systemctl enable --now rke2-server.service

# Verify the RKE2 binary reports GoBoring/BoringCrypto support
rke2 --version | grep -Ei "boringcrypto|fips"

# Check TLS negotiation uses a configured FIPS-approved cipher
openssl s_client -connect 127.0.0.1:6443 -tls1_2 2>&1 | grep Cipher
```

---

## Step 5: Run CIS Benchmark Alongside FIPS

FIPS-enabled clusters should also meet the CIS Kubernetes Benchmark. Add the CIS profile before first start, after meeting the RKE2 CIS host-level requirements:

```yaml
# Add to config.yaml before starting RKE2
profile: cis
```

---

## Verification Checklist

- [ ] Host OS FIPS mode enabled and verified after reboot
- [ ] Official RKE2 Linux AMD64 release installed
- [ ] TLS minimum version set to 1.2
- [ ] Only FIPS-approved cipher suites configured
- [ ] Kubernetes Secrets encrypted at rest with the FIPS-compatible `aescbc` provider
- [ ] RKE2 system images and third-party add-ons reviewed for FIPS-compatible crypto

---

## Best Practices

- Purchase SUSE's FIPS-validated Rancher Prime subscription for formal compliance documentation.
- Test FIPS mode in a non-production environment first - some third-party software may break due to algorithm restrictions.
- Document your crypto module versions and certification numbers for auditors.
