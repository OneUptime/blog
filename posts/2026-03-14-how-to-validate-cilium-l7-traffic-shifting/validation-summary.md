# Validation Summary: Validating Cilium L7 Traffic Shifting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium Service Mesh
- CiliumEnvoyConfig
- Hubble CLI
- Kubernetes
- kubectl
- Bash
- curl

## Sources Consulted
- Cilium L7 Traffic Shifting documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-shifting.html
- Cilium Traffic Splitting Example documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/splitting.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble observe command source/reference for flags: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows.go
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The `grep -c "v1" ... || echo 0` and `grep -c "v2" ... || echo 0` assignments could produce `0` twice when the results file exists but has no matching lines, because `grep -c` prints `0` and exits non-zero for no matches. I removed the fallback `echo 0` so the count remains a valid integer.
- The Hubble example used `--http-status 500-599`, but Hubble's `--http-status` filter matches an HTTP status code prefix such as `5+` rather than a numeric range expression. I changed it to `--http-status 5+` to match all 5xx HTTP responses.

## Review Notes
The examples assume the environment has a client deployment, backend service names, Hubble API access, and response bodies that include version identifiers such as `v1` and `v2`. Those assumptions are consistent with the post's prerequisites and troubleshooting guidance.
