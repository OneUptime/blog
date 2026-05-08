# Validation Summary: How to Create the Calico WorkloadEndpoint Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico WorkloadEndpoint resources
- Calico network policy and profiles
- `calicoctl`
- Kubernetes
- YAML resource manifests

## Sources Consulted
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico libcalico-go WorkloadEndpointSpec API reference: https://pkg.go.dev/github.com/projectcalico/libcalico-go/lib/apis/v3#WorkloadEndpointSpec
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post implied that manually creating or managing Kubernetes pod WorkloadEndpoint resources is a normal workflow. Calico's documentation says WorkloadEndpoint lifecycle is generally handled by an orchestrator-specific plugin and recommends using `calicoctl` mainly to view this resource type. Updated the introduction and scope language to clarify that manual creation is for non-Kubernetes or custom-orchestrator cases.
- The multi-interface examples used `orchestrator: k8s` and `pod` fields, which could imply hand-creating Kubernetes-managed pod endpoints. Updated those examples to use a custom orchestrator and `workload` field, with matching profile names.
- The verification command `calicoctl get workloadendpoints --node=node1 -o wide` used a `--node` flag that is not supported by the current `calicoctl get` command. Replaced it with `calicoctl get workloadendpoints --all-namespaces -o wide | grep node1`.

## Review Notes
The remaining WorkloadEndpoint fields, YAML shapes, `calicoctl apply` usage, namespace flag usage, and `kubectl exec TYPE/NAME -- COMMAND` form were consistent with the official references checked. The examples remain illustrative; in real clusters, profile names, interface names, namespaces, IP assignments, and datastore permissions must match the actual Calico installation.
