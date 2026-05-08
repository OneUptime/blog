# Validation Summary: Using the Calico IPAMConfiguration Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAMConfiguration
- Calico IPPool
- Calico FelixConfiguration
- Calico Typha
- kubectl
- calicoctl

## Sources Consulted
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico calicoctl IPAM configure reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico monitoring documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post described applying different IPAMConfiguration resources with node selectors. Calico documents IPAMConfiguration as a singleton named `default`, and node-based allocation selection belongs on IPPool `nodeSelector`. Updated the multi-environment section to keep IPAMConfiguration global and use IPPool node selectors for environment-specific address pools.
- The post implied scale tuning via IPAMConfiguration reconciliation intervals and many IPAMConfiguration resources. The official IPAMConfiguration spec includes `strictAffinity`, `maxBlocksPerHost`, and KubeVirt address persistence, not reconciliation interval settings or multiple resources. Updated the scale guidance to discuss `maxBlocksPerHost`, IPPool block sizing, and many IP pools/allocation blocks.
- The monitoring and verification examples did not specify the singleton `default` resource when retrieving or watching IPAMConfiguration. Updated those examples to target `default`.
- The Felix health endpoint note tied health checks to Prometheus metrics. Felix health checks are controlled by Felix health settings, while Prometheus metrics use separate settings and ports. Updated the note to refer to Felix health checks.
- The troubleshooting section told readers to check Felix logs for IPAMConfiguration reloads. IPAM allocation problems are more appropriately investigated through calico-node/IPAM logs and state. Updated the troubleshooting note accordingly.
- The capacity planning section referred to a generic Calico metrics endpoint for IPAM utilization. Updated it to point readers at Calico IPAM utilization checks, matching the `calicoctl ipam show` command already used in the post.
- The CRD version command printed the CRD name and age column rather than the served/storage versions. Updated it to use Kubernetes custom columns for `.spec.versions[*].name`.
- The RBAC check mixed `kubectl auth can-i --list` with a specific verb/resource check. Updated it to a valid `kubectl auth can-i create ...` form.

## Review Notes
The post assumes `kubectl` access to Calico resources in the `projectcalico.org/v3` API group. Calico documentation notes that this requires the Calico API server; operator-based installs include it by default, while other installs may still require `calicoctl` for some operations. `kubectl` was not installed in this workspace, so command syntax was checked against official Kubernetes command references rather than local `--help` output.
