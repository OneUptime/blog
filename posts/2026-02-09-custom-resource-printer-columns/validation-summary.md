# Validation Summary: How to Implement Custom Resource Printer Columns and AdditionalPrinterColumns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinition (CRD)
- `additionalPrinterColumns`
- Kubernetes JSONPath
- `kubectl get`
- Kubebuilder / controller-gen markers

## Sources Consulted
- Kubernetes CRD task documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes deprecated API migration guide for CRD `jsonPath` field casing: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubebuilder marker documentation: https://book.kubebuilder.io/reference/markers.html
- Kubebuilder CRD generation marker documentation: https://book.kubebuilder.io/reference/generating-crd.html
- Kubernetes CRD table conversion source: https://github.com/kubernetes/apiextensions-apiserver/blob/master/pkg/registry/customresource/tableconvertor/tableconvertor.go
- Kubernetes CLI table printer source: https://github.com/kubernetes/cli-runtime/blob/master/pkg/printers/tableprinter.go

## Issues Found
- The post said wildcard array JSONPath values are joined with commas. Kubernetes CRD table conversion only uses a scalar cell value for each additional printer column and does not provide comma-joined wildcard output for CRD columns, so I changed the example to select a specific array element and advised exposing a summary field for arrays.
- The post labeled `.spec.enabled` as "Conditional access with default", but that JSONPath only reads an optional field and does not define a default. I changed the label to "Access optional fields".
- The wide-output example used `-` for missing `Endpoint` and `Backup` values. Missing CRD printer column values render as empty cells, so I updated the example output.
- The Kubebuilder marker block had a blank line before the `Application` type. Kubebuilder/controller-gen markers should be attached directly to the Go type, so I removed the blank line.
- The post said missing JSONPath values show `<none>`. For CRD printer columns, missing values are omitted from the table cell, so I changed this to say kubectl leaves the cell empty.

## Review Notes
The examples use `apiextensions.k8s.io/v1`, lowercase `jsonPath`, version-scoped `additionalPrinterColumns`, supported OpenAPI column types, and `priority` behavior consistent with current Kubernetes documentation. `kubectl` was not installed in the workspace, so CLI behavior was validated against official Kubernetes documentation and Kubernetes source code.
