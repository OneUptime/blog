# Validation Summary: How to Choose Server Form Factor for Ceph Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- Server hardware form factors (1U, 2U, 4U, JBOD)
- Network configurations (10/25 GbE bonding, OCP 3.0)
- BlueStore OSD memory requirements

## Sources Consulted
- Ceph official documentation: OSD memory target defaults (`osd_memory_target` = 4 GiB) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph hardware recommendations — https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Industry-standard server specifications (Supermicro, Dell PowerEdge) for drive bay counts per form factor
- Standard rack unit sizing (EIA-310)

## Issues Found
- **Incorrect drive count in calculation example**: The post stated "With 24 drives per 4U server: 1 server handles all disks in 4U" but the calculation requires 25 disks (300 TB / 12 TB = 25). A 24-drive server cannot hold 25 disks. Changed to "With 36 drives per 4U server" which is a common 4U dense configuration and correctly fits the 25 required disks.

## Review Notes
- The RAM per OSD figure of 4 GB matches the Ceph BlueStore default `osd_memory_target` of 4 GiB. Some production deployment guides recommend 5 GB or more for headroom, but 4 GB is the documented default and is technically correct.
- The power consumption figures are reasonable approximations but will vary significantly by specific server model, CPU choice, and drive type. The post correctly presents these as "typical" ranges.
- The post is hardware-focused rather than Rook-specific; the Rook tag is appropriate since form factor decisions directly impact Rook/Ceph deployments on Kubernetes.
- The recommendation to use separate public and cluster networks with bonded interfaces aligns with Ceph best practices.
