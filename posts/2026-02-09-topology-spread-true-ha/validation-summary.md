# Validation Summary: How to Configure Kubernetes Pod Topology Spread Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments and StatefulSets
- Kubernetes pod topology spread constraints
- Kubernetes pod anti-affinity
- kube-scheduler configuration
- kubectl commands
- Bash and jq helper scripts

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: kube-scheduler Configuration (v1) - https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Google Cloud documentation: About GKE cluster autoscaling - https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- Google Cloud SDK documentation: gcloud container clusters update - https://cloud.google.com/sdk/gcloud/reference/container/clusters/update

## Issues Found
- The pod counting command passed node resource names such as `node/example` into `spec.nodeName`, but the field selector expects the bare node name. Updated the command to obtain `.metadata.name` values from nodes before querying pods.
- The StatefulSet explanation implied that three replicas are always forced into three different availability zones. Clarified that this outcome depends on having three eligible zones and described the actual even zone distribution behavior.
- The distribution-checking script used JSONPath syntax that does not correctly access label keys containing dots and slashes, such as `topology.kubernetes.io/zone`. Updated it to use `jq` with bracket access for label keys.
- The multi-constraint explanation said constraints are evaluated in order. Kubernetes combines multiple topology spread constraints together; `DoNotSchedule` constraints must be satisfied and `ScheduleAnyway` constraints affect scoring. Updated the explanation accordingly.
- The scheduler defaults section said every pod automatically uses defaults. Updated it to state that defaults apply to pods that do not define explicit topology spread constraints.
- The managed Kubernetes section presented GKE autoscaling profile configuration as default topology spreading. Replaced it with provider-neutral guidance to use workload-level `topologySpreadConstraints` when scheduler configuration is not available and to verify zone labels on nodes.
- The zone failure test used an undefined `$NODE` variable when deleting pods. Updated it to loop over nodes in the cordoned zone and delete pods using valid `spec.nodeName` field selectors.

## Review Notes
The Kubernetes YAML snippets parse successfully. `kubectl` is not installed in this workspace, so command behavior was verified against official Kubernetes documentation rather than by running commands against a live cluster.
