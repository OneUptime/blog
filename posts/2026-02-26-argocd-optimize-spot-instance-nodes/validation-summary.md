# Validation Summary: How to Optimize ArgoCD for Spot Instance Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments, PodDisruptionBudgets, affinity, anti-affinity, taints, and tolerations
- Kyverno ClusterPolicy validation
- AWS EC2 Spot Instances and AWS Node Termination Handler
- Google Kubernetes Engine Spot VMs
- Azure Kubernetes Service Spot node pools
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes scheduling, node affinity, pod anti-affinity, taints, and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD OCI and Helm source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- AWS EC2 Spot Instance interruption notice documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Amazon EKS managed node group documentation: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- AWS Node Termination Handler documentation: https://github.com/aws/aws-node-termination-handler
- Google Compute Engine Spot VM documentation: https://cloud.google.com/compute/docs/instances/spot
- GKE Spot VM documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms
- Azure Spot VM eviction guidance: https://learn.microsoft.com/en-us/azure/architecture/guide/spot/spot-eviction
- AKS Spot node pool documentation: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool

## Issues Found
- Corrected the GCP terminology. The post described GCP spot capacity as "Preemptible VMs"; GCP now documents Spot VMs separately while still supporting older Preemptible VMs.
- Replaced the universal "2 min warning" wording with "interruption notice" because AWS provides a two-minute notice, while GCP and Azure document shorter or best-effort notice periods.
- Changed the PDB recommendation to apply to replicated workloads and voluntary evictions. Kubernetes PDBs do not prevent all involuntary disruptions.
- Clarified Argo CD self-healing. Argo CD reconciles live-resource drift, while Kubernetes controllers recreate evicted pods.
- Fixed the Deployment example by adding the required `spec.selector`, adding matching pod template labels, and moving `podAntiAffinity` to the correct level under `affinity`.
- Replaced the non-standard `node.kubernetes.io/capacity-type` label and `kubernetes.io/spot` taint with example labels/taints and added a note to use provider-specific values.
- Simplified the `preStop` hook. Kubernetes sends SIGTERM after the preStop hook completes, so the example no longer sends an extra signal to PID 1.
- Updated the Argo CD retry explanation so it describes sync retries, not Kubernetes scheduler retry behavior.
- Updated the Kyverno policy to use `validate.failureAction: Audit` because top-level `spec.validationFailureAction` is deprecated.
- Corrected the Argo CD application controller example to patch the controller as a `StatefulSet`, which matches the standard Argo CD application-controller resource.
- Updated the AWS Node Termination Handler Helm source from the old EKS charts repository to the current Public ECR OCI chart location and refreshed the chart version.
- Updated the Prometheus label examples to match the example `capacity-type` node label used in the article.

## Review Notes
The YAML snippets were checked for YAML syntax. Full Kubernetes schema validation was not run because `kubectl` and `kubeconform` were not available in the local environment.
