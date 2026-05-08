# Validation Summary: Validate Calico NetworkPolicy Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico Felix
- Calico tiers and policy ordering
- calicoctl
- Kubernetes kubectl
- Kubernetes pods and services
- Prometheus metrics

## Sources Consulted
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Open Source NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Mermaid diagram referenced a "calicoctl selector query", but the current calicoctl command reference does not provide a selector query command. Changed the diagram label to "kubectl label query" to match the command shown in the post.
- The Felix metrics check executed `curl` inside the `calico-node` DaemonSet, which depends on `curl` being installed in that container image. Changed the example to use `kubectl port-forward` to the DaemonSet and run `curl` locally, matching the documented metrics endpoint behavior on port 9091.

## Review Notes
The command examples assume Felix Prometheus metrics are enabled and reachable on port 9091. Calico documents 9091 as the default Felix metrics port, but metrics exposure can still depend on cluster configuration.
