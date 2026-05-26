# Validation Summary: How to Deploy cert-manager with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- Kubernetes
- cert-manager
- Helm
- Let's Encrypt ACME issuers
- AWS Route53 and EKS IRSA
- Google Cloud DNS and GKE Workload Identity
- Prometheus monitoring
- Kubernetes Ingress

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager ACME HTTP01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ACME DNS01 Route53 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager ACME DNS01 Google CloudDNS documentation: https://cert-manager.io/docs/configuration/acme/dns01/google/
- cert-manager ACME issuer selector documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager controller CLI reference: https://cert-manager.io/docs/cli/controller/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Terraform AWS IAM module registry documentation: https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/latest/submodules/iam-role-for-service-accounts-eks

## Issues Found
- The Helm chart version was pinned to `1.14.0`, which is end-of-life and also missing the `v` prefix used by official cert-manager Helm chart versions. Updated it to `v1.20.2`, the current supported release shown in the official installation documentation.
- The Helm CRD value used `installCRDs`, which is correct for older cert-manager charts but current cert-manager Helm documentation uses `crds.enabled=true`. Updated the Terraform Helm values accordingly.
- The HTTP01 examples used `ingress.class`, which is now only recommended for ingress-gce. Updated the examples to use `ingress.ingressClassName` for nginx.
- The Route53 IRSA section created the IAM role but did not show the required service account annotation. Added a small Helm values snippet showing the `eks.amazonaws.com/role-arn` annotation.
- The Google Cloud DNS secret hard-coded the `cert-manager` namespace, creating no Terraform dependency on the namespace resource. Updated it to reference `kubernetes_namespace.cert_manager`.
- The Prometheus example used `servicemonitor`, while current cert-manager Helm documentation shows `podmonitor`. Updated the Helm values example to use `prometheus.podmonitor.enabled`.

## Review Notes
- The Route53 IAM policy is functional but broader than the current cert-manager example because it does not restrict changes to TXT records. Tightening the IAM condition would be a good future hardening improvement.
- The Google Cloud DNS section uses a static service account key. The post correctly recommends Workload Identity later, but a future revision could show the Workload Identity Terraform configuration instead of static credentials.
