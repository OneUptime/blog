# Validation Summary: How to Use GCP Certificate Manager with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Certificate Manager
- Google Cloud Load Balancing
- Google Kubernetes Engine
- GKE Gateway API
- Istio Gateway
- Certificate Authority Service
- cert-manager
- Google CAS issuer
- Helm

## Sources Consulted
- Google Cloud Certificate Manager overview: https://docs.cloud.google.com/certificate-manager/docs/overview
- Google Cloud Certificate Manager certificate management: https://docs.cloud.google.com/certificate-manager/docs/certificates
- Google Cloud Certificate Manager DNS authorizations: https://cloud.google.com/certificate-manager/docs/dns-authorizations
- Google Cloud Certificate Manager certificate maps: https://cloud.google.com/certificate-manager/docs/maps
- Google Cloud SDK target HTTPS proxy reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- GKE standalone NEGs: https://cloud.google.com/kubernetes-engine/docs/how-to/standalone-neg
- GKE Gateway API deployment and Certificate Manager annotation: https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- GKE Gateway security with Certificate Manager: https://cloud.google.com/kubernetes-engine/docs/how-to/secure-gateway
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Google Cloud CA Service root CA creation: https://cloud.google.com/certificate-authority-service/docs/creating-root-ca
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- Google CAS issuer documentation: https://github.com/cert-manager/google-cas-issuer

## Issues Found
- Corrected the Certificate Manager overview to describe CA Service issuance as a Google-managed certificate option rather than a separate top-level certificate type.
- Added a DNS authorization for `api.example.com`; Certificate Manager DNS authorizations cover a single domain, so the original two-domain certificate example was incomplete.
- Changed the GKE standalone NEG annotation from service port `8080` to service port `80`, matching GKE's `exposed_ports` requirement for Service ports.
- Corrected Istio Gateway selectors from `selector.matchLabels` to the valid `selector` map format used by `networking.istio.io/v1` Gateway.
- Changed the HTTP Istio Gateway port from `8080` to `80` to align with the default Istio ingress gateway Service port used by the NEG example.
- Clarified that the GKE Gateway API example still needs HTTPRoute resources to route traffic to a backend Service.
- Added `--auto-enable` to the CA Service root CA creation command so the CA can issue certificates without relying on an interactive enable prompt.
- Updated the cert-manager Helm install command to the current OCI chart pattern with `crds.enabled=true`.
- Replaced the old Google CAS issuer manifest URL with the current Helm chart installation method and added Workload Identity/IAM binding commands needed for the issuer to request certificates.

## Review Notes
- The manual load balancer example is intentionally minimal and still assumes the reader creates the required firewall rules, static IP address if desired, and one backend per NEG zone.
- The Google CAS issuer project documents that it is in maintenance mode, but the APIs and install path used here remain valid.
