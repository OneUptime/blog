# Validation Summary: How to Set Up a Shared Services Project in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Terraform (`rancher2` provider)
- Kubernetes NetworkPolicy
- Prometheus and Grafana
- Grafana Loki
- cert-manager
- ingress-nginx

## Sources Consulted
- Rancher Projects API workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quota behavior: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher cluster and project roles: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher monitoring installation behavior: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP01 solver configuration: https://cert-manager.io/docs/configuration/acme/http01/
- Grafana Loki Helm installation overview: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm install: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki community-chart migration: https://grafana.com/docs/loki/latest/setup/upgrade/upgrade-to-community/
- Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx retirement notice: https://kubernetes.github.io/ingress-nginx/
- Kubernetes namespaces and service DNS behavior: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known namespace labels: https://kubernetes.io/docs/reference/labels-annotations-taints/
- `kubectl top` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Rancher `Project` example used `metadata.generateName` with `kubectl apply`. Rancher documents that `generateName` must be created with `kubectl create`, so I changed the command and clarified that project creation happens on Rancher's management cluster.
- The namespace example hard-coded an incorrect placeholder project ID and manually set a `field.cattle.io/projectId` label that Rancher does not require for namespace creation. I changed the workflow to look up the generated project ID, kept the supported `field.cattle.io/projectId` annotation, and removed the incorrect label.
- The RBAC comment said the Terraform binding only provided monitoring-dashboard access, but the `read-only` project role applies to the whole shared-services project. I corrected the description to match the actual Rancher role scope.
- The monitoring NetworkPolicy example depended on a non-portable `app: prometheus` pod label and used an imprecise DNS selector. I changed it to an example for monitoring workloads in the namespace and targeted CoreDNS in `kube-system` using Kubernetes' built-in namespace label.
- The ingress NetworkPolicy selected namespaces using `project: shared-services`, while the post later created an `app=ingress-controller` namespace label for selectors. I aligned the policy with the namespace label that the post actually applies.
- The monitoring section implied Rancher's built-in Monitoring app could be installed into the custom `monitoring` namespace. Rancher documents that the built-in app deploys to `cattle-monitoring-system`, so I changed the section to use direct Helm installation for a shared-project deployment. I also fixed the invalid shell placeholder `--set grafana.adminPassword=<secure-password>`.
- The logging section used the outdated `grafana/loki-stack` chart and enabled Promtail, which is deprecated and past end-of-life. I replaced it with the current community-maintained Loki chart and a documented monolithic values file, and updated the namespace annotation text accordingly.
- The cert-manager install used the older `installCRDs` flag and the ClusterIssuer used the legacy `class` field for HTTP01. I updated these to `crds.enabled=true` and `ingressClassName`, which match current cert-manager documentation.
- The ingress controller section recommended `ingress-nginx` without caveat. Since the project entered retirement after March 2026, I added a note that it is only a legacy standardization example and that new long-lived deployments should choose a maintained controller.
- The health-check script assumed `kubectl top` was always available. Kubernetes documents that `top` depends on the Metrics API, so I added a guard to avoid misleading output when metrics are unavailable.

## Review Notes
- The post is technically correct as of 2026-05-07.
- The `ingress-nginx` example is still valid for existing environments that already standardize on it, but it is no longer a strong default for new deployments because the project is retired.
- The Loki example now follows Grafana's current documented chart flow for a small shared-services stack. For production HA, external object storage and a fuller production topology should still be used.
