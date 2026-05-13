# Validation Summary: How to Monitor Calico IPAM Release Workflow Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico IPAM
- EndpointSlice
- Bash

## Sources Consulted
- Calico Open Source 3.32 documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source 3.32 documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Open Source 3.32 documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: Services, Endpoints, and EndpointSlice deprecation notes: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The post used `calicoctl ipam show | grep "${IP}"` to verify a released address. Current Calico documentation shows that checking a specific address should use `calicoctl ipam show --ip=<IP>`, and that an unassigned address is reported explicitly. Updated the command to `calicoctl ipam show --ip="${IP}"`.
- The post checked `kubectl get endpoints --all-namespaces`, but the Kubernetes Endpoints API is deprecated in favor of EndpointSlices and can be incomplete for modern or large services. Updated the checks to use `kubectl get endpointslices --all-namespaces -o wide`.
- The release loop used `grep -c "${ip}" || echo 0`, which can produce a multi-line value like `0\n0` when no match is found because `grep -c` prints `0` and exits with status 1. Replaced it with `grep -Fq` checks in the conditional.
- The IP matching commands used default regex matching. Updated them to `grep -F` or `grep -Fq` so IP dots are treated as literal characters.

## Review Notes
The corrected workflow still requires operator judgment. Checking pods and EndpointSlices is a useful guardrail, but it may not cover every possible consumer of an address in a customized Calico deployment.
