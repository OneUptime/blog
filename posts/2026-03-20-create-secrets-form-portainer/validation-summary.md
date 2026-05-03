# Validation Summary: How to Create Secrets via Form in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes UI)
- Kubernetes Secrets
- kubectl CLI
- YAML (Kubernetes manifests)
- Base64 encoding
- RBAC (briefly mentioned)

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret types reference: https://kubernetes.io/docs/concepts/configuration/secret/#secret-types
- kubectl create secret reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-em-
- kubectl create secret generic: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- Using Secrets as environment variables: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Portainer Kubernetes ConfigMaps & Secrets docs: https://docs.portainer.io/user/kubernetes/configurations
- Verified base64 encodings locally with `printf | base64`

## Issues Found
No technical issues found.

Verification details:
- All three base64 encodings in the YAML example were verified locally and match exactly:
  - `myapp_user` → `bXlhcHBfdXNlcg==` ✓
  - `s3cur3p@ssw0rd!` → `czNjdXIzcEBzc3cwcmQh` ✓
  - `myapp_production` → `bXlhcHBfcHJvZHVjdGlvbg==` ✓
- Listed Secret types (`Opaque`, `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`, `kubernetes.io/ssh-auth`) are all valid built-in types per the Kubernetes documentation.
- `kubectl create secret generic --from-literal=...` and `--from-file=...` flags are correct.
- The Deployment snippet correctly uses `secretKeyRef` for a single key and `envFrom` + `secretRef` for all keys.
- The `kubectl get secret ... -o jsonpath='{.data}' | jq 'keys'` command is valid and prints only the secret keys (not values).

## Review Notes
- The post correctly notes Secrets are base64-encoded; readers should remember base64 is encoding, not encryption. Encryption-at-rest in etcd requires explicit configuration via an EncryptionConfiguration resource — not strictly in scope for this Portainer-focused tutorial, but worth knowing.
- For TLS-typed secrets specifically, `kubectl create secret tls <name> --cert=... --key=...` is the more idiomatic command than `kubectl create secret generic --from-file=...`. The post's `generic` example for SSH/cert files is still valid, and the post does not claim it as the only approach.
- The Secret Types table is a representative subset; other built-in types exist (`kubernetes.io/basic-auth`, `kubernetes.io/service-account-token`, `bootstrap.kubernetes.io/token`, etc.), but the omission is not an error for an introductory tutorial.
- Portainer's UI labels ("ConfigMaps & Secrets", "Add Secret", "Create Secret") match current Portainer documentation for the Kubernetes module.
