# Validation Summary: How to Configure Flux Proxy Secret for HTTPS Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Kubernetes Secrets
- GitRepository
- OCIRepository
- HelmRepository
- HTTPS proxies
- TLS certificate authorities
- kubectl
- Flux CLI

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux source-controller repository: https://github.com/fluxcd/source-controller
- Flux runtime secrets implementation: https://github.com/fluxcd/pkg

## Issues Found
- The post incorrectly showed `caFile` inside the `proxySecretRef` Secret. Flux proxy secrets support `address`, `username`, and `password`; CA material belongs in source TLS/authentication secrets or the controller trust store. I removed `caFile` from the proxy Secret examples and changed the TLS trust example to use a separate `ca.crt` Secret.
- The GitRepository example did not reference the CA Secret after introducing TLS inspection trust. I added `secretRef: tls-inspection-ca`, which matches Flux GitRepository documentation for HTTPS CA trust.
- The apply command used `helm-repository.yaml` even though the section creates an `OCIRepository`. I changed it to `oci-repository.yaml`.
- The troubleshooting command checked `.data.caFile` in the proxy Secret. I changed it to check `.data.ca.crt` in the `GitRepository` `secretRef` Secret.
- The proxy comparison table said an HTTP proxy sees plaintext requests for HTTPS targets. For HTTPS targets, both HTTP and HTTPS proxies see CONNECT metadata and an encrypted tunnel unless TLS inspection is performed. I corrected the table.

## Review Notes
The Flux CLI and kubectl binaries were not installed in this workspace, so command behavior was validated against official documentation and source code rather than local `--help` output.
