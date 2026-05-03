# Validation Summary: How to Create Secrets via YAML Manifest in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes management UI)
- Kubernetes Secrets (Opaque, kubernetes.io/tls, kubernetes.io/dockerconfigjson)
- YAML manifests
- kubectl CLI
- Base64 encoding

## Sources Consulted
- Kubernetes Secrets official documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl create secret reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-em-
- kubectl create secret tls: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- kubectl create secret docker-registry: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- TLS secrets type reference: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- Docker config secrets type reference: https://kubernetes.io/docs/concepts/configuration/secret/#docker-config-secrets
- Portainer Kubernetes ConfigMaps & Secrets docs: https://docs.portainer.io/user/kubernetes/applications/secrets

## Issues Found
No technical issues found.

- The `stringData` vs `data` semantics are accurately described — `data` requires base64-encoded values; `stringData` accepts plain text and Kubernetes encodes it server-side. When both are provided for the same key, `stringData` wins.
- Base64 examples were verified locally: `echo -n "mypassword" | base64` produces `bXlwYXNzd29yZA==`, and `echo -n "myapikey-12345-abcde" | base64` produces `bXlhcGlrZXktMTIzNDUtYWJjZGU=`. Both match the post.
- Secret types `kubernetes.io/tls` (with required `tls.crt` and `tls.key` fields) and `kubernetes.io/dockerconfigjson` (with `.dockerconfigjson` key) are correct.
- `kubectl create secret tls` and `kubectl create secret docker-registry` flags (`--cert`, `--key`, `--docker-server`, `--docker-username`, `--docker-password`, `--dry-run=client`, `-o yaml`) are valid and current.
- Portainer's "ConfigMaps & Secrets" navigation path and YAML editor mode are accurate.

## Review Notes
- The `-n` flag on `echo` is correctly used to avoid encoding a trailing newline — this is the most common pitfall with manual base64 encoding for Secrets, and the post handles it correctly.
- `stringData` values are not part of the Secret's stored representation; the API server merges them into `data` on write. This is implicit in the post and doesn't need elaboration.
- For TLS Secrets, Kubernetes additionally validates the cert/key pair on creation in recent versions; failures will surface as a clear API error if the inputs are malformed.
- For `dockerconfigjson`, the post correctly recommends generating the YAML via `kubectl create secret docker-registry --dry-run=client -o yaml` rather than hand-crafting the JSON, which is the lowest-friction approach.
