# Validation Summary: How to Set Up Wildcard Certificates on Talos Linux

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Talos Linux
- Kubernetes
- cert-manager
- ACME / Let's Encrypt
- DNS-01 challenges
- Wildcard TLS certificates
- Cloudflare DNS
- AWS Route53
- Google Cloud DNS
- Kubernetes Ingress
- kubernetes-replicator

## Sources Consulted
- cert-manager Cloudflare DNS01 provider documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Route53 DNS01 provider documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Google CloudDNS DNS01 provider documentation: https://cert-manager.io/docs/configuration/acme/dns01/google/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager ACME Orders and Challenges documentation: https://cert-manager.io/docs/concepts/acme-orders-challenges/
- cert-manager secret synchronization guidance: https://cert-manager.io/docs/devops-tips/syncing-secrets-across-namespaces/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- RFC 8555, Automatic Certificate Management Environment: https://www.rfc-editor.org/rfc/rfc8555.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- mittwald kubernetes-replicator documentation: https://github.com/mittwald/kubernetes-replicator

## Issues Found
- The AWS Route53 secret creation command only created `secret-access-key`, but the later `ClusterIssuer` example referenced both `access-key-id` and `secret-access-key`. The command was updated to include `--from-literal=access-key-id=YOUR_AWS_ACCESS_KEY_ID` so the referenced `accessKeyIDSecretRef` key exists.

## Review Notes
The cert-manager `ClusterIssuer`, `Certificate`, DNS01 solver, `secretTemplate`, and Kubernetes `Ingress` examples otherwise match current documented APIs. The claim that Let's Encrypt wildcard certificates require DNS-01 validation is consistent with Let's Encrypt documentation and ACME wildcard validation behavior. The DNS propagation timing remains an operational estimate rather than a guaranteed SLA.
