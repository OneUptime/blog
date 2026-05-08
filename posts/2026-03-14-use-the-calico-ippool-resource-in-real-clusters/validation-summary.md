# Validation Summary: Using the Calico IPPool Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPPool resources
- Kubernetes
- Calico IPAM
- calicoctl
- kubectl
- Typha
- FelixConfiguration
- BGPConfiguration
- Kubernetes RBAC

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get reference and supported resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The node inspection command used `kubectl get node ... | grep projectcalico`, which does not reliably show Calico's node-specific view. Changed it to `calicoctl get node <node-name> -o yaml`.
- The combined-resource example listed IPPool twice and did not show the BGP resource referenced in the following paragraph. Changed the duplicate `calicoctl get ippools -o yaml` to `calicoctl get bgpconfiguration -o yaml`.
- The IPPool watch command used a singular fully qualified Kubernetes resource name. Changed it to `kubectl get ippools.projectcalico.org -w` to match the resource form documented for kubectl access.
- The Felix health endpoint text incorrectly tied health checks to Prometheus metrics. Changed it to refer to Felix health reporting and updated the example to check `localhost:9099` inside the `calico-node` container, matching Felix health host defaults.
- The RBAC check combined an action-specific `kubectl auth can-i` command with `--list`, which is not the documented usage. Changed it to a direct `kubectl auth can-i create globalnetworkpolicies.projectcalico.org` check for the current identity.

## Review Notes
- The post is technically relevant and contains practical commands for Calico production operations.
- `calicoctl node status` is valid, but official Calico documentation notes that it must be run on the node whose local Calico agent is being checked.
- Calico namespaces can differ by installation method; the post consistently uses `calico-system`, which matches operator-based installations, but manifest-based installations may use a different namespace.
