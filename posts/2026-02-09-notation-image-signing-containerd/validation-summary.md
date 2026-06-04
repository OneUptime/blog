# Validation Summary: How to Use Container Image Signing with Notation and containerd in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd
- Notation CLI
- Notary Project specifications
- OCI registries and artifacts
- Docker
- Kubernetes admission webhooks

## Sources Consulted
- Notation quickstart: https://notaryproject.dev/docs/quickstart-guides/quickstart-sign-image-artifact/
- Notation CLI installation guide: https://notaryproject.dev/docs/user-guides/installation/cli/
- Notation plugin management guide: https://notaryproject.dev/docs/user-guides/how-to/plugin-management/
- Notation command specifications for `sign`, `verify`, `list`, `key`, and `certificate`: https://github.com/notaryproject/notation/tree/main/specs/cmd
- Notary Project trust store and trust policy specification: https://github.com/notaryproject/specifications/blob/main/specs/trust-store-trust-policy.md
- containerd image verifier documentation: https://github.com/containerd/containerd/blob/main/docs/image-verification.md
- containerd 2.0 documentation for image verifier plugins: https://github.com/containerd/containerd/blob/main/docs/containerd-2.0.md
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Kubernetes admission webhook documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The Notation install example used v1.0.0 and did not verify the release checksum. Updated it to v1.3.2 and added checksum verification for the downloaded Linux archive.
- The `notation cert ls` sample output and certificate path were inaccurate for current Notation output. Updated the example to show store type, store name, and certificate file.
- The Azure Key Vault example used an invalid `notation cert add` argument order and did not mark the remote key as default. Corrected the command syntax.
- The signing section ran `notation verify` without first configuring a trust policy. Added a minimal trust policy and `notation policy import` step.
- The containerd section referenced a nonexistent or unsupported `notation-containerd` release and invalid CRI `image_verifier` configuration fields. Replaced it with containerd's official bindir image verifier configuration and a verifier script that calls `notation verify`.
- The containerd version requirement was inaccurate. Updated it to containerd 2.1 or later for Kubernetes CRI pulls through the transfer service image verifier path.
- The certificate copy instructions used a nonexistent `~/.config/notation/certificate.pem` path. Replaced them with `NOTATION_CONFIG=/etc/containerd/notation notation cert add` and `notation policy import`.
- The trust policy identity example assumed an exact certificate subject for the test certificate. Replaced it with `*` so the example trusts identities issued by the configured trust store without depending on subject formatting.

## Review Notes
The webhook example is structurally valid as a Kubernetes `ValidatingWebhookConfiguration`, but it is only a registration object. A real deployment still needs the backing webhook service implementation that performs Notation verification.
