# Validation Summary: How to Configure Rancher for Hybrid Cloud Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Monitoring
- Fleet GitOps
- Kubernetes
- RKE2
- K3s
- Amazon EKS
- Azure AKS
- Google Kubernetes Engine (GKE)
- Prometheus federation
- Helm
- AWS CLI

## Sources Consulted
- Rancher Architecture Recommendations: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/architecture-recommendations
- Rancher Registering Existing Clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Kubernetes API Reference: https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher Monitoring and Alerting Overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher Enable Monitoring: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Monitoring Helm Chart Options: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Fleet GitRepo Resource: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet Namespaces: https://fleet.rancher.io/0.10/namespaces
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes PodSecurityPolicy Removal: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Prometheus Federation: https://prometheus.io/docs/prometheus/latest/federation/
- Amazon EKS kubeconfig setup: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI `eks update-kubeconfig`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Azure CLI `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks
- Google Cloud SDK `gcloud container clusters get-credentials`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- AWS CLI `cloudwatch put-metric-data`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html

## Issues Found

1. **Incorrect Rancher RBAC manifest fields**: The `ClusterRoleTemplateBinding` examples used `subjectName` and `subjectKind`, which are not the current Rancher Kubernetes API fields for this resource. Replaced them with supported fields, added the required `clusterName`, and kept the object namespaced to the target cluster ID.

2. **Wrong Rancher role template for cluster access**: The examples used `project-member` in a `ClusterRoleTemplateBinding`. Changed this to `cluster-member`, which is the correct built-in cluster-level role.

3. **Monitoring install example was incomplete**: The Helm install command assumed the Rancher chart repo already existed. Added `helm repo add rancher-charts https://charts.rancher.io` and `helm repo update` so the command sequence is runnable.

4. **Prometheus federation explanation was backwards and the target was not reachable across clusters**: Federation in Prometheus works by the central Prometheus scraping downstream `/federate` endpoints. Updated the wording accordingly, quoted the `match[]` key as shown in Prometheus docs, and replaced the cross-cluster `.svc` target with a reachable internal hostname example.

5. **Deprecated Kubernetes policy reference**: The post referenced `pod-security-policy.yaml`, which implies PodSecurityPolicy usage. PodSecurityPolicy was removed in Kubernetes v1.25, so the example now refers to namespace-based Pod Security Standards instead.

6. **Incorrect AWS service description for custom metrics**: The post said the example pushed metrics to AWS Cost Explorer custom metrics. Cost Explorer does not accept custom metrics; `put-metric-data` publishes custom metrics to Amazon CloudWatch. Updated the wording to match the actual AWS CLI behavior.

7. **Shell command could emit whitespace in the metric value**: The `wc -l` command can return padded output. Trimmed spaces before passing the value to AWS CLI so the metric value is reliably numeric.

## Review Notes
- The Rancher docs recommend running the Rancher management server on a dedicated cluster separate from downstream user clusters for production use.
- Rancher Monitoring is deployed per cluster. Installing it on the Rancher local cluster gives metrics for Rancher itself, but downstream clusters need their own monitoring deployment if you want to federate or aggregate their metrics centrally.
- The Fleet examples remain valid with `apiVersion: fleet.cattle.io/v1alpha1`, which is still what the current Fleet documentation shows for `GitRepo`.
