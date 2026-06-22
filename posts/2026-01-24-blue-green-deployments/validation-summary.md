# Validation Summary: How to Configure Blue-Green Deployments

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes Deployments, Services, readiness probes, labels, and selectors
- kubectl service patching
- Argo Rollouts blue-green strategy, AnalysisTemplate, and kubectl plugin
- AWS Application Load Balancer target groups, listener forwarding, and AWS CLI elbv2
- Terraform AWS provider resources for ALB listeners and target groups
- PostgreSQL-style SQL migrations
- Prometheus Operator PrometheusRule resources and PromQL

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Argo Rollouts BlueGreen Deployment Strategy: https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/
- Argo Rollouts Analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts Job metric provider documentation: https://argo-rollouts.readthedocs.io/en/stable/analysis/job/
- Argo Rollouts kubectl plugin documentation: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- AWS CLI elbv2 modify-listener documentation: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-listener.html
- AWS Application Load Balancer SSL policy documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS account identifier documentation: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- Terraform AWS provider aws_lb_listener documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider aws_lb_target_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Prometheus Operator alerting / PrometheusRule documentation: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The AWS CLI blue-green switch example used placeholder ARNs with a 9-digit AWS account ID (`123456789`). AWS account IDs are 12-digit identifiers, and ARN examples should use a 12-digit account segment. Updated the listener and target group ARNs to use `123456789012`.

## Review Notes
The Kubernetes Service selector switching examples, Argo Rollouts blue-green fields, Argo Rollouts kubectl plugin commands, AWS `modify-listener` weighted forward action shape, Terraform ALB listener and target group fields, PostgreSQL-style migration example, and PrometheusRule structure are consistent with the consulted documentation. For a production database migration, teams should still account for table size, lock behavior, and online index creation strategy.
