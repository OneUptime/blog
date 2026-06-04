# Validation Summary: How to Configure cert-manager with External DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress and Service resources
- ExternalDNS
- cert-manager
- ACME DNS-01 challenges
- AWS Route53
- Prometheus Operator alerts

## Sources Consulted
- cert-manager DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/v1.15-docs/configuration/acme/dns01/route53/
- cert-manager Ingress usage documentation: https://cert-manager.io/v1.7-docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- cert-manager cmctl renewal documentation: https://cert-manager.io/v1.6-docs/usage/cmctl/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The integration flow incorrectly stated that DNS-01 succeeds because ExternalDNS has already created DNS records. ExternalDNS creates DNS records for Kubernetes resources, but cert-manager creates the `_acme-challenge` TXT records for DNS-01 through the configured solver. Updated the flow and issuance explanation.
- The ExternalDNS install example created only a ServiceAccount and Deployment, which is incomplete for RBAC-enabled clusters. Added the required ClusterRole and ClusterRoleBinding, plus an IRSA service account annotation placeholder.
- The ExternalDNS examples used `registry.k8s.io/external-dns/external-dns:v0.14.0`, which is outdated compared with the current ExternalDNS AWS tutorial. Updated examples to `v0.21.0`.
- The ExternalDNS Route53 install example omitted `AWS_DEFAULT_REGION` and a domain filter. Added both to match the official AWS tutorial pattern and prevent broad hosted zone processing.
- The Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName`.
- The LoadBalancer service section implied the Service directly gets a certificate. Clarified that cert-manager stores the certificate in the referenced Kubernetes Secret.
- The Prometheus certificate readiness alert used `certmanager_certificate_ready_status == 0` without filtering the `condition` label. Updated it to check `condition="True"`.
- The DNS propagation section described `cnameStrategy: Follow` as a propagation timeout setting. Updated the wording to explain cert-manager's DNS-01 self-check and CNAME-following behavior.
- The troubleshooting section recommended deleting a TLS Secret to force renewal. Replaced it with the supported `cmctl renew` command.
- The multiple-provider Deployment snippets were invalid `apps/v1` Deployments because they omitted `spec.selector` and matching pod labels. Added selectors and labels.

## Review Notes
The examples are still provider-specific and use placeholder values for domains, account IDs, IAM roles, hosted zones, issuers, and credentials. A production version should include provider-specific credential setup details for each DNS provider used.
