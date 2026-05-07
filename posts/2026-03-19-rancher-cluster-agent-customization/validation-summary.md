# Validation Summary: How to Configure Cluster Agent Customization in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher cluster agent (`cattle-cluster-agent`)
- Rancher node agent (`cattle-node-agent`)
- Rancher system agent (`rancher-system-agent`)
- Kubernetes scheduling features such as tolerations, affinity, and PriorityClass

## Sources Consulted
- Rancher Docs: Rancher Agents - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher Docs: Enabling Cluster Agent Scheduling Customization - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-cluster-agent-scheduling-customization
- Rancher Docs: Registered Clusters troubleshooting - https://ranchermanager.docs.rancher.com/troubleshooting/other-troubleshooting-tips/registered-clusters
- Rancher Docs: Rancher Agent Options - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes/rancher-agent-options
- Rancher source: provisioning cluster schema - https://github.com/rancher/rancher/blob/main/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher source: management cluster schema - https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher source: default cluster agent affinity and scheduling settings - https://github.com/rancher/rancher/blob/main/pkg/settings/agent_customization.go
- Rancher source: downstream cluster agent template - https://github.com/rancher/rancher/blob/main/pkg/systemtemplate/template.go
- Rancher Dashboard source: Cluster Agent configuration UI - https://github.com/rancher/dashboard/blob/master/shell/edit/provisioning.cattle.io.cluster/tabs/AgentConfiguration.vue
- Kubernetes Docs: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post treated node-agent resource customization as a supported Rancher customization surface. I corrected this to reflect that Rancher documents cluster-agent customization through `clusterAgentDeploymentCustomization`, while `cattle-node-agent` is an RKE-specific downstream component and RKE2/K3s use `rancher-system-agent` for node lifecycle operations.
- The resource, toleration, affinity, environment-variable, and priority examples were written as direct downstream `Deployment` or `DaemonSet` edits rather than the supported Rancher configuration fields. I replaced them with the documented Rancher fields: `clusterAgentDeploymentCustomization.overrideResourceRequirements`, `appendTolerations`, `overrideAffinity`, `agentEnvVars`, and `schedulingCustomization.priorityClass`.
- The affinity example did not match Rancher’s current default scheduling behavior and used an inaccurate worker-node preference. I replaced it with an `overrideAffinity` example that preserves the required Linux scheduling rule and uses the current Rancher-preferred labels.
- The environment variable example included undocumented variables (`CATTLE_AGENT_CONNECT_TIMEOUT` and `CATTLE_AGENT_RETRY_TIMEOUT`). I removed those and kept the documented proxy-related variables.
- The image override example used a fully qualified image for the global `agent-image` setting, which is incorrect when Rancher is using `system-default-registry`. I changed the global setting example to `repo:tag` form and clarified that Rancher prepends the registry automatically, while keeping the per-cluster `agentImageOverride` example fully qualified.
- The priority-class section described manually creating a `PriorityClass` and setting `priorityClassName` directly on the agent workload. I corrected this to the Rancher-managed `cluster-agent-scheduling-customization` feature flag and `schedulingCustomization.priorityClass` flow.
- The troubleshooting command `kubectl logs ... --field-selector spec.nodeName=...` was invalid for `kubectl logs`. I replaced it with a supported flow that lists `cattle-node-agent` pods first and then retrieves logs from a specific pod, and I scoped those commands to RKE clusters.

## Review Notes
- Rancher’s current documentation and source distinguish between older RKE clusters, which may still have `cattle-node-agent`, and Rancher-provisioned RKE2/K3s clusters, which use `rancher-system-agent` for node lifecycle operations.
- PriorityClass and PodDisruptionBudget customization for the cluster agent depends on the `cluster-agent-scheduling-customization` feature flag. Existing clusters may need to be opted in after the flag is enabled.
