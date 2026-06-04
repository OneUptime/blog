# Validation Summary: Configure cert-manager ClusterIssuer for Cluster-Wide Certificate Authority

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- ACME / Let's Encrypt
- TLS certificates
- ClusterIssuer and Issuer resources
- Route53 DNS-01 challenges
- EKS IAM Roles for Service Accounts (IRSA)
- HashiCorp Vault PKI
- Kubernetes RBAC
- OpenSSL

## Sources Consulted
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/v1.16-docs/configuration/acme/dns01/route53/
- cert-manager Vault issuer documentation: https://cert-manager.io/v1.14-docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ClusterRole API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/cluster-role-v1/
- Kubernetes ClusterRoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/cluster-role-binding-v1/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Local OpenSSL `req -help` output for `-new`, `-x509`, `-key`, `-out`, `-days`, and `-subj` options.

## Issues Found
- The HTTP-01 solver examples used `http01.ingress.class: nginx`. cert-manager still supports `class`, but current documentation recommends `ingressClassName` for most ingress controllers and reserves `class` mainly for ingress-gce compatibility. Updated both nginx examples to use `ingressClassName: nginx`.
- The post stated that ClusterIssuer referenced Secrets are created or read from the `cert-manager` namespace. This is only the default. cert-manager uses the configured cluster resource namespace for ClusterIssuer Secret references. Updated the ACME, CA, and Vault wording/comments to say "cluster resource namespace" and note that it is typically or by default `cert-manager`.
- The multiple-solver example routed a wildcard DNS name to the HTTP-01 solver. Wildcard certificates cannot be obtained with HTTP-01. Updated the solver selectors so HTTP-01 applies to `public.example.com`, DNS-01 applies to `*.example.com`, and a separate DNS-01 selector handles `internal.example.com`.
- The multiple-solver example used `*.example.com` under `dnsZones`. cert-manager's `dnsZones` selector expects DNS zone/domain suffix values, not wildcard identifiers. Updated the wildcard case to use `dnsNames: ["*.example.com"]`.
- The Best Practices section referred to "namespace selectors" in solver configurations. cert-manager ACME solver selectors support DNS names, DNS zones, and certificate labels, not namespace selectors. Updated this to "solver selectors" for DNS names.

## Review Notes
- The Vault example uses static service account token authentication. This is supported, but cert-manager documentation recommends `serviceAccountRef` secretless authentication in cert-manager 1.12 and later because Kubernetes 1.24 stopped auto-creating long-lived service account token Secrets by default.
- The CA issuer example is syntactically correct, but cert-manager documentation cautions that CA issuers require careful planning for CA rotation, trust distribution, and private-key handling in production.
- `kubectl` was not installed in the review environment, so kubectl command behavior was checked against Kubernetes documentation rather than local CLI help.
