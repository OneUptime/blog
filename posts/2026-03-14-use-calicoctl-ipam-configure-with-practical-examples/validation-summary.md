# Validation Summary: Using calicoctl ipam configure with Practical Examples

## Status
validated

## Post Type
Technical tutorial / CLI guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- Calico IPPool resources
- AWS networking considerations for Calico

## Sources Consulted
- Calico documentation: calicoctl ipam configure - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: IPAMConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: Amazon Web Services - https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Calico documentation: Determine best networking option - https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico documentation: Windows Calico requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements

## Issues Found
- The post used `calicoctl ipam configure show`, which is not the documented command for displaying current IPAM configuration. Changed these examples to `calicoctl ipam show --show-configuration` and updated the sample output to match the documented table format.
- The strict affinity explanation described the setting mainly as exclusive block ownership. Updated it to the documented behavior: when `StrictAffinity` is true, borrowing IP addresses from blocks affine to other nodes is not allowed.
- The post claimed strict affinity is required for AWS VPC routing and listed Azure CNI integration as a reason to enable it. Official Calico docs do not support that broad claim. Updated the guidance to cite Calico for Windows with Calico IPAM as the documented required case, and narrowed the AWS example to single-subnet Calico routing.
- The block-size example described `/26` as "64 IPs per block per node." Updated it to "64 IPs per block" because a node may receive additional affine blocks.
- Troubleshooting text implied disabling strict affinity could directly create IP conflicts. Updated it to recommend `calicoctl ipam check` for suspected IPAM inconsistencies, matching the documented purpose of the command.

## Review Notes
The post is now technically aligned with current Calico documentation. Future improvements could mention other `calicoctl ipam configure` options such as `--max-blocks-per-host` and `--kubevirt-ip-persistence`, but that is outside the strict-affinity focus of this article.
