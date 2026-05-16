# Validation Summary: How to Install Linkerd on Talos Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Linkerd (service mesh)
- Talos Linux
- Kubernetes
- linkerd2-proxy (Rust-based proxy)
- mTLS / Identity certificates (ECDSA P-256)
- smallstep CLI (`step`)
- OpenSSL
- Linkerd Viz extension
- Linkerd CNI plugin
- Kubernetes ServiceProfile CRD (linkerd.io/v1alpha2)
- containerd

## Sources Consulted
- Official Linkerd documentation: https://linkerd.io/2.15/
- Linkerd getting started guide: https://linkerd.io/2.15/getting-started/
- Linkerd CLI reference: https://linkerd.io/2.15/reference/cli/
- Linkerd certificate generation guide: https://linkerd.io/2.15/tasks/generate-certificates/
- Linkerd ServiceProfile reference: https://linkerd.io/2.15/reference/service-profiles/
- Linkerd proxy injection docs: https://linkerd.io/2.15/features/proxy-injection/
- Linkerd CNI plugin docs: https://linkerd.io/2.15/features/cni/
- Talos Linux documentation: https://www.talos.dev/

## Issues Found
No technical issues found.

All technical claims, CLI commands, flags, certificate generation commands (step and openssl), CRD installation flow, ServiceProfile API structure (`linkerd.io/v1alpha2`), injection annotation (`linkerd.io/inject: enabled`), Viz extension commands (`edges`, `tap`, `routes`, `top`, `stat`, `dashboard`), and CNI plugin instructions (`linkerd install-cni`, `--linkerd-cni-enabled`) verified as correct against official Linkerd 2.15 documentation.

The Talos Linux specifics (containerd runtime, no SSH access, strict pod security defaults) are also accurate.

## Review Notes
- The `openssl` certificate generation example is a simplified alternative to `step`. In practice, the issuer certificate may need explicit `basicConstraints=CA:TRUE` and `keyUsage` extensions to function as an intermediate CA for Linkerd identity. The primary path uses the `step` CLI which handles this correctly via the `intermediate-ca` profile, so the post's recommended approach works as written.
- The post does not pin a specific Linkerd version. Commands shown are valid for Linkerd 2.12+ (when `linkerd install --crds` was introduced) through current stable 2.15. Readers on older versions (pre-2.12) would need to omit the separate `--crds` step.
- The post correctly notes that ECDSA P-256 (prime256v1) keys are required by Linkerd identity — this is a frequent source of errors and is good to highlight.
