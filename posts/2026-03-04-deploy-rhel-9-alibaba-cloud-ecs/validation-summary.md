# Validation Summary: How to Deploy RHEL on Alibaba Cloud ECS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Alibaba Cloud Elastic Compute Service
- Alibaba Cloud CLI
- Alibaba Cloud Cloud Disks / ESSD
- Alibaba Cloud CloudMonitor
- firewalld
- OpenSSH
- dnf-automatic

## Sources Consulted
- Alibaba Cloud ECS RunInstances API documentation: https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-runinstances
- Alibaba Cloud ECS CreateDisk API documentation: https://www.alibabacloud.com/help/doc-detail/2679766.html
- Alibaba Cloud ECS AttachDisk API documentation: https://www.alibabacloud.com/help/en/ecs/developer-reference/api-ecs-2014-05-26-attachdisk
- Alibaba Cloud ECS public image documentation: https://www.alibabacloud.com/help/en/ecs/user-guide/public-mirroring-overview
- Alibaba Cloud image billing documentation: https://www.alibabacloud.com/help/en/ecs/images
- Alibaba Cloud CloudMonitor C++ agent documentation: https://www.alibabacloud.com/help/en/cms/cloudmonitor-1-0/user-guide/install-and-uninstall-the-cloudmonitor-agent-for-cpp
- Alibaba Cloud CloudMonitor InstallMonitoringAgent API documentation: https://www.alibabacloud.com/help/en/cms/cloudmonitor-1-0/developer-reference/api-cms-2019-01-01-installmonitoringagent
- Red Hat Enterprise Linux 9 DNF Automatic documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool

## Issues Found
- The post described RHEL as a marketplace image. Alibaba Cloud documents RHEL as a paid public image, so the wording was corrected.
- The RunInstances example used a fixed-looking RHEL image ID and old flattened system disk parameter names. The example now uses a replaceable RHEL 9 image ID placeholder and the documented `SystemDisk.Category` and `SystemDisk.Size` parameters.
- The RunInstances example later expected SSH to a public IP, but did not request outbound public bandwidth. Added `InternetMaxBandwidthOut` so a public IP can be assigned.
- The cloud disk section created a disk but did not attach it. Added an `AttachDisk` command using the `DiskId` returned by `CreateDisk`.
- The CloudMonitor section used the older Go agent install URL. Alibaba Cloud now recommends the C++ agent, so the section was updated to use the `InstallMonitoringAgent` API and verify the `argusagent` process.
- The SSH hardening commands only worked if specific commented defaults existed in `/etc/ssh/sshd_config`. Replaced them with a RHEL 9-compatible drop-in file and added `sshd -t` validation before restart.

## Review Notes
The examples still use placeholder resource IDs and device names. In a production guide, it would be useful to add commands for discovering the RHEL image ID and confirming the attached disk device name before partitioning.
