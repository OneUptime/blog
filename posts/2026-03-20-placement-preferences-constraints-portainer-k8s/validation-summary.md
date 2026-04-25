# Validation Summary: How to Set Placement Preferences and Constraints in Portainer for Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes node selectors
- Kubernetes node affinity
- Kubernetes pod anti-affinity
- Kubernetes taints and tolerations
- `kubectl`

## Sources Consulted
- Portainer documentation: Applications - https://docs.portainer.io/user/kubernetes/applications
- Portainer documentation: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer documentation: Add a new application using code - https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer documentation: Create an application from a Manifest - https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: `kubectl label` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Google Kubernetes Engine documentation: Spot VMs - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms

## Issues Found
- The overview said Portainer exposes node affinity, pod affinity/anti-affinity, and tolerations through the application deployment form. Current Portainer docs show that the form exposes node-label-based placement rules, while full affinity and toleration control requires deploying a manifest through `Create from code`. I corrected the overview, configuration section, and conclusion to match the documented product behavior.
- The Portainer UI instructions referenced generic sections like `Placement` or `Advanced settings` and suggested adding affinity rules from the form. Current Portainer docs use the `Placement preferences and constraints` section with `add rule` and `Mandatory` or `Preferred` placement policies. I updated the steps to match the documented UI and capabilities.
- The pod anti-affinity section said the example would prevent all replicas from landing on the same node, but the YAML used `preferredDuringSchedulingIgnoredDuringExecution`, which is a soft preference rather than a strict requirement. I changed the explanatory sentence so it accurately reflects the scheduler behavior.

## Review Notes
- The Kubernetes YAML snippets are syntactically valid after review.
- The examples use some GKE-specific labels and taints such as `cloud.google.com/gke-nodepool` and `cloud.google.com/gke-spot`; these are valid on GKE but should be replaced with cluster-specific labels or taints on other Kubernetes platforms.
