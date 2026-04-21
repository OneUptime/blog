# Validation Summary: How to Configure Taints and Tolerations in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Kubernetes UI
- Kubernetes taints and tolerations
- Kubernetes Deployments and Pod specs
- kubectl CLI
- NVIDIA GPU extended resources
- TensorFlow Docker image

## Sources Consulted
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl taint reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes assigning pods to nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Portainer cluster details documentation: https://docs.portainer.io/user/kubernetes/cluster/details
- Portainer inspect node documentation: https://docs.portainer.io/user/kubernetes/cluster/details/node
- Portainer add application using a form documentation: https://docs.portainer.io/user/kubernetes/applications/add
- Portainer add application using code documentation: https://docs.portainer.io/user/kubernetes/applications/manifest
- TensorFlow Docker documentation: https://www.tensorflow.org/install/docker

## Issues Found
1. **Overstated Portainer UI support for tolerations.** The post said Portainer provides a UI to manage taints and tolerations and described adding a toleration through the form-based Placement section. Portainer's current documentation shows node taints in the node details UI, while form-based application placement rules are node-label rules. Updated the wording to direct tolerations through Kubernetes manifests deployed from Portainer.
2. **Outdated Portainer node navigation path.** The post used **Cluster** > **Nodes**. Current Portainer documentation shows **Cluster** > **Details**, then selecting a node from the Nodes section. Updated the steps accordingly.
3. **Missing scheduling nuance for tolerations.** The post implied tolerations can force hardware placement. Kubernetes documentation states tolerations allow scheduling onto tainted nodes but do not guarantee selection. Added a note to combine tolerations with node labels, `nodeSelector`, or node affinity when a workload must run only on those nodes.

## Review Notes
- The `kubectl taint` add and remove commands use valid taint syntax, including `NoSchedule`, `PreferNoSchedule`, and `NoExecute` effects.
- The Deployment manifest uses the current `apps/v1` API, includes a matching selector and pod template labels, and places `tolerations` correctly under the pod template spec.
- The GPU resource request under `resources.limits.nvidia.com/gpu` is consistent with Kubernetes GPU scheduling guidance, assuming the cluster has NVIDIA GPU device plugin support installed.
- The `kubectl get pods --field-selector spec.nodeName=node1` verification command uses a supported Pod field selector.
- `kubectl` was not installed in the local environment, so CLI verification was performed against the official Kubernetes reference rather than local `kubectl --help` output.
