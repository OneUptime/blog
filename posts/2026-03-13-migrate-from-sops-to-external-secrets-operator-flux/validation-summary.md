# Validation Summary: How to Migrate from SOPS to External Secrets Operator with Flux

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets and kubectl
- External Secrets Operator
- SOPS
- AWS Secrets Manager and AWS CLI
- HashiCorp Vault CLI
- jq
- Git

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API overview: https://external-secrets.io/v1.0.0/introduction/overview/
- External Secrets Operator ownership and deletion policy guide: https://external-secrets.io/v0.17.0/guides/ownership-deletion-policy/
- AWS CLI `secretsmanager create-secret` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI `secretsmanager get-secret-value` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- HashiCorp Vault `kv put` command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/put
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- SOPS documentation: https://github.com/getsops/sops
- jq manual: https://jqlang.org/manual/

## Issues Found
- The AWS upload example used `kubectl get -f -`, which reads live cluster objects rather than converting the decrypted manifest locally. Changed it to `kubectl create --dry-run=client -f - -o json` so the command works from the decrypted YAML input.
- The AWS upload example produced arbitrary decoded Secret keys while the `ExternalSecret` later referenced `property: password`. Changed the jq filter to upload a JSON object with a `password` property.
- The Vault upload example used `vault kv put secret/myapp/api -`, but Vault documents stdin usage as a value for a specific key, such as `key=-`. Changed the example to decode `api-key` and pass it as `api-key="$api_key"`.
- The ExternalSecret manifests used `external-secrets.io/v1beta1`. Updated them to the current documented `external-secrets.io/v1` API.
- The validation command only displayed the Kubernetes Secret value and did not compare it with the provider value. Added an AWS Secrets Manager `get-secret-value` command so the reader can compare the external value and synced Kubernetes value.
- The Flux cleanup step deleted the `GitRepository` source and re-ran bootstrap. Flux SOPS decryption is configured on Kustomization `.spec.decryption`, not on the Git source. Replaced the command with a Kustomization snippet showing the decryption block to remove after migration.
- The best-practice wording said `creationPolicy: Merge` avoids conflicts between SOPS and ESO. Clarified that `Merge` expects the Secret to already exist and that values should match before cutover.

## Review Notes
The post is technically relevant and useful after the fixes. The guide still assumes AWS Secrets Manager for the concrete validation command; readers using Vault or another provider will need the equivalent provider-specific read command.
