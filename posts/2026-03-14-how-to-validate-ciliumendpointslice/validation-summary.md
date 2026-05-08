# Validation Summary: Validating CiliumEndpointSlice Configuration and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumEndpointSlice
- CiliumEndpoint
- Kubernetes CRDs
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium CiliumEndpointSlice documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpointslice/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium v1.19.3 CiliumEndpointSlice API type definition: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/v2alpha1/types.go
- Cilium v1.19.3 CiliumEndpointSlice CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2alpha1/ciliumendpointslices.yaml
- Cilium v1.19.3 CiliumEndpoint CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumendpoints.yaml
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/

## Issues Found
- The CES data consistency example used `.identityID`, but the current CiliumEndpointSlice schema serializes the endpoint identity field as `.id`. Changed the jq expression to read `.id`.
- The coverage example compared endpoint names without namespaces. CiliumEndpoint is namespaced, while CiliumEndpointSlice is cluster-scoped and stores the source namespace in `.namespace`, so name-only comparisons can produce false matches or false duplicate reports when different namespaces contain endpoints with the same name. Updated the script to compare `namespace/name` pairs.
- The coverage example only counted endpoints and checked duplicates, which did not actually identify missing or stale slice entries. Added `comm` checks for missing CiliumEndpoints and stale endpoints present only in slices.
- The coverage counters used `echo "$VAR" | wc -l`, which counts one line even when the variable is empty. Updated the counters to filter empty lines before counting.

## Review Notes
- CES is still documented by Cilium as a beta feature and is disabled by default.
- Cilium's documentation recommends enabling CES through the Helm value `ciliumEndpointSlice.enabled=true` or the `--enable-cilium-endpoint-slice` flag. The post's ConfigMap check is useful for installed clusters, but Helm values or live pod arguments may be clearer when auditing how CES was enabled.
