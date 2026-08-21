# Validation Summary: How to Share Cert-Manager with vCluster Using Generic CRD Sync

## Status

validated

## Post Type

Technical tutorial / Kubernetes integration guide

## Technologies Covered

- vCluster 0.36 on shared nodes
- cert-manager and the stable `cert-manager.io/v1` API
- Kubernetes CustomResourceDefinitions, Issuers, Certificates, CertificateRequests, and Secrets
- vCluster generic custom-resource synchronization and reference patches
- `vcluster` and `kubectl` command-line tools
- X.509 certificates and TLS Secrets

## Sources Consulted

- [vCluster 0.36 custom-resource synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/custom-resources) - verified the host-CRD prerequisite, CRD copying, version selection, one-version limit, namespace scope, child-resource detection, and configuration keys.
- [vCluster 0.36 sync patching](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching) - verified reference-patch syntax, mapper requirements, path semantics, and name translation.
- [vCluster 0.36 sync-to-host overview](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/) - verified default Secret synchronization and management-label behavior.
- [vCluster 0.36 cert-manager integration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/integrations/cert-manager) - verified Enterprise availability, shared-node support, default resource directions, generated-Secret handling, and the `clusterIssuers.selector.labels` schema.
- [vCluster 0.36 `vcluster create` reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create) - verified `--namespace`, `--upgrade`, `--connect=false`, and `--values`.
- [vCluster v0.36.0 configuration types](https://github.com/loft-sh/vcluster/blob/v0.36.0/config/config.go), [validation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/config/validation.go), [mapping recorder](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/mappings/generic/recorder.go), and [Secret syncer](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/secrets/to_host_syncer.go) - cross-checked the released schema, namespaced-only validation, reference mappings, and generated-Secret return path.
- [cert-manager Certificate documentation](https://cert-manager.io/docs/usage/certificate/), [API reference](https://cert-manager.io/docs/reference/api-docs/), and [CertificateRequest documentation](https://cert-manager.io/docs/usage/certificaterequest/) - verified the `cert-manager.io/v1` manifests, Issuer scope, target Secret, status, and issuance flow.
- [cert-manager SelfSigned documentation](https://cert-manager.io/docs/configuration/selfsigned/) - verified the issuer configuration, trust caveat, and requirement for a non-empty Subject DN on a valid self-signed certificate.
- [cert-manager CA](https://cert-manager.io/docs/configuration/ca/), [ACME](https://cert-manager.io/docs/configuration/acme/), and [Vault](https://cert-manager.io/docs/configuration/vault/) issuer documentation - verified that production Issuer configurations can contain additional namespaced Secret and other resource references that require translation.
- [cert-manager v1.21.1 CertificateRequest creation](https://github.com/cert-manager/cert-manager/blob/v1.21.1/pkg/controller/certificates/requestmanager/requestmanager_controller.go) and [TLS Secret handling](https://github.com/cert-manager/cert-manager/blob/v1.21.1/pkg/controller/certificates/issuing/internal/secret.go) - verified label inheritance for CertificateRequests and the lack of automatic Certificate-label inheritance on generated Secrets.
- Kubernetes [`kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/), [`kubectl api-resources`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/), [JSONPath](https://kubernetes.io/docs/reference/kubectl/jsonpath/), and [storage-version migration](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/storage-version-migration/) documentation - verified the commands, condition wait, JSONPath, and CRD storage-version check.

## Issues Found

1. The SelfSigned smoke-test Certificate omitted a Subject DN. cert-manager documents that this leaves the issuer DN empty and makes the resulting self-signed X.509 certificate technically invalid. Added `spec.subject.organizations` so the example produces a non-empty Subject and Issuer DN.
2. The production guidance suggested replacing the SelfSigned Issuer with CA, ACME, Vault, or another Issuer without accounting for their additional namespaced references. Added a requirement to configure reference patches and synchronization for every referenced kind before applying another Issuer configuration, preventing untranslated Secret or other object names from resolving to missing or unintended host resources.
3. The host verification command selected Issuers, Certificates, CertificateRequests, and Secrets by `vcluster.loft.sh/managed-by`, but cert-manager's generated TLS Secret does not automatically inherit the Certificate's labels. Changed the command to use the management label for the tenant-origin objects, display each translated `spec.secretName`, and direct the reader to retrieve the exact Secret through that name and namespace.

## Review Notes

- The generic custom-resource YAML, versioned CRD keys, and both reference patches are valid for vCluster 0.36. Generic to-host custom-resource synchronization remains limited to namespaced resources, so the post correctly excludes tenant-created `ClusterIssuer` objects.
- The built-in cert-manager integration is an Enterprise feature in vCluster 0.36. Generic custom-resource sync and sync patches are listed in the vCluster Platform Free tier; open-source and plan availability should still be checked against the current feature matrix as the post advises.
- cert-manager does not add an owner reference to the final TLS Secret by default. The reference mapping supplies the important Secret relationship here, and the post correctly recommends testing child-resource return against pinned versions before treating it as a platform contract.
- The post targets cert-manager's stable v1 API rather than a specific cert-manager release. The current v1.21.1 implementation and current official documentation were used for implementation-specific checks.
- All five links in the post's Official Documentation section resolved successfully on 2026-08-21.
