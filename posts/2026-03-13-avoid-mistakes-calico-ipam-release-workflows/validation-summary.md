# Validation Summary: Common Mistakes to Avoid with Calico IPAM Release Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- kubectl
- Kubernetes EndpointSlice API
- Bash

## Sources Consulted
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Services, EndpointSlices, and deprecated Endpoints API: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post-release check used `calicoctl ipam show | grep "${IP}"`, but `calicoctl ipam show` without `--ip` prints an overall IP pool summary. Changed it to `calicoctl ipam show --ip="${IP}"`, which is the documented form for checking one specific IP address.
- The examples used the legacy `endpoints` resource for IP verification. Kubernetes v1.33 marks the Endpoints API as deprecated and recommends EndpointSlice. Changed the verification commands to use `endpointslices.discovery.k8s.io`.
- The best-practice shell loop used `grep -c "${ip}" || echo 0`, which can produce a multi-line value when no matches are found and break the integer comparison. Replaced it with a direct `grep -Fq` conditional.
- The comment that `calicoctl ipam check` should show `"consistent"` was too specific for the documented command behavior. Changed it to say to verify that no new problems are reported.
- Replaced plain `grep` with `grep -F`/`grep -Fq` for IP strings so dots are treated literally rather than as regular-expression wildcards.

## Review Notes
The Calico release command and check command are valid in current Calico documentation. For large or high-change clusters, the official Calico documentation also documents a report-based workflow with `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report report.json`, optionally with a datastore lock while checking and releasing leaked addresses.
