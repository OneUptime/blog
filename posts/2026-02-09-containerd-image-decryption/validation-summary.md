# Validation Summary: How to Configure containerd Image Decryption for Encrypted Container Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd CRI image decryption
- containerd/imgcrypt and ctr-enc
- Skopeo image encryption
- Docker Buildx / BuildKit image builds
- OCI encrypted container images
- Kubernetes Secrets and DaemonSets

## Sources Consulted
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd CRI image decryption documentation: https://github.com/containerd/containerd/blob/main/docs/cri/decryption.md
- containerd stream processor documentation: https://containerd.io/docs/main/stream_processors/
- containerd/imgcrypt README: https://github.com/containerd/imgcrypt
- Skopeo copy documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- BuildKit README and output documentation: https://github.com/moby/buildkit/blob/master/README.md
- containerd operations and metrics documentation: https://containerd.io/docs/main/ops/

## Issues Found
- The post described installing stock `ctr` with an encryption plugin and used `ctr images encrypt` / `ctr images decrypt`. Stock `ctr` does not provide those subcommands; imgcrypt provides the extended `ctr-enc` command. Updated installation and all encryption, decryption, rotation, and layer inspection commands to use `ctr-enc`.
- The containerd stream processor configuration only handled uncompressed encrypted tar layers. Added gzip and zstd encrypted layer processors so common encrypted image layer media types are handled.
- The containerd runtime option `enable_cdi = true` was presented as enabling decryption for runc. CDI is unrelated to OCI image decryption, so that runtime configuration was removed.
- The post included a `/etc/containerd/keys/config.yaml` using `protocol: pgp` for an RSA/JWE key. For local JWE keys with imgcrypt, the decoder reads key files from the path passed with `--decryption-keys-path`; removed the incorrect key config and replaced it with a short clarification.
- The Buildx example used unsupported image output attributes for direct encryption. Replaced it with a build-and-push step followed by Skopeo encryption, which is supported by official Skopeo documentation.
- The monitoring example queried `/metrics` for a non-standard `image_decrypt` metric. Updated it to use containerd's documented `/v1/metrics` endpoint when metrics are enabled, and changed encrypted layer verification to `ctr-enc images layerinfo`.
- The key rotation script moved the old key into an archive directory that might not exist. Added `mkdir -p /etc/containerd/keys/archive`.

## Review Notes
The DaemonSet-based key distribution example is technically plausible but operationally sensitive because it copies private keys onto every node using a privileged pod and hostPath. A production implementation should use a dedicated node bootstrap, attestation, or secret distribution process with tighter access controls.
