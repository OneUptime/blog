# Validation Summary: How to Configure Cluster Autoscaler for Multiple kOps InstanceGroups

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- kOps
- Kubernetes
- Kubernetes Cluster Autoscaler
- AWS EC2 Auto Scaling groups
- AWS EC2 launch templates and Mixed Instances Policies
- Kubernetes node labels, selectors, affinity, taints, and tolerations
- kubectl

## Sources Consulted
- kOps managed Cluster Autoscaler addon: https://kops.sigs.k8s.io/addons/#cluster-autoscaler
- kOps InstanceGroup resource: https://kops.sigs.k8s.io/instance_groups/
- kOps InstanceGroup operations: https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/
- kOps label management: https://kops.sigs.k8s.io/labels/
- kOps rolling updates: https://kops.sigs.k8s.io/operations/rolling-update/
- kOps `edit cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_edit_cluster/
- kOps `update cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_update_cluster/
- kOps `rolling-update cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/
- kOps `get instancegroups` CLI reference: https://kops.sigs.k8s.io/cli/kops_get_instancegroups/
- kOps current Cluster Autoscaler manifest template: https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/upup/models/cloudup/resources/addons/cluster-autoscaler.addons.k8s.io/k8s-1.15.yaml.template
- kOps current ASG node-template tag generation: https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/pkg/model/context.go
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Cluster Autoscaler AWS provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler node-group similarity implementation: https://github.com/kubernetes-sigs/cluster-autoscaler/blob/6e285e0f4b4ff0f215604d0f4240ac7994aa1d25/pkg/processors/nodegroupset/compare_nodegroups.go
- Kubernetes node autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes assigning Pods to nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- AWS EC2 current-generation instance types: https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html
- AWS EC2 Auto Scaling process behavior: https://docs.aws.amazon.com/autoscaling/ec2/userguide/understand-how-suspending-processes-affects-other-processes.html

## Issues Found
- **The managed-addon description incorrectly referred to ASG discovery tags.** Current kOps renders explicit `--nodes=<min>:<max>:<group>` arguments for eligible InstanceGroups; it does not configure the managed addon with AWS ASG tag auto-discovery. Updated the text to say that kOps registers eligible groups and generates the ASG node-template label and taint tags used for scale-from-zero simulation.
- **The `least-waste` explanation was too broad.** Cluster Autoscaler defines this expander in terms of the least idle CPU after scale-up, using unused memory as the tie-breaker. Replaced the generic reference to unused capacity with those actual ranking criteria.
- **The similar-node-group criteria incorrectly included taints.** The current comparator evaluates capacity, allocatable and free resources, and labels while ignoring selected provider-specific labels. Taints still affect whether a Pending Pod can run on a candidate template, but they are not directly compared by the similarity function. Updated the balancing explanation accordingly.

## Review Notes
- All YAML snippets parse successfully. The `kops.k8s.io/v1alpha2` InstanceGroup API and the `autoscale`, `autoscalePriority`, `machineType`, `minSize`, `maxSize`, `nodeLabels`, `taints`, `role`, and `subnets` fields remain present in current kOps documentation and API definitions.
- The managed Cluster Autoscaler fields shown in the cluster spec are current. The priority-expander integration and `autoscalePriority` require kOps 1.26 or newer.
- The `kops edit cluster`, `kops update cluster`, `kops rolling-update cluster`, `kops get ig`, and `--instance-group` usages are current. The `kubectl get`, `logs`, and `describe` commands and their shown flags are valid.
- The scale-from-zero, Mixed Instances Policy, single-capacity-owner, node-selector, required-affinity, and toleration explanations are consistent with current official guidance.
- `m7i.large` and `r7i.xlarge` are valid current-generation EC2 instance types. Actual availability and quota must still be checked in the target AWS Region and Availability Zones.
- Enabling per-node-group metrics increases metric cardinality as the number of InstanceGroups grows; this is an operational consideration, not a correctness issue.
- All external links in the post resolved to the intended official documentation during validation.
