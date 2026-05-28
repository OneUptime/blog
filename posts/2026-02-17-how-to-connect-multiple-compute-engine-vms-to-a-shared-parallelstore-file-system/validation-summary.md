# Validation Summary: How to Connect Multiple Compute Engine VMs to a Shared Parallelstore File System

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Parallelstore
- Google Compute Engine
- Private Services Access and VPC networking
- Google Cloud CLI
- DAOS client and DAOS agent
- dfuse
- DAOS interception library

## Sources Consulted
- Google Cloud Parallelstore overview: https://docs.cloud.google.com/parallelstore/docs/overview
- Google Cloud Parallelstore VPC configuration: https://cloud.google.com/parallelstore/docs/vpc
- Google Cloud Parallelstore instance creation: https://docs.cloud.google.com/parallelstore/docs/create-instance
- Google Cloud Parallelstore Compute Engine connection guide: https://docs.cloud.google.com/parallelstore/docs/connect-from-compute-engine
- Google Cloud Parallelstore multiple Compute Engine clients guide: https://cloud.google.com/parallelstore/docs/connect-from-compute-engine-multiple-clients
- Google Cloud Parallelstore dfuse reference: https://docs.cloud.google.com/parallelstore/docs/dfuse
- Google Cloud Parallelstore performance considerations: https://docs.cloud.google.com/parallelstore/docs/performance
- Google Cloud Parallelstore supported locations: https://docs.cloud.google.com/parallelstore/docs/locations
- Google Cloud Parallelstore interception library guide: https://cloud.google.com/parallelstore/docs/interception-library

## Issues Found
- The supported OS list was incomplete and used a generic Rocky Linux 9 label. Updated it to match the documented client images: Debian 12, Ubuntu 22.04, Rocky Linux 9 Optimized, RHEL 9, and HPC Rocky Linux 8.
- The Private Services Access setup omitted Service Networking enablement and the firewall rule that allows TCP traffic from the allocated IP range. Added both commands and removed the hard-coded IP range address.
- The Parallelstore capacity example used `12288` GiB and described 4 TiB increments. Updated the text and command to the documented range of 12,000 to 100,000 GiB in 4,000 GiB increments.
- The Parallelstore commands used GA `gcloud parallelstore`; the current official examples use `gcloud beta parallelstore`. Updated create, describe, and delete commands.
- The create command omitted documented stripe-level options. Added balanced file striping and max directory striping.
- The VM placement text claimed cross-zone mounting is unsupported. The official guidance states same-zone placement is recommended for best performance, so the wording was corrected.
- The DAOS client install commands used the upstream DAOS v2.4 repository and installed `daos-agent`. Replaced them with Google Parallelstore v2.6 package repository commands and `daos-client` installation.
- The DAOS agent configuration omitted `include_fabric_ifaces`, used an unnecessary `port` field, and used a less reliable access point format. Updated the access point command and agent configuration.
- The DAOS agent startup commands used systemd on Debian 12. Updated them to start `daos_agent` directly with `/etc/daos/daos_agent.yml`, matching the documented Debian 12 flow.
- The dfuse mount command omitted recommended options for write-back caching, thread count, event queue count, and multi-user mode. Updated the mount command and startup script.
- The cleanup command used `fusermount -u`; the official guide uses `sudo umount`. Updated the cleanup step.

## Review Notes
The post is technically relevant and validated after fixes. The examples are focused on Debian 12 clients; users on Ubuntu 22.04 or RHEL/Rocky images need the OS-specific install and agent-start commands from the official Compute Engine connection guide.
