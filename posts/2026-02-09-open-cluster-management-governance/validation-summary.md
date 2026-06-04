# Validation Summary: How to Set Up Open Cluster Management (OCM) for Multi-Cluster Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Cluster Management
- clusteradm
- Kubernetes
- ManagedCluster and ManagedClusterSet APIs
- OCM Policy Framework
- ConfigurationPolicy
- Gatekeeper
- Argo CD ApplicationSet
- Hive ClusterDeployment
- OpenShift ClusterVersion
- Grafana / Prometheus-style dashboards

## Sources Consulted
- Open Cluster Management clusteradm README: https://github.com/open-cluster-management-io/clusteradm
- Open Cluster Management control plane installation docs: https://open-cluster-management.io/docs/getting-started/installation/start-the-control-plane/
- Open Cluster Management ManagedClusterSet docs: https://open-cluster-management.io/docs/concepts/cluster-inventory/managedclusterset/
- Open Cluster Management Placement docs: https://open-cluster-management.io/docs/concepts/content-placement/placement/
- Open Cluster Management Policy Framework docs: https://open-cluster-management.io/docs/getting-started/integration/policy-controllers/policy-framework/
- Open Cluster Management Policy API concepts: https://open-cluster-management.io/docs/getting-started/integration/policy-controllers/policy/
- Open Cluster Management Configuration Policy docs: https://open-cluster-management.io/docs/getting-started/integration/policy-controllers/configuration-policy/
- Open Cluster Management Gatekeeper integration docs: https://open-cluster-management.io/docs/getting-started/integration/policy-controllers/gatekeeper/
- Open Cluster Management Argo CD integration docs: https://open-cluster-management.io/docs/scenarios/integration-with-argocd/
- Red Hat Advanced Cluster Management certificate policy controller docs: https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_management_for_kubernetes/2.4/html-single/governance/governance
- Red Hat OpenShift ClusterVersion API docs: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/config_apis/clusterversion-config-openshift-io-v1
- OpenShift Hive ClusterDeployment API references and examples: https://github.com/openshift/hive

## Issues Found
- The post implied `clusteradm init` installs the policy framework. Updated it to distinguish core hub initialization from installing the `governance-policy-framework` add-on.
- The multi-cluster join script tried to parse a `token:` line and manually create a bootstrap secret. Replaced it with supported `clusteradm join --hub-token --hub-apiserver --context` and `clusteradm accept --context` commands.
- Policy add-ons were used without being enabled on managed clusters. Added `clusteradm addon enable` commands for `governance-policy-framework` and `config-policy-controller`.
- `ManagedClusterSet` label selectors were missing `selectorType: LabelSelector`. Added the required selector type.
- Policy `PlacementBinding` used an invalid `spec:` wrapper and the older `PlacementRule` API. Updated it to current top-level `placementRef` / `subjects` fields and `cluster.open-cluster-management.io/v1beta1` `Placement`.
- Placements were shown without matching `ManagedClusterSetBinding` resources in the target namespaces. Added bindings for the `default` and `argocd` namespaces.
- The pod security policy used an invalid namespace template reference. Updated it to use `objectSelector` with the current `ObjectName` template variable.
- The certificate policy section implied built-in OCM enforcement. Updated the text to describe auditing with the optional certificate policy controller and added required policy fields.
- The application deployment example used older Channel / Subscription / PlacementRule resources. Replaced it with the current OCM Placement plus Argo CD ApplicationSet pattern.
- The Hive `ClusterDeployment` example used an invalid `provisioning` wrapper and Kubernetes 1.28-style image naming. Moved `imageSetRef` and `installConfigSecretRef` to the correct fields and changed the example to OpenShift 4.x.
- The upgrade example used Kubernetes-style `stable-1.28` / `1.28.5` values for an OpenShift `ClusterVersion`. Updated it to `stable-4.14` and `4.14.5`.
- The monitoring section referenced a metric as if it were universally present. Clarified that the dashboard assumes the user's telemetry pipeline exports a matching policy compliance metric.

## Review Notes
The YAML snippets were parsed successfully with PyYAML after edits. Some examples still depend on environment-specific prerequisites, such as an `argocd` namespace with Argo CD ApplicationSet installed, a configured policy metrics exporter, and optional certificate policy controller installation.
