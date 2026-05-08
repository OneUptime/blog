# Validation Summary: How to Update the Calico IPPool Resource Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPPool resources
- Calico IPAM
- Kubernetes
- calicoctl
- kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico block size change guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview

## Issues Found
- The introduction incorrectly grouped disabling an IPPool with changes that affect running workloads. Updated it to state that disabling a pool prevents new allocations only, matching Calico documentation.
- The post claimed to cover every modifiable IPPool field, but current Calico IPPool resources also include fields such as `disableBGPExport`, `allowedUses`, and `assignmentMode`. Changed the wording to "common IPPool fields."
- The encapsulation section implied that a calico-node restart is always required. Adjusted the wording so restart is a fallback if the deployment does not converge cleanly, while still advising a maintenance window.
- The CIDR migration section omitted Calico IPAM and Kubernetes cluster CIDR prerequisites from the official migration guide. Added a concise prerequisite sentence.
- The conclusion claimed the CIDR migration pattern ensures zero downtime. Updated it to distinguish existing pod connectivity from possible application interruption when workloads are restarted.
- The verification and troubleshooting sections duplicated the same IPAM block command. Kept the command in verification and simplified the troubleshooting note.

## Review Notes
The examples use current `projectcalico.org/v3` IPPool fields and valid `calicoctl` command forms. The `calico-node` namespace can vary by installation method; the post uses `calico-system`, which is valid for operator-based installs, but readers on manifest-based installs may need to use their installed namespace.
