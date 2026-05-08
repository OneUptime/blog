# Validation Summary: How to Validate Calico IPAM Release Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl
- EndpointSlice
- Bash

## Sources Consulted
- Calico Open Source calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico Enterprise `calicoctl ipam check` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Enterprise `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post used `calicoctl ipam show | grep "${IP}"` for per-IP post-release validation. Official calicoctl documentation uses `calicoctl ipam show --ip=<IP>` for a specific IP, and the expected post-release result is that the IP is not currently assigned. Updated the command and comment accordingly.
- The post treated `calicoctl ipam check` as universally available in current Calico Open Source documentation. Current Calico Open Source IPAM docs list `release`, `show`, and `configure`, while the `ipam check` reference is documented under Calico Enterprise. Added wording that the check applies in Calico environments that provide `calicoctl ipam check`.
- The snippets used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated as of Kubernetes v1.33 in favor of EndpointSlice. Replaced the endpoint lookup with `kubectl get endpointslices --all-namespaces -o yaml`.
- The Bash loop used `grep -c "${ip}" || echo 0`; because `grep -c` prints `0` and exits non-zero when no match is found, command substitution can produce `0` followed by another `0`, breaking the numeric comparison. Rewrote the loop to use `grep -q` checks.

## Review Notes
The workflow is operationally valid after the corrections, but live clusters should still confirm the installed calicoctl edition and version because `ipam check` availability differs between documented Calico distributions.
