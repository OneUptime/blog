# Validation Summary: How to Set Up cert-manager on EKS with ACM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- Amazon EKS
- AWS Load Balancer Controller / ALB Ingress
- Kubernetes Ingress and TLS Secrets
- cert-manager
- Let's Encrypt ACME
- Route 53 DNS01 validation
- Helm
- eksctl / IRSA
- NGINX Ingress

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Route 53 DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- AWS Load Balancer Controller SSL redirect documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/tasks/ssl_redirect/
- AWS Load Balancer Controller Ingress annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- eksctl IAM roles for service accounts documentation: https://eksctl.io/usage/iamserviceaccounts/
- AWS Certificate Manager public certificate documentation: https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html
- AWS Certificate Manager DNS renewal validation documentation: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- AWS Certificate Manager pricing: https://aws.amazon.com/certificate-manager/pricing/

## Issues Found
- The description implied that cert-manager integrates with ACM for Kubernetes workload certificate management. The post actually covers ACM at the ALB layer and cert-manager with Let's Encrypt/Route 53 separately, so the description was corrected.
- The post described cert-manager as provisioning certificates directly for pods and labeled the section "Pod-Level TLS", but the examples include ingress-controller TLS as well as pod-consumable Kubernetes secrets. The wording was corrected to "Kubernetes-managed TLS" and "Kubernetes secrets for workloads and ingress controllers."
- The post used NGINX ingress as the named ingress-controller example. Current cert-manager documentation warns that ingress-nginx is scheduled for end of life in March 2026, so the wording was generalized to ingress controllers that consume Kubernetes TLS secrets.
- The ACM section said ACM certificates are free without qualification. Current ACM pricing distinguishes no-cost default public certificates for integrated AWS services from charged exportable public certificates, so the sentence was narrowed to ALB/integrated-service usage.
- The Helm install command used the older `installCRDs=true` value and legacy chart repository setup. It was updated to the current official OCI chart form with `crds.enabled=true`.
- The cert-manager IRSA setup mixed Helm-managed ServiceAccounts with an `eksctl create iamserviceaccount` command that would manage the ServiceAccount itself. The command was changed to create the IAM role with `--role-only` and `--role-name`, matching eksctl guidance for Helm-managed ServiceAccounts.
- The Helm install command referenced the IRSA role ARN before the post created that role. A sentence was added to tell readers to create the Route 53 IAM policy and IRSA role before running the Helm install when using DNS01 validation.
- The cert-manager Route 53 IRSA install command was missing the file-system group setting needed for cert-manager to read the projected service account token in the documented IRSA setup. `--set securityContext.fsGroup=1001` was added.
- The installation verification command used `kubectl get apiservice v1.cert-manager.io`, which is not the current cert-manager install check. It was replaced with `cmctl check api --wait=2m`.
- The certificate status explanation said certificates move from "Pending" to "Ready". cert-manager `Certificate` resources are typically observed through the Ready condition, so the wording was changed to `Ready=False` then `Ready=True`.

## Review Notes
- The ALB Ingress example uses the legacy `kubernetes.io/ingress.class: alb` annotation. It remains commonly supported, but `spec.ingressClassName: alb` is the modern Kubernetes field and could be used in a future refresh.
- The ingress-controller example does not specify `ingressClassName`; it can still work when the target controller is the default ingress class or watches classless Ingresses, but specifying the class is clearer in multi-controller clusters.
- Local `aws`, `eksctl`, and `ruby` binaries were not installed in the workspace, so CLI checks were performed against official documentation. JSON and YAML snippets were parsed successfully using Python.
