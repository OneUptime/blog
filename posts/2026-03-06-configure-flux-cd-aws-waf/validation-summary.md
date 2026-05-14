# Validation Summary: How to Configure Flux CD with AWS WAF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS WAF v2
- AWS CLI
- AWS Load Balancer Controller
- Application Load Balancer
- Amazon EKS
- Kubernetes Ingress
- AWS Controllers for Kubernetes (ACK) WAFv2 Controller
- Flux CD HelmRelease, OCIRepository, and Kustomization
- Kustomize overlays
- Amazon CloudWatch metrics
- Amazon S3 WAF logging

## Sources Consulted
- AWS CLI `wafv2 create-web-acl` command reference: https://docs.aws.amazon.com/cli/latest/reference/wafv2/create-web-acl.html
- AWS CLI `wafv2 get-sampled-requests` command reference: https://docs.aws.amazon.com/cli/latest/reference/wafv2/get-sampled-requests.html
- AWS WAF `LoggingConfiguration` API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_LoggingConfiguration.html
- AWS WAF S3 logging documentation: https://docs.aws.amazon.com/waf/latest/developerguide/logging-s3.html
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.15/guide/ingress/annotations/
- ACK WAFv2 `WebACL` API reference: https://aws-controllers-k8s.github.io/community/reference/wafv2/v1alpha1/webacl/
- ACK WAFv2 `IPSet` API reference: https://aws-controllers-k8s.github.io/community/reference/wafv2/v1alpha1/ipset/
- ACK Helm installation documentation: https://aws-controllers-k8s.github.io/docs/getting-started-helm/
- ACK Helm values reference: https://aws-controllers-k8s.github.io/docs/guides/helm-values
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- Removed the deprecated `ExcludedRules` field from the AWS managed rule group example. AWS documents `RuleActionOverrides` as the replacement, and the sample did not need an empty exclusion list.
- Updated the ACK controller Flux example to define an `OCIRepository` for the ACK WAFv2 OCI Helm chart and reference it with `spec.chartRef`, matching current Flux guidance for OCI charts.
- Added the `ack-system` namespace manifest before the namespaced `HelmRelease`, so the manifest can be applied by Flux before the Helm release object is created.
- Removed the `RegexPatternSet` ACK manifest and its Kustomize resource entry. The current ACK WAFv2 controller reference documents `WebACL` and `IPSet` Kubernetes resources; `RegexPatternSet` appears in SDK model types but is not documented as an ACK custom resource.
- Replaced BSD/macOS `date -v-1H` usage in AWS CLI monitoring examples with GNU/Linux-compatible `date -u -d '1 hour ago'` and emitted UTC timestamps with `Z`, matching AWS WAF sampled request timestamp requirements.

## Review Notes
The corrected guide is technically valid for a Flux-managed EKS setup using the AWS Load Balancer Controller and ACK WAFv2 controller. The IAM policy shown uses broad `AWSWAFFullAccess`; a future hardening pass could replace it with a least-privilege policy tailored to the exact WAF resources being managed.
