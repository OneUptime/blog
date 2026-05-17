# Validation Summary: How to Add Custom CA Certificates to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7-era machine configuration)
- talosctl CLI (`gen config`, `patch machineconfig`, `read`, `logs`, `dmesg`, `reboot`)
- Talos `machine.files` configuration
- Talos `machine.registries.{mirrors,config}` with `tls.ca`, `tls.clientIdentity`, `auth`
- Talos `cluster.apiServer.extraVolumes`
- OpenSSL (`x509`, `s_client`)
- Kubernetes (ConfigMap, kubectl)

## Sources Consulted
- Talos v1.7 Certificate Authorities guide: https://docs.siderolabs.com/talos/v1.7/security/certificate-authorities
- Talos v1.9 Certificate Authorities guide (modern `TrustedRootsConfig` document): https://docs.siderolabs.com/talos/v1.9/security/certificate-authorities
- Talos v1.7 v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- siderolabs/talos source for `VolumeMountConfig` (fields: `hostPath`, `mountPath`, `readonly` — no `name`)
- siderolabs/talos source for `RegistryTLSConfig` (`ca` is `Base64Bytes`, but the YAML unmarshaler also accepts a raw PEM string, matching the convention used in the rest of this blog series)
- Cross-checked against the already-validated sibling posts `configure-private-container-registries-in-talos-linux` and `set-up-extra-volumes-for-the-api-server-in-talos` to keep YAML conventions consistent

## Issues Found
1. **Wrong path for the system trust store.** All `machine.files` examples wrote the CA to custom paths like `/etc/ssl/certs/my-custom-ca.pem`, `/etc/ssl/certs/registry-ca.pem`, and `/etc/ssl/certs/custom-ca-bundle.pem` with `op: append`. Talos does not run `update-ca-certificates`, so dropping a file into `/etc/ssl/certs/` does **not** add it to the trust store — only the single bundle file `/etc/ssl/certs/ca-certificates` is consulted by the system. In addition, `op: append` on a path that doesn't already exist fails. Rewrote every `machine.files` example (Adding to Machine Configuration, Using Config Patches, Adding Multiple CA Certificates, CRI Configuration for Registry Trust, Applying CA Certificates to Running Nodes, Rotating CA Certificates) to use `path: /etc/ssl/certs/ca-certificates` with `op: append`, and added a sentence pointing readers on Talos v1.9+ at the modern `TrustedRootsConfig` document.
2. **Rotation example used `op: create` on a non-trusted path.** The rotation snippet wrote a brand-new file `/etc/ssl/certs/custom-ca-bundle.pem` with `op: create`, which (a) is not the trust bundle and (b) collides with itself on re-apply. Rewrote the example to append the new CA to `/etc/ssl/certs/ca-certificates` and explained how to remove the old CA later (edit the patch/`TrustedRootsConfig` and re-apply).
3. **`extraVolumes` pointed at a non-existent host path.** The `cluster.apiServer.extraVolumes` example mounted `/etc/ssl/certs/my-custom-ca.pem`, a path that no longer exists once the trust-store fix is applied. Repointed both `hostPath` and `mountPath` at `/etc/ssl/certs/ca-certificates` so the API server pod sees the same bundle as the host.
4. **Misleading verification step.** `talosctl -n <node> read /proc/net/tcp` was labelled "Test TLS connectivity to your internal service" — `/proc/net/tcp` just lists socket state and tells you nothing about TLS. Removed that line and tightened the trust-store read step to `talosctl read /etc/ssl/certs/ca-certificates | tail -n 40`.
5. **Bogus empty `clientIdentity` in the registry example.** The CRI configuration block included `clientIdentity: { crt: "", key: "" }`, which is not how the optional mTLS struct is meant to be expressed (it's optional — leave it out unless doing mTLS). Removed those empty fields; the Registry with Authentication example already shows the correct pattern, and the dedicated `configure-private-container-registries-in-talos-linux` post in this series shows mTLS done properly.

## Review Notes
- The `machine.registries.config.<host>.tls.ca` field is typed as `Base64Bytes` in the v1alpha1 schema, but its YAML unmarshaler accepts a raw PEM string in a `|` block scalar (this is the convention used throughout the rest of this blog series, including the already-validated registries post). Left as PEM for consistency.
- The `VolumeMountConfig` used by `cluster.apiServer.extraVolumes` in Talos v1.7 has only `hostPath`, `mountPath`, and `readonly` — there is no `name` field, despite what some upstream Kubernetes examples might suggest. The post's lack of a `name` field is correct.
- For Talos v1.9 and newer, the modern way to add trusted roots is a separate `TrustedRootsConfig` document (`apiVersion: v1alpha1`, `kind: TrustedRootsConfig`, `certificates: |`), which supports clean add/remove semantics for rotation. Added a one-sentence pointer to this in two places, but kept the `machine.files` approach as the primary example since it works across all currently-supported Talos versions and matches the v1.7-era idiom used throughout the rest of this blog series.
- `permissions: 0o644` (Go-style octal literal) is the documented form in Talos machine config; the bare `0644` form also works. Left as-is.
- The "verify from within a pod" snippet uses `wget` from a `busybox` pod against an HTTPS endpoint — this exercises the trust store *inside* the pod's image, not the node's `/etc/ssl/certs/ca-certificates`. It's still a useful end-to-end check that the registry is reachable and serving a chain the pod can validate, so left as-is.
- The troubleshooting section's `openssl s_client -connect ... -CAfile my-ca.pem -showcerts` is the correct invocation for verifying a chain against an explicit CA.
