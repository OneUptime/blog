# How to Enable QAT Acceleration for RGW Encryption and Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QAT, Performance, Encryption, Compression, Hardware Acceleration

Description: Enable Intel QuickAssist Technology (QAT) hardware acceleration in Ceph RGW to offload encryption and compression operations from CPU to dedicated silicon.

---

Intel QuickAssist Technology (QAT) is a hardware accelerator that can offload cryptographic (AES-GCM, SHA) and compression (DEFLATE) operations from the CPU. Ceph RGW supports QAT acceleration for both SSE encryption and object compression, reducing CPU overhead and improving throughput.

## Prerequisites

- Intel QAT-capable server (Xeon D, E5/E7, or Atom C3000 series)
- QAT kernel drivers installed (`qat_c62xvf` or similar)
- QAT user-space libraries installed (`qatlib`, `qat-engine`, `QATzip`)
- Ceph built with QAT support (check: `ceph --version` and inspect build flags)

## Verifying QAT Driver Installation

```bash
# Check QAT devices
lspci | grep -i quickassist

# Verify driver is loaded
lsmod | grep qat

# Check QAT service status
service qat_service status

# List available QAT instances
adf_ctl status
```

## Enabling QAT for RGW Encryption

Configure Ceph to use the QAT crypto accelerator plugin instead of the default software implementation:

```bash
ceph config set global plugin_crypto_accelerator crypto_qat
```

For SSE-KMS with Vault, QAT accelerates the underlying crypto operations while Vault manages the keys:

```bash
ceph config set client.rgw rgw_crypt_vault_addr http://vault.example.com:8200
ceph config set client.rgw rgw_crypt_vault_auth token
ceph config set client.rgw rgw_crypt_vault_token_file /etc/ceph/vault.token
ceph config set client.rgw rgw_crypt_s3_kms_backend vault
```

## Enabling QAT for Object Compression

QAT accelerates DEFLATE compression used by RGW:

```bash
ceph config set client.rgw rgw_compression_type zlib
ceph config set client.rgw qat_compressor_enabled true
```

Apply to a placement target so all uploaded objects are compressed:

```bash
radosgw-admin zone placement modify \
  --rgw-zone default \
  --placement-id default-placement \
  --compression zlib
```

## Verifying QAT Is Being Used

Check RGW metrics to see if crypto and compression operations are using QAT:

```bash
ceph daemon client.rgw.$(hostname -s) perf dump | grep -i qat
```

Monitor QAT utilization with Intel QAT tools:

```bash
adf_ctl status
cat /sys/kernel/debug/qat_*/fw_counters
```

Benchmark compression throughput with and without QAT:

```bash
# Upload a compressible file and measure time
time aws s3 cp large-file.csv s3://test-bucket/ \
  --endpoint-url http://your-rgw-host:7480
```

## Rook Deployment Considerations

When running RGW via Rook on QAT-capable nodes, add node affinity to schedule RGW pods on QAT nodes:

```yaml
spec:
  gateway:
    placement:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: feature.node.kubernetes.io/pci-0b40_8086.present
              operator: In
              values:
              - "true"
```

Also mount the QAT device into RGW containers via device plugins.

## Summary

QAT hardware acceleration in Ceph RGW offloads AES-GCM encryption and DEFLATE compression to dedicated Intel silicon, freeing CPU cycles for other workloads. Enable it by setting `qat_compressor_enabled` for compression and `plugin_crypto_accelerator = crypto_qat` for encryption. In Rook deployments, schedule RGW pods on QAT-capable nodes using node affinity.
