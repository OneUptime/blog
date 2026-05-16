# Validation Summary: How to Understand Talos Linux Trust and PKI Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Public Key Infrastructure (PKI)
- TLS and mutual TLS
- Kubernetes certificates
- etcd certificates
- talosctl

## Sources Consulted
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux talosconfig reference: https://docs.siderolabs.com/talos/v1.11/reference/talosconfig
- Talos Linux PKI and certificate lifetime management: https://docs.siderolabs.com/talos/v1.9/security/cert-management
- Talos Linux CA rotation guide: https://docs.siderolabs.com/talos/v1.10/security/ca-rotation
- Talos Linux RBAC guide: https://docs.siderolabs.com/talos/v1.9/security/rbac
- Talos Linux network connectivity reference: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-network-connectivity

## Issues Found
- The post described one cluster CA as the root for every certificate. Updated this to describe separate Talos, Kubernetes, and etcd CA chains.
- The post said the Talos CA key is included in talosconfig. Corrected this because talosconfig contains the CA certificate plus a client certificate and client key, not the Talos CA private key.
- The machine and cluster CA YAML examples used literal PEM blocks. Updated them to base64-encoded values, matching Talos machine configuration schema.
- The Kubernetes certificate inspection example used `talosctl get certificate`, which is not the documented command for Kubernetes dynamic certificates. Replaced it with `talosctl get KubernetesDynamicCerts -o yaml`.
- The certificate rotation section said Talos API node certificates have long lifetimes and showed manual regeneration via new secrets. Updated it to reflect Talos' automatic server-side certificate management and the documented `talosctl rotate-ca` workflow for Talos API CA rotation.
- The kubelet rotation wording implied default kubelet flag behavior. Reworded it to match Talos documentation: kubelet certificates require a restart at least once a year for rotation.
- The RBAC section used informal role names. Updated them to the documented `os:admin`, `os:reader`, and `os:operator` roles and added a working `talosctl config new --roles` example.
- The troubleshooting section used `talosctl services`; updated it to `talosctl service`, the documented command for service state.
- The machine token was described as a cluster token. Updated the wording to match the MachineConfig `machine.token` terminology.

## Review Notes
The local environment did not have `talosctl` installed, so CLI validation was performed against the official Sidero Labs Talos documentation rather than local `--help` output.
