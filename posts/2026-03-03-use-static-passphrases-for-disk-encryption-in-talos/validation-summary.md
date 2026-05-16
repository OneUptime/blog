# Validation Summary: How to Use Static Passphrases for Disk Encryption in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- Talos VolumeConfig disk encryption
- LUKS2
- talosctl
- HashiCorp Vault
- SOPS
- OpenSSL
- Kubernetes kubectl

## Sources Consulted
- Talos v1.12 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos v1.12 VolumeConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/block/volumeconfig
- Talos v1.12 Disk Management resources documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/resources/
- Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- OpenSSL rand manual: https://docs.openssl.org/master/man1/openssl-rand/
- SOPS documentation: https://getsops.io/docs/

## Issues Found
- The disk encryption YAML used the older `machine.systemDiskEncryption` structure. Updated examples to current `VolumeConfig` documents for `STATE` and `EPHEMERAL`, matching the Talos v1.12 storage configuration docs.
- The introduction incorrectly described node ID keys as hardware-derived. Updated it to say `nodeID` keys are derived from the node UUID and partition label.
- The post recommended static passphrases for `STATE` without the official Talos security caveat. Added warnings that `STATE` encryption configuration is stored in cleartext in `META`, and limited recovery-key guidance to non-`STATE` volumes.
- The `EPHEMERAL` examples omitted `lockToState`. Added it to non-`STATE` examples to align with Talos guidance for binding non-`STATE` volume keys to `STATE`.
- The rotation section claimed passphrase rotation could happen without downtime and moved the new key into a different slot. Updated the workflow to use `talosctl apply-config --mode=reboot` and keep the new key in its original slot while removing the old key.
- The per-node generation example used `sed` with base64 passphrases, which can break on `/` and `&` characters. Replaced it with the same `envsubst` pattern used elsewhere in the article.
- The verification section only queried `VolumeStatus`. Added `talosctl get volumeconfig` checks and clarified what to look for in both configuration and status output.
- A shell code block mixed shell commands and YAML content. Split it into separate `bash` and `yaml` blocks so the examples are syntactically correct.

## Review Notes
- The post is now technically consistent with the current Talos v1.12 documentation. Static passphrases remain a weak key type by design, especially for `STATE`, so the article now presents that limitation explicitly rather than treating static passphrases as a general production default.
