# Validation Summary: How to Set Up mTLS on a GCP External Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud global external Application Load Balancer
- Google Cloud Certificate Manager TrustConfig
- Google Cloud Network Security ServerTlsPolicy
- Google Cloud Certificate Authority Service
- Mutual TLS (mTLS)
- OpenSSL
- curl
- Python Flask

## Sources Consulted
- Google Cloud Load Balancing: Set up frontend mTLS with user-provided certificates: https://cloud.google.com/load-balancing/docs/https/setting-up-mtls-ccm
- Google Cloud Load Balancing: Mutual TLS overview: https://cloud.google.com/load-balancing/docs/mtls
- Google Cloud Load Balancing: Create custom headers in backend services: https://cloud.google.com/load-balancing/docs/https/custom-headers
- Google Cloud Certificate Manager: Manage trust configs: https://cloud.google.com/certificate-manager/docs/trust-configs
- Google Cloud Certificate Manager REST: TrustConfig resource schema: https://cloud.google.com/certificate-manager/docs/reference/certificate-manager/rest/v1/projects.locations.trustConfigs
- Google Cloud SDK: gcloud certificate-manager trust-configs import reference: https://cloud.google.com/sdk/gcloud/reference/certificate-manager/trust-configs/import
- Google Cloud SDK: gcloud network-security server-tls-policies reference: https://cloud.google.com/sdk/gcloud/reference/network-security/server-tls-policies
- Google Cloud SDK: gcloud compute target-https-proxies update reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/update
- Google Cloud SDK: gcloud compute backend-services update reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud Certificate Authority Service: Request certificates with gcloud: https://cloud.google.com/certificate-authority-service/docs/requesting-certificates
- Google Cloud Certificate Authority Service: Create and enable root CAs: https://cloud.google.com/certificate-authority-service/docs/creating-root-ca
- Google Cloud Certificate Authority Service: Certificate profiles: https://cloud.google.com/certificate-authority-service/docs/certificate-profile
- Google Cloud Certificate Authority Service: Revoke certificates: https://cloud.google.com/certificate-authority-service/docs/revoking-certificates

## Issues Found
- The TrustConfig command used `gcloud certificate-manager trust-configs create --source=...`, but YAML source files are imported with `gcloud certificate-manager trust-configs import`. Updated the command and surrounding text.
- The ServerTlsPolicy commands used `gcloud network-security server-tls-policies create`, but the current gcloud command group supports importing YAML policies with `gcloud network-security server-tls-policies import`. Updated both strict and permissive examples.
- The backend service command used repeated `--custom-request-headers` flags. The supported flag is singular, `--custom-request-header`, repeated once per header. Updated the command.
- The strict mTLS curl test said failure could be a TLS handshake failure or 403. With `REJECT_INVALID`, the load balancer terminates the connection before forwarding to the backend. Updated the expected result to TLS handshake failure.
- The Certificate Authority Service certificate issuance command used outdated/incorrect `--pool` and `--location` flags for certificates and omitted `--generate-key` and a certificate profile. Updated it to use `--issuer-pool`, `--issuer-location`, `--generate-key`, and `--use-preset-profile=leaf_client_tls`.
- The Certificate Authority Service section created a root CA but did not enable it before issuing certificates. Added the `gcloud privateca roots enable` command.
- The revocation section claimed load balancer mTLS supports CRLs through TrustConfig and showed a TrustConfig snippet with no actual CRL field. Replaced it with an accurate note that TrustConfig supports trust anchors, intermediate CAs, and allowlisted certificates, and recommended short-lived certificates, CA/trust config rotation, or backend serial-number deny lists.
- The prerequisites mentioned only the Certificate Manager API. Added the Network Security API because the tutorial creates/imports ServerTlsPolicy resources.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK documentation rather than local `--help` output. The OpenSSL example is syntactically valid for generating a simple private CA and client certificate, but production deployments should add appropriate certificate extensions and protect CA private keys outside local shell workflows.
