# Validation Summary: How to Configure SPIFFE/SPIRE for Service Identity

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SPIFFE
- SPIRE
- Kubernetes
- Helm
- SPIRE Controller Manager and ClusterSPIFFEID CRDs
- SPIFFE Workload API and X.509-SVIDs
- go-spiffe
- Envoy SDS and mTLS
- PrometheusRule monitoring

## Sources Consulted
- SPIFFE Helm Charts Hardened installation documentation: https://spiffe.io/docs/latest/spire-helm-charts-hardened-about/installation/
- SPIFFE Helm Charts Hardened identifiers documentation: https://spiffe.io/docs/latest/spire-helm-charts-hardened-about/identifiers/
- SPIFFE Helm Charts Hardened chart source and values: https://github.com/spiffe/helm-charts-hardened
- SPIRE workload registration documentation: https://spiffe.io/docs/latest/deploying/registering/
- SPIRE Kubernetes quickstart: https://spiffe.io/docs/latest/try/getting-started-k8s/
- SPIRE Server configuration reference: https://spiffe.io/docs/latest/deploying/spire_server/
- SPIRE Agent configuration reference: https://spiffe.io/docs/latest/deploying/spire_agent/
- SPIRE Controller Manager ClusterSPIFFEID CRD documentation: https://github.com/spiffe/spire-controller-manager/blob/main/docs/clusterspiffeid-crd.md
- SPIFFE CSI Driver documentation: https://github.com/spiffe/spiffe-csi
- go-spiffe tlsconfig package documentation: https://pkg.go.dev/github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig
- go-spiffe spiffeid package documentation: https://pkg.go.dev/github.com/spiffe/go-spiffe/v2/spiffeid
- SPIFFE Envoy X.509/SDS documentation: https://spiffe.io/docs/latest/microservices/envoy/

## Issues Found
- The Helm values used non-current or incorrect keys such as top-level `trustDomain`, `server.dataStorage`, `server.ca`, `server.nodeAttestor.k8s`, `controller.enabled`, and `oidcDiscovery`. Updated the snippets to match the current hardened chart structure, including `global.spire`, `spire-server`, `spire-agent`, `spiffe-csi-driver`, and `spiffe-oidc-discovery-provider`.
- The install commands used separate `spire-server` and `spire-agent` chart installs. Updated them to install `spire-crds` and the integrated `spire` chart, which is the documented hardened-chart installation path.
- The server example scaled to two replicas while using the default SQLite datastore. Changed the example to one replica and noted that an external datastore is required before scaling out.
- Workload registration used a freshly generated `uuidgen` value in the `-parentID`, which would not match an existing attested agent identity. Added a node entry and changed workload entries to use the registered agent SPIFFE ID as the parent.
- The SPIRE Server pod selector still used the old chart label. Updated it to the `server` label used by the corrected chart values.
- The CSI example described mounting SVID files directly. The SPIFFE CSI driver mounts the Workload API socket, so the pod example, environment variable, volume names, and text were corrected.
- The Go example imported unused packages and would not compile. Removed unused imports and added a guard before indexing URI SANs from peer certificates.
- The Envoy SDS socket path was updated to match the Workload API socket mount used elsewhere in the post.
- The federation example exposed a bundle endpoint without a required profile. Added `profile "https_spiffe" {}`.

## Review Notes
- Helm and Go were not installed in the local environment, so command compilation and chart rendering could not be performed locally. The review used current official documentation and published chart source instead.
- The monitoring metric names are plausible but should be verified against the exact SPIRE telemetry configuration used in a real deployment.
