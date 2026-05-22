# Validation Summary: How to Create Kubernetes Annotations and Labels with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes labels and annotations
- Kubernetes Deployments, Services, Namespaces, Ingress, and ConfigMaps
- Terraform Kubernetes provider
- Terraform HCL, locals, `merge`, `for_each`, and lifecycle `ignore_changes`
- AWS Load Balancer Controller service annotations
- ExternalDNS annotations
- ingress-nginx annotations

## Sources Consulted
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes recommended labels reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Terraform Kubernetes provider `kubernetes_deployment` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider `kubernetes_ingress_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Terraform lifecycle `ignore_changes` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Load Balancer Controller service annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS NLB service annotations documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The label syntax explanation said label keys and values must both be 63 characters or less. Kubernetes label keys can include an optional DNS subdomain prefix up to 253 characters, followed by a 63-character name segment. Updated the text to distinguish the key name segment from the optional prefix.
- The annotation explanation said there is no length restriction on annotation values. Kubernetes documents annotation metadata as potentially small or large and not constrained like labels, but annotation values are still string metadata on an API object. Updated the sentence to say annotation values are strings and are not limited to the 63-character label value limit.
- The AWS Load Balancer Controller Service example used `service.beta.kubernetes.io/aws-load-balancer-type = "nlb"`. Current AWS Load Balancer Controller documentation recommends `external` for controller-managed NLB Services, with `service.beta.kubernetes.io/aws-load-balancer-nlb-target-type` specifying `instance` or `ip`. Updated the example to use `external` and added `aws-load-balancer-nlb-target-type = "instance"`.
- The AWS Load Balancer Controller Service example used `service.beta.kubernetes.io/aws-load-balancer-backend-protocol = "http"`. The AWS Load Balancer Controller documentation lists `tcp` and `ssl` for this NLB backend protocol annotation. Updated the value to `tcp`.

## Review Notes
Terraform CLI was not installed in the local environment, so HCL snippets were reviewed against the official Terraform Kubernetes provider documentation rather than locally formatted or planned. The examples are illustrative and omit provider, variable, and namespace setup that a complete Terraform module would need.
