# Validation Summary: How to Implement Active-Active Deployments Across Clusters with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes
- Kustomize
- ExternalDNS
- AWS Route53
- Crossplane Upbound AWS provider
- Prometheus / Prometheus Operator

## Sources Consulted
- Argo CD cluster command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet progressive syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- ExternalDNS AWS tutorial and Route53 routing annotations: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- Upbound provider-aws-route53 HealthCheck resource reference: https://marketplace.upbound.io/providers/upbound/provider-aws-route53/v1.8.0/resources/route53.aws.upbound.io/HealthCheck/v1beta1
- AWS CloudFormation Route53 HealthCheck reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-route53-healthcheck.html
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Amazon EKS ApplicationSets documentation: https://docs.aws.amazon.com/eks/latest/userguide/argocd-applicationsets.html

## Issues Found
- The ExternalDNS Service example used weighted Route53 routing but did not show how the record was associated with an existing Route53 health check. Added the `external-dns.alpha.kubernetes.io/aws-health-check-id` annotation and clarified that ExternalDNS can associate health checks but does not create them.
- The RollingSync example matched on `region`, but RollingSync selects generated Applications by Application labels, not by cluster Secret labels directly. Added a `region` label to the generated Application template.
- The progressive sync prose implied RollingSync was available without mentioning enablement. Updated the wording to say it applies when Argo CD progressive syncs are enabled.
- The `argocd app list` example used a non-standard `appset=api-active-active` selector. Replaced it with Argo CD's ApplicationSet label, `argocd.argoproj.io/application-set-name=api-active-active`.

## Review Notes
The post is technically relevant and the remaining examples are consistent with current Argo CD, Kubernetes, ExternalDNS, Route53, Crossplane, and Prometheus documentation. Progressive syncs are still documented as experimental in Argo CD, so production users should verify that the feature is enabled and supported in their installed Argo CD version.
