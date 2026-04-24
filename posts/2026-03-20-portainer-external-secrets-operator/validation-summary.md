# Validation Summary: How to Use External Secrets Operator with Portainer on Kubernetes (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- External Secrets Operator
- Helm
- AWS Secrets Manager
- HashiCorp Vault

## Sources Consulted
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator ExternalSecret reference: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS Secrets Manager provider docs: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator HashiCorp Vault provider docs: https://external-secrets.io/v2.0.0/provider/hashicorp-vault/
- Portainer ConfigMaps & Secrets documentation: https://docs.portainer.io/sts/user/kubernetes/configurations
- Kubernetes Secrets concept documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes secret consumption as environment variables: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/

## Issues Found
- The manifests used the older `external-secrets.io/v1beta1` API. I updated the `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`, which is the current documented API.
- Two code comments referred to `SecretStore` while the manifests actually defined `ClusterSecretStore`. I corrected the comments to match the resources being created.
- The Portainer monitoring note pointed to the synced Kubernetes Secret while describing it as `ExternalSecret` status. I corrected the wording and updated the Portainer UI path to the current `ConfigMaps & Secrets > Secrets` section.
- The sync-monitoring example relied on a generic events filter. I replaced it with a direct `kubectl get externalsecrets ... -w` watch command, which more reliably tracks the `ExternalSecret` resource itself.
- The automatic rotation example used a Vault path pattern associated with dynamic secrets (`database/creds/...`) even though ESO's Vault provider supports the KV secrets engine. I changed the example to a KV-compatible secret path and clarified that ESO is syncing secrets after they are rotated externally.
- The workload section implied secret updates would be consumed uniformly. I added the Kubernetes caveat that Secret volumes refresh in-place, but environment variables do not pick up updated Secret values until the pod restarts.

## Review Notes
- The static AWS access keys and Vault token examples are technically valid, but production deployments often prefer cloud-native and short-lived auth methods such as IAM roles for service accounts or Vault Kubernetes auth.
- The Helm install command remains valid as written. Current ESO documentation notes that CRDs are installed by default, so `--set installCRDs=true` is explicit rather than strictly required on new installs.
