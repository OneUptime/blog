# Validation Summary: How to Implement Active-Passive Deployments Across Clusters with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Kustomize
- ExternalDNS
- AWS Route 53 failover records
- Velero
- Prometheus Operator

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD declarative setup and cluster Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD CLI `app wait`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD CLI `app set`: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD metrics: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- ExternalDNS AWS provider documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/crd/
- AWS Route 53 DNS failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/

## Issues Found
- The Argo CD Helm chart version was stale (`5.51.0`). Updated it to `9.5.14`, which is current in the Argo Helm chart repository at review time.
- The failover Job used `argocd app set` to mutate generated Applications even though the ApplicationSet template derives the overlay path from cluster Secret labels. Changed the flow to update the cluster Secret labels first and let ApplicationSet reconcile the generated Applications.
- The failover Job used an old Argo CD CLI image (`argoproj/argocd:v2.10.0`) and also called `kubectl`, which is not guaranteed to exist in that image. Changed the example to use a kubectl image and Kubernetes status waits.
- The DNS section used `DNSEndpoint` resources but did not state that ExternalDNS must be run with the CRD source enabled. Added the required CRD source flags.

## Review Notes
The examples are intentionally infrastructure-specific placeholders and still require production RBAC, DNS provider credentials, database promotion automation, and tested runbooks before real use. The ExternalDNS health check example assumes Route 53 health checks already exist, which matches ExternalDNS behavior.
