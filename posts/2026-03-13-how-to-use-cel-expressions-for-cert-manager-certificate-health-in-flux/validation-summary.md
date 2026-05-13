# Validation Summary: How to Use CEL Expressions for Cert-Manager Certificate Health in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization health checks
- Flux CEL health check expressions
- Kubernetes custom resources
- cert-manager Certificates and ClusterIssuers
- ACME HTTP-01 challenge solver configuration
- kubectl and Flux CLI troubleshooting commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes kubectl `get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl `logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager ACME configuration documentation: https://cert-manager.io/docs/configuration/acme/

## Issues Found
- Flux CEL health check snippets incorrectly nested `cel.healthyWhen` under individual `healthChecks` entries. Flux uses `spec.healthCheckExprs` with `current`, `inProgress`, and `failed` expressions, evaluated when `wait` or `healthChecks` are specified. Updated the snippets to keep `healthChecks` as resource references and define the CEL checks under `healthCheckExprs`.
- The revision example claimed to check that a Certificate revision is at least a certain value, but the expression only checked that `status.revision` existed. Updated the CEL expression to compare `status.revision >= 2` after guarding with `has(status.revision)`.
- The ClusterIssuer ACME HTTP-01 solver example used `ingress.class: nginx`. Current cert-manager documentation uses `ingress.ingressClassName: nginx` for Kubernetes Ingress class selection. Updated the field accordingly.

## Review Notes
- The YAML snippets were parsed successfully after the corrections.
- The local environment did not have `flux` or `kubectl` installed, so CLI verification was performed against official Flux and Kubernetes command documentation rather than local `--help` output.
