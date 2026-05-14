# Validation Summary: How to Deploy SPIFFE/SPIRE with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- SPIFFE
- SPIRE
- SPIFFE hardened Helm charts
- SPIRE Controller Manager
- SPIFFE CSI Driver
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes Deployments, ServiceAccounts, CSI inline volumes, and Pod Security Standards

## Sources Consulted
- SPIFFE Helm Charts Hardened documentation: https://spiffe.io/docs/latest/spire-helm-charts-hardened-about/
- SPIFFE hardened Helm chart repository and chart values: https://github.com/spiffe/helm-charts-hardened
- SPIRE Controller Manager ClusterSPIFFEID CRD: https://github.com/spiffe/spire-controller-manager
- SPIRE Controller Manager ClusterFederatedTrustDomain CRD: https://github.com/spiffe/spire-controller-manager
- SPIRE Agent command reference: https://spiffe.io/docs/latest/deploying/spire_agent/
- SPIRE Server command reference: https://spiffe.io/docs/latest/deploying/spire_server/
- SPIFFE CSI Driver documentation: https://pkg.go.dev/github.com/spiffe/spiffe-csi
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes CSI ephemeral volume documentation: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/

## Issues Found
- The Helm chart version and several values were outdated or invalid for the current SPIFFE hardened chart. Updated the chart selector to `0.28.x` and corrected values such as `replicaCount`, PostgreSQL datastore fields, `caKeyType`, `caTTL`, `nodeAttestor.k8sPSAT`, `workloadAttestors`, and `persistence.type`.
- The guide described the CSI driver as mounting SVID certificates. The SPIFFE CSI driver mounts the Workload API socket, so the architecture diagram, chart comment, verification text, and conclusion were corrected.
- The repository structure described separate server and agent HelmRelease files, but the SPIFFE `spire` chart is an integrated chart. Updated the structure and HelmRelease example to use a single `helmrelease.yaml` with release name `spire`.
- The workload referenced `serviceAccountName: my-secure-app` without creating that ServiceAccount. Added the ServiceAccount to the example manifest.
- The federation example described `trustDomainBundle` as a refresh interval. The CRD defines it as optional bundle contents, so the comment was corrected.
- The Flux Kustomization used `wait: true` together with explicit `healthChecks`. Flux ignores `healthChecks` when `wait` is true, so the snippet now relies on `wait: true`.
- Verification and troubleshooting selectors used labels that do not match the current chart defaults for a `spire` release. Updated them to select `app.kubernetes.io/instance=spire` with `app.kubernetes.io/name=server` or `agent`.
- The SPIRE agent healthcheck command omitted the configured socket path. Added `-socketPath /run/spire/agent-sockets/spire-agent.sock`.

## Review Notes
The examples now align with the current SPIFFE hardened chart schema and Flux APIs. The PostgreSQL example assumes the `spire-postgres-credentials` Secret and the PostgreSQL service already exist; a future post could add that setup explicitly.
