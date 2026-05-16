# Validation Summary: How to Set Up SideroLink VPN for Remote Management

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- SideroLink
- Sidero Omni
- WireGuard
- omnictl
- talosctl
- Kubernetes kubeconfig access

## Sources Consulted
- Talos Linux SideroLink documentation: https://docs.siderolabs.com/talos/v1.12/networking/siderolink/
- Talos Linux SideroLinkConfig reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/siderolink/siderolinkconfig
- Omni CLI reference: https://docs.siderolabs.com/omni/reference/cli
- Omni configuration reference: https://docs.siderolabs.com/omni/reference/omni-configuration
- Omni machine registration documentation: https://docs.siderolabs.com/omni/omni-cluster-setup/registering-machines/register-machines-with-omni
- Omni initial machine labels / Image Factory documentation: https://docs.siderolabs.com/omni/omni-cluster-setup/how-to-set-initial-machine-labels

## Issues Found
- The `omnictl download --output talos-omni.iso` command omitted the required image name. Changed it to `omnictl download iso --output talos-omni.iso` to match the Omni CLI syntax.
- The self-hosted Omni configuration example used a non-current `apiVersion`/`kind` style and incorrect SideroLink fields. Replaced it with the current `services.machineAPI` and `services.siderolink.wireGuard` configuration shape from the Omni configuration reference.
- The self-hosted port examples treated a single UDP port as both the SideroLink API and WireGuard endpoint. Updated the examples to distinguish the Machine API endpoint from the WireGuard endpoint.
- The firewall rules omitted required outbound access to the Omni Machine API and used an incorrect hard-coded WireGuard port. Updated the rules to include the TCP Machine API path and the configured WireGuard UDP port.
- The remote management examples used an `omnictl talosctl` wrapper that is not present in the current Omni CLI reference. Updated the flow to download an Omni-managed talosconfig with `omnictl talosconfig` and then run `talosctl` directly.
- The kubeconfig example redirected `omnictl kubeconfig` output to a file even though the current CLI takes an optional output path and merges by default. Updated it to pass the output path explicitly and disable merge.
- The article described SideroLink as a flat IPv6 network without caveat. Updated it to state that SideroLink is a point-to-point overlay and that direct node-to-node communication over SideroLink is not supported.
- The NAT section implied keepalive tuning could be adjusted by the user. Updated it to state that SideroLink handles keepalive internally and that some NAT configurations may still be incompatible with WireGuard.

## Review Notes
The post remains a general guide rather than a version-pinned deployment runbook. Omni and Talos release cadence is active, so future reviews should re-check CLI flags, default ports, and configuration field names against the current Sidero Labs documentation.
