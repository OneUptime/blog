# Validation Summary: Cloud-Agnostic or Cloud-Native? A Practical Decision Matrix

## Status
validated

## Post Type
Architecture decision guide

## Technologies Covered

- Cloud portability and provider-native managed services
- Kubernetes and the Certified Kubernetes Conformance Program
- Open Container Initiative (OCI) images
- OpenTelemetry
- OpenID Connect (OIDC)
- Terraform providers and infrastructure modules
- PostgreSQL and database export formats
- YAML decision records
- AWS, Microsoft Azure, and Google Cloud architecture frameworks

## Sources Consulted

- [CNCF Cloud Native Definition v1.1](https://github.com/cncf/toc/blob/main/DEFINITION.md)
- [CNCF Certified Kubernetes Software Conformance](https://www.cncf.io/training/certification/software-conformance/)
- [Certified Kubernetes Conformance Program terms](https://github.com/cncf/k8s-conformance/blob/master/terms-conditions/Certified_Kubernetes_Terms.md)
- [Kubernetes API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [Kubernetes StorageClass documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/#provisioner)
- [Open Container Initiative Image Specification](https://specs.opencontainers.org/image-spec/)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Amazon EKS IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Azure Cloud Adoption Framework strategy](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/strategy/)
- [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The opening defined a cloud-native design as one that deliberately uses a provider's managed capabilities. CNCF's definition does not make cloud-native practices provider-specific and explicitly supports public, private, and hybrid environments. The text now distinguishes cloud-native practices from the cloud-provider-native design choice that the matrix evaluates.
- The conclusion referred to provider-specific managed capabilities as “cloud-native services.” It now says “cloud-provider-native services” to preserve the corrected distinction.
- The Kubernetes conformance description referred to “core Kubernetes APIs,” which could be confused with the formal core API group. CNCF describes conformance in terms of required APIs, so the wording now matches the program's documented scope.

## Review Notes

The pseudocode is intentionally language-neutral, and the YAML decision record is syntactically valid. The probability-by-impact model is a qualitative policy tool rather than a forecast; teams adopting it should define their own numeric thresholds for low, medium, and high exposure. All documentation links resolved to the intended official resources at review time; the Google Cloud URL redirects to its current `docs.cloud.google.com` location.
