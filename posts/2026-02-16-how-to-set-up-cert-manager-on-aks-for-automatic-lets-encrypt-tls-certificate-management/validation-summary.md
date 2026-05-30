# Validation Summary: How to Set Up cert-manager on AKS for Auto Let's Encrypt TLS Certificate Mgmt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- cert-manager
- Helm
- Kubernetes Ingress
- NGINX Ingress
- Let's Encrypt ACME HTTP-01 and DNS-01 challenges
- Azure DNS
- Azure Workload Identity
- Azure CLI

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager kubectl installation and verification documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Azure DNS DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/azuredns/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate renewal documentation: https://cert-manager.io/docs/usage/certificate/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/

## Issues Found
- The Helm install command did not pin a cert-manager chart version. Added `--version v1.20.2` to match the current official installation examples and avoid installing an unintended future chart version.
- The webhook verification command used `kubectl get apiservice v1.cert-manager.io`, which is not the current recommended readiness check. Replaced it with `cmctl check api --wait=2m`, matching cert-manager's official verification guidance.
- The HTTP-01 issuer examples used `http01.ingress.class`. Updated them to `http01.ingress.ingressClassName`, which cert-manager recommends for modern Ingress controllers.
- The Azure DNS DNS-01 section created a managed identity and assigned DNS permissions, but omitted the AKS Workload Identity enablement, cert-manager pod label, and federated credential required for the managed identity to be usable from cert-manager. Added those commands.
- The troubleshooting guidance recommended deleting the TLS secret to force updates. Replaced that with guidance to update the Ingress/Certificate spec and use `cmctl renew` for manual reissuance, aligning with cert-manager's current renewal guidance.

## Review Notes
The tutorial is technically relevant and the remaining examples use current Kubernetes `networking.k8s.io/v1` Ingress resources and cert-manager `cert-manager.io/v1` resources. The post still uses the Jetstack HTTP Helm repository, which remains supported, though cert-manager's current docs recommend the OCI chart source for recent versions.
