# Validation Summary: How to Configure Fleet Agent Options

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Fleet cluster registration docs: https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Fleet resource limits docs: https://fleet.rancher.io/how-tos-for-operators/resource-limits
- Fleet installation docs: https://fleet.rancher.io/how-tos-for-operators/installation
- Fleet custom resources spec: https://fleet.rancher.io/reference/ref-crds
- Fleet `fleet-agent` chart README: https://github.com/rancher/fleet/blob/master/charts/fleet-agent/README.md
- Fleet `fleet-agent` chart values: https://github.com/rancher/fleet/blob/master/charts/fleet-agent/values.yaml
- Fleet `fleet-agent` chart deployment template: https://github.com/rancher/fleet/blob/master/charts/fleet-agent/templates/deployment.yaml
- Fleet `fleet-agent` chart config template: https://github.com/rancher/fleet/blob/master/charts/fleet-agent/templates/configmap.yaml
- Fleet `Cluster` API type: https://github.com/rancher/fleet/blob/master/pkg/apis/fleet.cattle.io/v1alpha1/cluster_types.go
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post treated the `fleet-agent` Helm chart as the Rancher-managed path. I corrected the introduction and prerequisites to distinguish standalone agent-initiated registration from Rancher-managed downstream agents.
- The initial install example used unsupported or misleading values, including `clusterName`, `agent.resources.*`, and nested `agent.*` scheduling and environment fields. It also contained an inline shell comment that would break the multiline Helm command. I replaced that command with supported chart values and the registration `values.yaml` flow documented by Fleet.
- The configuration snippets for resources, proxy settings, tolerations, node selection, TLS, and labels used outdated or incorrect fields such as `agent.resources`, `agent.extraEnv`, `agent.tolerations`, `agent.nodeSelector`, `agent.affinity`, `clusterLabels`, `clusterAnnotations`, `extraVolumeMounts`, and `extraVolumes`. I updated those sections to use the current supported chart values or the current Fleet `Cluster.spec` fields such as `agentResources`, `agentEnvVars`, `agentTolerations`, and `agentAffinity`.
- The update workflow incorrectly recommended `helm upgrade` on existing downstream agents. I changed this to updating the Fleet `Cluster` resource, which matches Fleet's post-registration managed-agent lifecycle.
- The verification and troubleshooting commands included invalid or misleading examples, including selector usage with `kubectl exec` and a namespace-specific cluster status lookup that was not generally correct. I replaced them with valid `kubectl` commands and a cluster-wide `clusters.fleet.cattle.io` status query.

## Review Notes
- The examples use `clusters` as the namespace for Fleet `Cluster` resources because that namespace is used in the official registration docs. Replace it with your own Fleet cluster namespace if your environment differs.
- The chart's registration-time `labels` setting is only applied when the cluster is first registered.
- `kubectl top` requires metrics-server to be installed.
