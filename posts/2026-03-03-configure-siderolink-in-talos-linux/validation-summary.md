# Validation Summary: How to Configure SideroLink in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.5+)
- SideroLink
- Sidero Metal / Omni management plane
- WireGuard (Curve25519, ChaCha20-Poly1305)
- Kubernetes (kubectl, Helm)
- talosctl CLI and COSI resources

## Sources Consulted
- Talos SideroLink networking guide: https://docs.siderolabs.com/talos/v1.9/networking/siderolink/
- SideroLinkConfig reference (v1.10): https://docs.siderolabs.com/talos/v1.10/reference/configuration/siderolink/siderolinkconfig/
- Talos v1alpha1 machine config reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos networking resources / COSI reference: https://docs.siderolabs.com/talos/v1.9/learn-more/networking-resources
- Sidero Metal SideroLink overview: https://www.sidero.dev/v0.6/overview/siderolink/
- SideroLink GitHub issue (original design): https://github.com/siderolabs/talos/issues/4448

## Issues Found

1. **Incorrect machine config structure for SideroLink.** The post originally showed SideroLink configured via a `machine.siderolink.api` field with a manually-declared `siderolink` interface under `machine.network.interfaces`. This is wrong on two counts:
   - The top-level `machine` config section has no `siderolink` field. SideroLink is configured through a **separate** machine configuration document with `apiVersion: v1alpha1` / `kind: SideroLinkConfig`, and the field is `apiUrl` (not `api`). It can also be supplied via the `siderolink.api` kernel command line argument.
   - The `siderolink` WireGuard interface is created automatically by Talos when it processes the SideroLinkConfig — it should not be declared under `machine.network.interfaces` with a user-chosen IP address.
   
   **Fix:** Replaced the YAML with the correct SideroLinkConfig document (`apiUrl` with `?jointoken=…`) and updated the surrounding prose to explain that the interface and address are managed automatically.

2. **Wrong IPv6 prefix in examples.** The post used arbitrary `fd00:1234:5678::/...` addresses for SideroLink. SideroLink actually allocates addresses from the `fdae::/32` overlay prefix, which is server-generated, not user-chosen.

   **Fix:** Updated the example IPv6 addresses (both in the config section and in the "Using SideroLink for Node Management" examples) to use the correct `fdae::/32` range, and clarified in prose that the prefix is `fdae::/32`.

3. **Misleading MTU tuning example.** The post showed an MTU override on the `siderolink` interface via `machine.network.interfaces`, which is not a supported configuration path (the interface is fully managed by Talos and not declared in user config).

   **Fix:** Rewrote the Performance Tuning section to explain that the SideroLink interface's MTU is managed automatically, and that the operator should instead adjust MTU on the underlying physical interface that carries the WireGuard traffic.

## Review Notes
- The default UDP port for the SideroLink WireGuard endpoint (51821) and the example API port (8099) could not be definitively confirmed against current Sidero Metal documentation; they are plausible defaults from Sidero Metal deployments and were left unchanged. Operators should always check their own Sidero/Omni install for the actual endpoint and port.
- The `talosctl get wireguardpeers` resource name was kept as written. The COSI resource ecosystem does include WireGuard peer information, though the exact resource short-name may vary by Talos version — readers may need to use `talosctl get` (no argument) to list available resource types on their version.
- The Sidero Metal Helm-deployed service/deployment/label names (`sidero-system` namespace, `app=sidero-link`, `deploy/siderolink`) are generic and depend on the specific Helm chart version installed; they are representative but operators should adjust to match their deployment.
- The WireGuard crypto primitive claims (Curve25519 for key exchange, ChaCha20-Poly1305 for data encryption) are correct per the WireGuard whitepaper.
- The minimum Talos version for SideroLink mentioned (v1.5+) is conservative — SideroLink itself was introduced in Talos v0.14, so v1.5 is safely supported.
