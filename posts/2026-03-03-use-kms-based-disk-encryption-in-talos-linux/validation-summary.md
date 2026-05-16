# Validation Summary: How to Use KMS-Based Disk Encryption in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux disk encryption
- Talos `VolumeConfig` machine configuration documents
- LUKS2
- Talos network KMS
- gRPC
- Kubernetes Deployments and Services
- `talosctl`
- `kubectl`
- HashiCorp Vault Transit
- Prometheus alerting rules

## Sources Consulted
- Talos Linux v1.13 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux v1.13 `VolumeConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/volumeconfig
- Talos Linux `talosctl apply-config` CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs `kms-client` reference KMS server source: https://github.com/siderolabs/kms-client
- Sidero Labs `kms-client` KMS protobuf API: https://github.com/siderolabs/kms-client/blob/main/api/kms/kms.proto
- Talos KMS key handler source: https://github.com/siderolabs/talos/blob/main/internal/pkg/encryption/keys/kms.go
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post used the legacy `machine.systemDiskEncryption` structure as the primary configuration. Current Talos documentation configures system volume encryption with `VolumeConfig` documents, so the configuration examples were updated to use `apiVersion: v1alpha1`, `kind: VolumeConfig`, and `name: STATE` / `EPHEMERAL`.
- The KMS endpoint examples used REST-style paths such as `/v1/keys/talos-state-key`. Talos expects a gRPC KMS endpoint used for Seal and Unseal operations, so the examples were changed to host-and-port endpoints such as `https://kms.example.com:4050`.
- The description of how KMS works implied that Talos retrieves named encryption keys from KMS. Talos generates disk key material and stores sealed data in LUKS token metadata, then asks the KMS to seal or unseal it. The explanation was corrected.
- The reference `kms-server` Docker command omitted the required `--key-path` argument and mounted a directory instead of a specific key file. The command was corrected to mount a key file and pass `--key-path=/kms.key`.
- The production Kubernetes example said TLS should be used but did not enable TLS in the container arguments or mount TLS material. The example now includes `--tls-enable`, certificate and key paths, and a TLS secret mount.
- The high availability guidance did not mention that replicas must share the same key material or backend. This was added because otherwise different replicas may be unable to unseal data sealed by another replica.
- The recovery-key section recommended static recovery keys without caveat. Talos documents that `STATE` encryption configuration is stored in cleartext in `META`, so a warning was added for static keys on `STATE`.
- The key rotation section described changing KMS key endpoints and decommissioning the old key as if rotation were purely centralized. Talos requires maintaining a working key, applying config with reboot, then removing the old key and applying again, so the procedure and `talosctl apply-config` command were corrected.
- Several claims about audit logging, compliance, key revocation, and centralized key control were too absolute for the reference KMS implementation. They were softened to reflect that those properties depend on the deployed KMS backend and operational controls.

## Review Notes
The remaining Kubernetes, Prometheus, `kubectl`, `talosctl logs`, and Vault command examples are syntactically plausible. A future improvement would be to add a complete production KMS backend example, because the Sidero Labs reference server is intentionally minimal and not a full cloud KMS integration by itself.
