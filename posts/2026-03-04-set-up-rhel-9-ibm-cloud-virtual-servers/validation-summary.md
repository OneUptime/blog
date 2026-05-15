# Validation Summary: How to Set Up RHEL for IBM Cloud Virtual Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- IBM Cloud Virtual Servers for VPC
- IBM Cloud CLI VPC infrastructure commands
- IBM Cloud Block Storage for VPC
- IBM Cloud Monitoring / Sysdig agent
- firewalld
- Linux file system mounting

## Sources Consulted
- IBM Cloud VPC CLI reference: https://cloud.ibm.com/docs/vpc/docs/vpc?topic=vpc-vpc-reference
- IBM Cloud x86 virtual server images: https://cloud.ibm.com/docs/vpc?topic=vpc-about-images
- IBM Cloud connecting to Linux instances: https://cloud.ibm.com/docs/vpc?topic=vpc-vsi_is_connecting_linux
- IBM Cloud creating virtual server instances: https://cloud.ibm.com/docs/vpc?topic=vpc-creating-virtual-servers
- IBM Cloud attaching Block Storage for VPC: https://cloud.ibm.com/docs/vpc?topic=vpc-attaching-block-storage
- IBM Cloud setting up Block Storage for VPC data volumes on Linux: https://cloud.ibm.com/docs/vpc?topic=vpc-start-using-your-block-storage-data-volume-lin
- IBM Cloud security group rules: https://cloud.ibm.com/docs/vpc?topic=vpc-security-groups-rules
- IBM Cloud Monitoring Linux agent: https://cloud.ibm.com/docs/monitoring?topic=monitoring-agent_linux
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The RHEL image search used `red-hat.*9`, but IBM stock image names use the `ibm-<family>-<version>-<type>-<architecture>-<build>` convention with `redhat` as the family. Changed the grep pattern to `ibm-redhat-9`.
- The guide said to SSH as `root`, but IBM Cloud VPC RHEL stock images configure SSH keys for the default `vpcuser` account. Changed the SSH command to use `vpcuser` with an explicit private key and updated privileged commands to use `sudo`.
- The instance creation section referenced SSH through a floating IP but did not include a floating IP reservation or attachment command. Added the IBM Cloud CLI command to reserve a floating IP on the instance primary network interface after identifying the interface ID.
- The block storage attachment command omitted the required attachment name positional argument. Added `rhel9-data-attachment` as the attachment name.
- The storage setup hard-coded `/dev/vdd`, which might not match the actual device name. Updated the snippet to list devices with `lsblk`, set the discovered data device, and write `/etc/fstab` with the volume UUID and `_netdev`.

## Review Notes
The monitoring agent installation command matches IBM Cloud Monitoring's documented Linux agent installer pattern. The security group rule syntax is current, but users should replace `$SG_ID`, `$PRIMARY_NIC_ID`, `$RHEL9_IMAGE_ID`, and `$SSH_KEY_ID` with values from their own account and region.
