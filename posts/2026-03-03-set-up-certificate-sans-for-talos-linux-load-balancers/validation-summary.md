# Validation Summary: How to Set Up Certificate SANs for Talos Linux Load Balancers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (talosctl CLI, machine configuration v1alpha1)
- TLS / x509 Subject Alternative Names
- Talos VIP (shared/virtual IP)
- Kubernetes API server certificates
- OpenSSL (s_client / x509 inspection)

## Sources Consulted
- Siderolabs Talos CLI reference (v1.12) — https://docs.siderolabs.com/talos/v1.12/reference/cli (verified `talosctl gen config --additional-sans` "additional Subject-Alt-Names for the APIServer certificate" and `--config-patch` "use @file to read a patch from file")
- Talos config patching docs / discussion — https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching (verified `talosctl patch mc` is an alias for `talosctl patch machineconfig`, `--nodes`, `--patch @file`, and `--mode` options)
- Talos machine/apiServer certSANs (search of siderolabs docs/discussions) — https://github.com/siderolabs/talos/issues/5536 (verified `machine.certSANs` for Talos API certs and `cluster.apiServer.certSANs` for Kubernetes API server certs)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- `talosctl gen config <cluster> <endpoint> --additional-sans <name>` is correct; multiple `--additional-sans` flags are supported and accept both IPs and DNS names.
- `--config-patch @file` and `talosctl patch mc --nodes <ip> --patch @file` are valid; `patch mc` is the documented alias for `patch machineconfig`.
- The split between `machine.certSANs` (Talos API certificate) and `cluster.apiServer.certSANs` (Kubernetes API server certificate) is accurate, as is the recommendation to set both behind a load balancer.
- The Talos VIP example (`machine.network.interfaces[].vip.ip`) uses the correct field path for Talos shared/virtual IP, and including the VIP in `certSANs` is correct guidance.
- Port usage is correct: Talos API on TCP 50000 (used in the openssl examples) and Kubernetes API on 6443.
- The openssl inspection commands (`openssl s_client -connect host:50000 ... | openssl x509 -noout -ext subjectAltName` and `-text | grep "Subject Alternative Name"`) are valid for inspecting presented certificate SANs.
- The claim that adding SANs triggers certificate regeneration with at most a brief service restart (no full reboot) is consistent with Talos applying config changes in-place where possible (`--mode no-reboot`/`auto`).
- The statement that Talos does not support wildcard entries in `certSANs` matches x509 SAN handling for the Talos API (each name listed explicitly); left as accurate.
