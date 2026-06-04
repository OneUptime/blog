# Validation Summary: How to Add Custom Printer Columns to CRDs for kubectl Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CustomResourceDefinition (CRD) API `apiextensions.k8s.io/v1`
- `kubectl get`
- Kubernetes JSONPath
- Server-side Table output / additional printer columns

## Sources Consulted
- Kubernetes API reference: CustomResourceDefinition `apiextensions.k8s.io/v1` - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes task guide: Extend the Kubernetes API with CustomResourceDefinitions, Additional printer columns - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#additional-printer-columns
- Kubernetes API concepts: Table fetches - https://kubernetes.io/docs/reference/using-api/api-concepts/#receiving-resources-as-tables
- Kubernetes reference: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The "Date with full timestamp" example implied that `type: date` prints a full timestamp. Kubernetes documents `date` printer columns as rendering differentially as time since the timestamp, so the label was changed to "Date for another timestamp field."
- The Application CRD example declared the `Replicas` printer column as `type: string` while pointing at `.status.availableReplicas`, which the schema defines as an integer. Kubernetes omits values that do not match the declared column type, so the column type was corrected to `integer` and the description was narrowed to "Available replicas."
- The best-practices section said printer column descriptions appear in `kubectl explain`. The API reference defines them as human-readable descriptions for Table column definitions, while `kubectl explain` documents resource fields from OpenAPI. The wording was corrected to say they are included in API server Table column definitions.

## Review Notes
The examples use the current `apiextensions.k8s.io/v1` CRD API and place `additionalPrinterColumns` under `spec.versions[*]`, which matches current Kubernetes documentation. Priority behavior, supported column types, JSONPath field access, and default CRD output behavior were consistent with the official docs.
