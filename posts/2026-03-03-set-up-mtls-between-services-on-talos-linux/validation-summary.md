# Validation Summary: How to Set Up mTLS Between Services on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- mTLS
- Linkerd
- Istio
- cert-manager
- NGINX
- SPIFFE/SPIRE
- Helm
- curl

## Sources Consulted
- Linkerd automatic mTLS documentation: https://linkerd.io/2.10/features/automatic-mtls/
- Linkerd mTLS validation documentation: https://linkerd.io/2.11/tasks/validating-your-traffic/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- SPIFFE Helm charts installation documentation: https://spiffe.io/docs/latest/spire-helm-charts-hardened-about/installation/
- Talos Linux philosophy documentation: https://www.talos.dev/v1.10/learn-more/philosophy/
- Talos Linux architecture documentation: https://www.talos.dev/v1.10/learn-more/architecture/
- Talos Linux disk encryption documentation: https://www.talos.dev/latest/talos-guides/configuration/disk-encryption/
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The Linkerd `edges` example omitted the required resource type. Changed `linkerd viz edges -n default` to `linkerd viz edges deployment -n default`, matching the Linkerd Viz CLI and mTLS validation documentation.
- The Linkerd `tap` examples used `deployment/...`; updated them to `deploy/...` to match the resource type style shown in Linkerd's current examples.
- The Istio `PeerAuthentication` example used `security.istio.io/v1beta1`. Updated it to `security.istio.io/v1`, which is the current API version in Istio's official documentation.
- The application-level mTLS example curled `https://api-server.default.svc.cluster.local` but did not define a Kubernetes Service named `api-server`. Added a ClusterIP Service selecting the `api-server` pods on port 443.
- The SPIRE Helm example installed only the main `spire` chart. Updated it to install the `spire-crds` chart first, followed by the `spire` chart, matching SPIFFE's current Helm chart installation documentation.
- The Talos Linux security benefits included absolute claims about preventing certificate tampering and credential extraction, and implied etcd secret encryption was always active. Reworded these claims to reflect Talos' immutable/no-shell model and Kubernetes secrets encryption at rest more accurately.

## Review Notes
- The cert-manager CA issuer example is valid when cert-manager's Cluster Resource Namespace is the default `cert-manager` namespace. If an operator changes `--cluster-resource-namespace`, the CA Secret must live in that configured namespace.
- The CA issuer approach is suitable for examples and controlled internal PKI setups, but cert-manager notes that production CA operation requires planning for rotation, trust distribution, and disaster recovery.
