# Validation Summary: How to Set Up WireGuard with Dynamic Endpoints on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- WireGuard
- Dynamic DNS
- Kubernetes CronJob
- Cloudflare DNS API
- NAT traversal

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux WireguardConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/wireguardconfig
- Talos Linux ResolverConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/resolverconfig
- Talos Linux source schema for legacy WireGuard peer fields: https://github.com/siderolabs/talos
- WireGuard quick start and persistent keepalive guidance: https://www.wireguard.com/quickstart/
- WireGuard wg(8) manual: https://manpages.org/wg/8
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Alpine Linux release information: https://alpinelinux.org/releases/
- Cloudflare DNS Records API documentation: https://developers.cloudflare.com/api/resources/dns/subresources/records/

## Issues Found
- Talos WireGuard peer snippets used `persistentKeepalive: 25`, which is the WireGuard config-file name rather than the Talos machine configuration field. Updated the examples and text to use `persistentKeepaliveInterval: 25s`, matching Talos' documented duration field.
- The DNS re-resolution section suggested configuring `/etc/systemd/resolved.conf.d` on Talos. Talos does not run `systemd-resolved`, so this would not work. Replaced that snippet with Talos DNS nameserver configuration and clarified that frequently changing endpoints need an external process to reapply the endpoint or recreate the interface.
- The Kubernetes CronJob updater used `alpine:3.19` without installing `dig` or `wg`, and it did not run in the host network namespace with privileges needed to update the host WireGuard interface. Updated it to `alpine:3.23`, install `bind-tools` and `wireguard-tools`, query only A records, and run with `hostNetwork: true` plus privileged container security context.

## Review Notes
- The inline `machine.network.interfaces[].wireguard` examples are legacy-style Talos machine configuration, but they remain consistent with the legacy v1alpha1 configuration path and allow DNS endpoint strings. The newer standalone `WireguardConfig` document has a stricter `AddrPort` endpoint shape, so a future revision could modernize the article around current multi-document network configuration.
- The Cloudflare DNS update snippet is intentionally minimal and omits production concerns such as error handling, token scoping details, and proxied-record settings.
