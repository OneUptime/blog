# Validation Summary: Deploying Ingress Controllers with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- Kubernetes Ingress
- ingress-nginx
- AWS Load Balancer Controller
- cert-manager
- Helm

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/ingress_v1.md
- HashiCorp Helm provider `helm_release` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-helm/main/docs/resources/release.md
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx project status and retirement notice: https://kubernetes.github.io/ingress-nginx/
- ingress-nginx annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- AWS Load Balancer Controller installation guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post referred to the deprecated "AWS ALB Ingress Controller". I updated the prose and example heading to use the current name, AWS Load Balancer Controller, to match the official project documentation.
- The ingress-nginx example pinned an older chart version. I updated the chart version from `4.9.1` to `4.15.1` and added a short note that ingress-nginx entered retirement after March 2026, because that is a current version-specific support caveat in the official docs.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingress_class_name = "nginx"` in the `kubernetes_ingress_v1` resource, which is the current recommended field in Kubernetes and the Terraform-compatible provider docs.
- The AWS Load Balancer Controller example set `serviceAccount.create = false` without stating the required prerequisite. I added a note that the IAM policy, IAM role, and `aws-load-balancer-controller` ServiceAccount must already exist for that example to work as written, and I pinned the chart version to `3.2.2`.
- The cert-manager example used the legacy Helm repository path and the deprecated `installCRDs` value. I updated it to the current OCI chart location, pinned `v1.20.2`, and changed the value to `crds.enabled = true` per the current cert-manager installation docs.

## Review Notes
- ingress-nginx is still deployable, but it is retired as of March 2026. If this post is refreshed later, the NGINX-based example may be worth replacing with an actively maintained controller.
