# Validation Summary: How to Use Flux CD ResourceSets for Dynamic Resource Generation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux Operator ResourceSet API
- Flux Operator ResourceSetInputProvider API
- Flux Kustomization API
- Kubernetes workloads and networking resources
- External Secrets Operator
- Go templates
- kubectl

## Sources Consulted
- Flux Operator ResourceSet CRD documentation: https://fluxoperator.dev/docs/crd/resourceset/
- Flux Operator ResourceSetInputProvider CRD documentation: https://fluxoperator.dev/docs/crd/resourcesetinputprovider/
- Flux Operator ResourceSets application definitions guide: https://fluxoperator.dev/docs/resourcesets/app-definition/
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator CLI documentation: https://fluxoperator.dev/docs/guides/cli/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/

## Issues Found
- The post described ResourceSets as a Flux CD v2.4 feature with a separate ResourceSet controller. Updated the wording and prerequisites to identify the API as part of Flux Operator.
- The ResourceSet examples used unsupported `inputs.name`, `inline`, `configMapRef`, and `secretRef` shapes. Updated inline examples to use direct `spec.inputs` entries and changed external input examples to use `ResourceSetInputProvider` with `spec.type: Static` and `spec.defaultValues`.
- The examples used `{{ .field }}` template syntax. Updated them to the documented ResourceSet template syntax, such as `<< inputs.field >>`.
- Conditional examples used an unsupported `fluxcd.io/skip` annotation. Replaced it with the documented `fluxcd.controlplane.io/reconcile` annotation set to `enabled` or `disabled`.
- The Secret-input section implied ResourceSets can read arbitrary Secret JSON as input. Reworked it to generate ExternalSecret resources and keep sensitive values in the external secret store.
- Monitoring examples referenced a non-existent `.status.generatedResources` field and `resourceset-controller` deployment. Updated them to use `.status.inventory.entries` and the `flux-operator` deployment.
- Troubleshooting examples referenced ConfigMap and Secret input validation that no longer matched the corrected ResourceSet API. Updated them to check ResourceSetInputProvider objects and to use `flux-operator build rset`.

## Review Notes
The `flux-operator` CLI was not installed in the local workspace, so local template rendering with `flux-operator build rset` could not be executed. The corrected examples were reviewed against current official Flux Operator documentation.
