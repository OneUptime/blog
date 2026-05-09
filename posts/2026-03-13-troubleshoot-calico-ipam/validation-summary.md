# Validation Summary: How to Troubleshoot Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico IPAM
- Kubernetes
- calicoctl
- Tigera operator Installation API

## Sources Consulted
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: IPAMConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico Enterprise documentation: calicoctl ipam check - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico documentation: BlockAffinity resource - https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico documentation: Configure Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip

## Issues Found
- The command shown for viewing node block assignments used `kubectl get ipamhandles -A`. `IPAMHandle` resources track allocation handles, while Calico uses `BlockAffinity` resources to represent block affinities for nodes. Changed the command to `kubectl get blockaffinities.crd.projectcalico.org`.
- The orphaned allocation check reused `calicoctl ipam check --show-all-ips`, which prints all checked IPs. Changed it to `calicoctl ipam check --show-problem-ips`, the documented flag for leaked or incorrectly allocated IPs.
- Clarified the `calicoctl ipam check -o ipam-report.json` comment so it accurately describes writing a consistency report.

## Review Notes
- The `calicoctl ipam check` command and its `--show-all-ips`, `--show-problem-ips`, and `-o` flags are documented in the Calico Enterprise CLI reference. Calico Open Source documentation emphasizes `ipam show`, `ipam configure`, and `ipam release`; environments should confirm their installed `calicoctl` supports `ipam check`.
- The operator Installation snippet uses valid fields and values for an IP pool. The `blockSize` field can only be set when the pool is created, so it should be planned before installation or handled with a migration workflow.
