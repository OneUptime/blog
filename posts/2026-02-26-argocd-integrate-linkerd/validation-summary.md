# Validation Summary: How to Integrate ArgoCD with Linkerd Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Linkerd
- Linkerd Helm charts
- Linkerd ServiceProfile, HTTPRoute, Server, AuthorizationPolicy, and MeshTLSAuthentication resources
- cert-manager
- Smallstep step CLI

## Sources Consulted
- Linkerd Helm installation documentation: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd certificate generation documentation: https://linkerd.io/2.16/tasks/generate-certificates/
- Linkerd Service Profiles documentation: https://linkerd.io/2/features/service-profiles/
- Linkerd Traffic Split and traffic shifting documentation: https://linkerd.io/2-edge/features/traffic-split/ and https://linkerd.io/2-edge/tasks/traffic-shifting/
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd automatic control-plane TLS rotation with cert-manager: https://linkerd.io/2.16/tasks/automatically-rotating-control-plane-tls-credentials/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD server-side diff documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diff-strategies/
- Argo CD custom health check documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/health/
- Linkerd edge Helm chart index and chart CRDs: https://helm.linkerd.io/edge/index.yaml

## Issues Found
- The install section omitted Linkerd's Gateway API prerequisite. Added a note that clusters without Gateway API CRDs should install them before the Linkerd Helm charts.
- The traffic shifting section used deprecated SMI TrafficSplit resources and did not define the backend Services referenced by the split. Updated the example to Linkerd's current HTTPRoute-based traffic shifting pattern and added stable/canary Service manifests.
- The Argo CD health customizations referenced TrafficSplit and ServerAuthorization after the post moved to current Linkerd policy resources. Updated the health examples for HTTPRoute, AuthorizationPolicy, and MeshTLSAuthentication.
- The ServiceProfile section did not mention that ServiceProfiles are now backward-compatibility resources. Added a short caveat that Gateway API resources are preferred for new Linkerd configurations.
- The authorization example used ServerAuthorization v1alpha1. Updated it to Server v1beta3 with AuthorizationPolicy and MeshTLSAuthentication.
- The cert-manager Certificate referenced a ClusterIssuer that was not defined and did not set private key rotation policy. Added a namespaced Issuer using the earlier trust-anchor secret, changed issuerRef.kind to Issuer, and added privateKey.rotationPolicy: Always.

## Review Notes
The Linkerd chart versions pinned to 2024.11.1 exist in the official edge Helm repository. YAML snippets were parsed successfully after edits. Helm, linkerd, and argocd CLIs were not installed locally, so validation used official documentation, the live Linkerd Helm index, downloaded chart CRDs, and YAML parsing rather than live cluster rendering.
