# Validation Summary: How to Configure Machine Registries in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.registries`)
- talosctl CLI (`apply-config`, `get registriesconfig`, `image pull`)
- Container Registry concepts (mirrors, auth, TLS, mTLS)
- Harbor (referenced as a proxy/cache example)
- containerd / CRI (Container Runtime Interface)
- Kubernetes (image pull context)

## Sources Consulted
- [Talos v1.10 v1alpha1 config reference](https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/) — verified the `machine.registries.mirrors` / `machine.registries.config` structure, supported auth fields (`username`, `password`, `auth`, `identityToken`), and TLS fields (`insecureSkipVerify`, `ca`, `clientIdentity`).
- [Talos v1.13 RegistryMirrorConfig reference](https://docs.siderolabs.com/talos/v1.13/reference/configuration/cri/registrymirrorconfig.md) — confirmed `*` wildcard support, `skipFallback`, and `overridePath`.
- [Talos v1.13 Pull-through cache guide](https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/images-container-runtime/pull-through-cache.md) — confirmed default fallback to upstream registry and the role of `skipFallback`.
- [Talos v1.10 CLI reference](https://docs.siderolabs.com/talos/v1.10/reference/cli/) — confirmed `talosctl image pull <image>` syntax and flags.
- [Talos disk encryption docs (v1.11)](https://www.talos.dev/v1.11/talos-guides/configuration/disk-encryption/) — confirmed that STATE partition is NOT encrypted by default; encryption is opt-in via LUKS2 (static/nodeID/KMS/TPM).

## Issues Found

1. **Incorrect claim that the machine config is "encrypted at rest" by default.** The Talos STATE partition (where machine config and secrets live) is stored in plain text unless STATE-partition encryption is explicitly configured (LUKS2 with static/nodeID/KMS/TPM keys). Updated the paragraph after the identity-token example to clarify that the config is stored unencrypted by default and to point readers to STATE-partition encryption if they need at-rest protection.

2. **Incorrect mechanism for disabling fallback to the upstream registry.** The original text said you can prevent fallback by "simply omitting the upstream URL from the list" and showed an example that included `https://registry-1.docker.io` as a "last resort" endpoint. In Talos, the `endpoints` list is the list of mirrors; Talos automatically falls back to the upstream registry after exhausting the mirrors, and this fallback is controlled by the `skipFallback` field on the mirror config (default `false`). Rewrote the "Overriding the Default Endpoint" section to: (a) remove the misleading inclusion of the upstream URL in the endpoints list, and (b) introduce `skipFallback: true` as the correct way to disable fallback for air-gapped deployments.

## Review Notes
- The post uses the v1alpha1 `machine.registries` legacy configuration format. This is still supported in current Talos releases but is deprecated in favor of the new `RegistryMirrorConfig` / `RegistryAuthConfig` / `RegistryTLSConfig` document-based configuration. The post does not call this out; future revisions could mention the newer document-based format and link to it.
- The `clientIdentity` example uses placeholder PEM blobs (`MIIBkTCB+wIUZx...`). The structure (`crt` + `key` as PEM strings under `clientIdentity`, with `ca` as a sibling PEM string) matches the documented schema.
- `talosctl get registriesconfig --nodes <ip> -o yaml` is a valid invocation against the `RegistriesConfig` COSI resource exposed by the Talos API.
- `talosctl image pull --nodes <ip> <image>` is a valid invocation; the namespace defaults to `cri`, which is what users want for verifying CRI registry config.
- The wildcard `"*"` mirror is supported (verified in the v1.13 RegistryMirrorConfig docs: "A special name '*' can be used to define mirror configuration that applies to all registries.").
