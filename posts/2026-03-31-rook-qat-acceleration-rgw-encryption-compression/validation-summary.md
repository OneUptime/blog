# Validation Summary: How to Enable QAT Acceleration for RGW Encryption and Compression

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Intel QuickAssist Technology (QAT)
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- HashiCorp Vault (SSE-KMS integration)
- Kubernetes Node Feature Discovery (NFD)

## Sources Consulted
- Ceph official documentation on QAT acceleration (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/#qat)
- Ceph source code: `src/common/options/rgw.yaml.in` for `rgw_crypt_s3_kms_backend` valid enum values (`barbican`, `vault`, `testing`, `kmip`)
- Ceph source code: `src/common/options/global.yaml.in` for `qat_compressor_enabled` and `plugin_crypto_accelerator` options
- Ceph RGW Vault integration documentation (https://docs.ceph.com/en/latest/radosgw/vault/)
- Intel QAT software documentation and GitHub repositories (`qatlib`, `QAT_Engine`, `QATzip`)
- Intel Device Plugins for Kubernetes documentation for NFD QAT labels
- Red Hat documentation on QAT driver management and status tools

## Issues Found

1. **`rgw_crypt_s3_kms_backend qat` — invalid value (critical)**
   - **What was wrong:** The post set `rgw_crypt_s3_kms_backend` to `qat`. This option controls which Key Management System backend stores SSE-KMS encryption keys. Valid values are `barbican`, `vault`, `testing`, and `kmip`. QAT is a crypto accelerator, not a KMS backend.
   - **What was changed:** Replaced with `ceph config set global plugin_crypto_accelerator crypto_qat`, which is the correct Ceph config option to enable QAT hardware acceleration for cryptographic operations.
   - **Why:** QAT acceleration for encryption is enabled via the `plugin_crypto_accelerator` option, which selects the native QAT API crypto plugin (`crypto_qat`) instead of the default software implementation (`crypto_isal`).

2. **`rgw_crypt_vault_token your-token` — option does not exist (critical)**
   - **What was wrong:** The post used `rgw_crypt_vault_token` with a raw token string. This config option does not exist in Ceph.
   - **What was changed:** Replaced with the correct options: `rgw_crypt_vault_auth token` (to set authentication method) and `rgw_crypt_vault_token_file /etc/ceph/vault.token` (to point to a token file).
   - **Why:** Ceph requires the Vault token to be stored in a file (readable only by the RGW process) for security. The token is never passed as a raw config string.

3. **`crypto-qat` package name — does not exist (moderate)**
   - **What was wrong:** The prerequisites listed `crypto-qat` as a required package. No such package exists.
   - **What was changed:** Replaced with the correct Intel QAT packages: `qatlib` (user-space library), `qat-engine` (OpenSSL engine), and `QATzip` (compression library).
   - **Why:** These are the actual Intel-published packages available from Intel QAT GitHub repositories and Linux distribution package managers.

4. **`qatstat -s` — fabricated tool (moderate)**
   - **What was wrong:** The post recommended `qatstat -s` for monitoring QAT utilization. This tool does not exist in the Intel QAT software suite.
   - **What was changed:** Replaced with real QAT monitoring commands: `adf_ctl status` (already mentioned earlier in the post) and `cat /sys/kernel/debug/qat_*/fw_counters` for firmware-level counters.
   - **Why:** The actual Intel QAT monitoring tools are `adf_ctl` for device status and the debugfs interface for performance counters.

5. **NFD label `cpu-cpuid.AVX512F` for QAT node selection — incorrect label (moderate)**
   - **What was wrong:** The Rook node affinity example used `feature.node.kubernetes.io/cpu-cpuid.AVX512F` to select QAT-capable nodes. AVX512F is a CPU instruction set feature unrelated to QAT hardware presence. A node can have AVX512F without QAT, and vice versa.
   - **What was changed:** Replaced with `feature.node.kubernetes.io/pci-0b40_8086.present` with value `"true"`, which matches PCI class `0b40` (co-processor) with Intel vendor ID `8086` — the actual PCI signature of QAT devices.
   - **Why:** Node Feature Discovery detects QAT hardware via PCI device enumeration, not CPU feature flags. The PCI class `0b40` with vendor `8086` correctly identifies Intel QAT co-processor devices.

## Review Notes
- The `qat_compressor_enabled` config option is confirmed valid and correctly used for enabling QAT compression acceleration.
- The `radosgw-admin zone placement modify` command for setting compression is correct.
- The `ceph daemon` perf dump command format may vary in containerized (Rook) deployments where admin sockets have different paths. This is a minor usability note, not an error.
- Ceph must be built with `-DWITH_QATDRV=ON` for QAT support. The post mentions checking build flags but does not specify this cmake flag — acceptable for a high-level tutorial.
- The post could benefit from mentioning the Intel Device Plugins Operator for Kubernetes, which automates QAT device plugin deployment in Rook clusters, but this is an enhancement rather than a correction.
