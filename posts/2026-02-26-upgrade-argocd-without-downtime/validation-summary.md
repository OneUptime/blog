# Validation Summary: How to Upgrade ArgoCD Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- GitOps
- PodDisruptionBudgets
- Ingress
- jq

## Sources Consulted
- Argo CD upgrade overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/overview/
- Argo CD installation manifests and namespace installation notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD high availability overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes object names and UIDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names
- Argo CD v2.14.0 upstream manifests: https://github.com/argoproj/argo-cd/tree/v2.14.0/manifests

## Issues Found
- Argo CD raw manifest upgrade commands were missing `--server-side --force-conflicts`. Added those flags to the non-HA, HA, and CRD apply commands because the official upgrade docs require server-side apply for manual manifest upgrades.
- The PodDisruptionBudget section implied PDBs directly prevent rolling-update unavailability. Updated the wording to clarify that PDBs constrain voluntary disruptions such as node drains, while Deployment and StatefulSet rolling updates are governed by workload update strategies.
- The HA verification example listed `argocd-redis-ha` as a Deployment. Updated the commands and sample output to match the v2.14 HA manifests, which use `argocd-redis-ha-haproxy` as a Deployment and `argocd-redis-ha-server` as a StatefulSet.
- The HA upgrade section made an absolute no-interruption claim. Qualified it to depend on healthy readiness probes, capacity, and load balancing.
- The blue-green example installed the default `install.yaml` into a second namespace. That manifest contains cluster-scoped RBAC with fixed names and is not isolated from an existing install, so the example now uses `namespace-install.yaml` and notes the target-cluster credential requirement.
- The configuration and Application copy examples used broad `sed` namespace replacement on exported Kubernetes objects. Replaced those pipelines with `jq` cleanup of server-generated metadata and explicit namespace assignment.
- The test Application could fail because the target namespace was not created. Added `kubectl create namespace test-upgrade`.
- The switch-over section called Applications "Application CRDs" and included an invalid Ingress patch plus `kubectl rename namespace`, which Kubernetes does not support. Updated the wording to "Application custom resources", replaced the Ingress command with same-namespace Ingress/Route guidance, and removed the namespace rename command.
- The Redis troubleshooting command only covered non-HA installs. Added the HA StatefulSet log command.

## Review Notes
The post is now technically valid as a guide, but the blue-green strategy remains operationally more complex than a rolling HA upgrade because namespace-scoped Argo CD installs need explicit credentials/RBAC for the clusters and namespaces they manage.
