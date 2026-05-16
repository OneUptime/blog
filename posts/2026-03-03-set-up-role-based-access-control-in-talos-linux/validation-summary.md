# Validation Summary: How to Set Up Role-Based Access Control in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos API RBAC
- talosctl
- Talos client certificates and talosconfig
- etcd snapshots

## Sources Consulted
- Sidero Labs Talos RBAC documentation: https://docs.siderolabs.com/talos/v1.13/security/rbac
- Sidero Labs talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Sidero Labs Talos role definitions source: https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/role/role.go
- Sidero Labs Talos API authorization rules source: https://raw.githubusercontent.com/siderolabs/talos/main/internal/app/machined/pkg/system/services/machined.go

## Issues Found
- The post said any valid Talos client certificate has full administrative access. Updated this to state that the generated Talos client configuration has the `os:admin` role, matching Talos RBAC behavior.
- The `os:reader` role was described as able to view configuration. Updated it to clarify that reader access is limited to safe read-only methods and does not expose sensitive machine configuration or file contents.
- The `os:operator` role was described as able to perform upgrades. Updated it to operational actions supported by the role, such as reboot, shutdown, service restart, and etcd snapshots, while noting upgrades remain admin-only.
- The certificate generation examples used raw OpenSSL signing and manual talosconfig assembly. Replaced them with the supported `talosctl config new --roles ... --crt-ttl ...` workflow.
- The scale-out certificate script accepted Talos CA files and manually assembled talosconfig content. Updated it to generate role-specific talosconfig files through `talosctl config new`.
- The short-lived certificate example used raw OpenSSL signing. Replaced it with `talosctl config new --crt-ttl=24h`.
- The denied `apply-config` example omitted the required `--file` flag. Added `--file config-with-rbac.yaml`.

## Review Notes
Talos RBAC is enabled by default for new clusters created with `talosctl` v0.11 and later, but older upgraded clusters may still need the machine feature enabled explicitly. The official RBAC page still documents `machine.features.rbac`; the current MachineConfig reference page does not prominently list that field, so this should be rechecked if the post is later updated for a specific Talos minor version.
