# Validation Summary: How to Use AWS ACM Certificates with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- AWS Private Certificate Authority (ACM PCA)
- AWS Load Balancer Controller
- Elastic Load Balancing: NLB and ALB
- Amazon EKS / Kubernetes
- Istio Gateway and IstioOperator
- cert-manager and AWS Private CA Issuer
- TLS / SNI

## Sources Consulted
- AWS Certificate Manager User Guide: Exporting public certificates - https://docs.aws.amazon.com/acm/latest/userguide/acm-exportable-certificates.html
- AWS Certificate Manager User Guide: Managed renewal for ACM certificates - https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- AWS Certificate Manager API Reference: RequestCertificate - https://docs.aws.amazon.com/acm/latest/APIReference/API_RequestCertificate.html
- AWS Private CA API Reference: CreateCertificateAuthority - https://docs.aws.amazon.com/privateca/latest/APIReference/API_CreateCertificateAuthority.html
- AWS Load Balancer Controller documentation: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Load Balancer Controller documentation: Ingress annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Kubernetes documentation: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Istio documentation: Gateway reference - https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio documentation: Secure ingress gateways - https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- cert-manager documentation: Certificate resource - https://cert-manager.io/docs/usage/certificate/
- AWS Private CA Issuer documentation - https://cert-manager.github.io/aws-privateca-issuer/

## Issues Found
- The post said ACM certificates cannot be exported. AWS now supports exportable public ACM certificates when export is enabled at request time, while non-exportable ACM certificates still cannot be exported. Updated the explanation to distinguish non-exportable ACM certificates, exportable public certificates, and the common AWS-integrated ACM usage model.
- The opening sentence implied ACM certificates are universally free. Updated it to clarify that public certificates used with integrated AWS services are available at no additional certificate charge, while exportable public certificates and ACM Private CA are paid options.
- The Istio Gateway examples used `selector.matchLabels`, which is Kubernetes selector syntax, not the Istio Gateway `selector` map. Changed both Gateway examples to `selector: { istio: ingressgateway }` YAML form.
- The ALB Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Updated it to use `spec.ingressClassName: alb`.
- The sample AWS ARNs used a 9-digit account ID. Updated them to use a 12-digit placeholder account ID.
- The ACM PCA section implied the single `create-certificate-authority` command leaves a usable CA. Adjusted the wording to say to create or use an active Private CA, with the command shown as an example of creating a subordinate CA resource.

## Review Notes
- The NLB and ALB annotations align with AWS Load Balancer Controller documentation, including ACM certificate ARN annotations, SSL ports, SSL policy, target type, health check annotations, and multiple certificate ARNs for SNI.
- The cert-manager `Certificate` and AWS Private CA Issuer examples use the expected API groups, issuer reference, `dnsNames`, `duration`, and `renewBefore` fields.
- The AWS CLI examples could not be checked with local `aws --help` because the AWS CLI is not installed in this environment, so they were verified against AWS API and documentation references instead.
