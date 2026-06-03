# Validation Summary: How to Deploy Applications on EKS with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon ECR
- Kubernetes
- Helm
- Bitnami NGINX Helm chart
- AWS Load Balancer Controller
- GitOps tools including Argo CD and Flux

## Sources Consulted
- Helm installation documentation: https://helm.sh/docs/v3/intro/install/
- Helm install command documentation: https://helm.sh/docs/v3/helm/helm_install/
- Helm upgrade command documentation: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm chart template function documentation: https://helm.sh/docs/chart_template_guide/function_list/
- Bitnami NGINX chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/nginx/values.yaml
- AWS ECR documentation for pushing OCI Helm charts: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/

## Issues Found
- The Bitnami NGINX values example used outdated or non-matching keys for the current chart: `service.port`, `ingress.hosts`, and `autoscaling.targetCPUUtilizationPercentage`. Updated them to `service.ports.http`, `ingress.hostname` / `ingress.path` / `ingress.pathType`, and `autoscaling.targetCPU` based on the chart's published values.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `ingress.ingressClassName: alb` while keeping the AWS Load Balancer Controller annotations for ALB scheme and target type.
- The pinned Bitnami NGINX chart version was outdated for the reviewed chart values. Updated the example chart version to `25.0.0`, the current chart version consulted during review.
- The post stated that Helm performs rolling updates by default. Clarified that Kubernetes performs rolling updates for Deployment-based workloads; Helm applies the updated chart resources.
- The custom Deployment template referenced `configmap.yaml` for a checksum annotation, but the chart structure did not include that template. Removed the annotation so the sample chart renders correctly as shown.
- The custom values file defined `image.pullPolicy`, but the Deployment template did not use it. Added `imagePullPolicy: {{ .Values.image.pullPolicy }}`.
- The cluster validation command used `--dry-run` while describing a server-side validation. Updated it to `--dry-run=server --debug`.
- The ECR example pushed a Helm chart without first creating a matching ECR repository and used a path inconsistent with AWS's documented example. Added `aws ecr create-repository --repository-name my-app` and changed the push destination to the registry root so the packaged `my-app` chart maps to the `my-app` ECR repository.

## Review Notes
The post is technically relevant and suitable as a Helm-on-EKS tutorial. Some examples still assume prerequisites that are reasonable for the topic, such as an existing EKS cluster, a configured kubeconfig, AWS CLI credentials, and the AWS Load Balancer Controller being installed before ALB ingress resources will work.
