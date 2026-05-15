# Validation Summary: How to Configure Multipath Load Balancing Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath / device-mapper multipath
- `/etc/multipath.conf`
- Multipath path grouping policies
- Multipath path selectors (`round-robin`, `queue-length`, `service-time`)
- ALUA path prioritization
- `multipath` CLI
- fio benchmarking

## Sources Consulted
- Red Hat Enterprise Linux 9, Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9 multipath configuration attributes (`path_selector`, `path_grouping_policy`, `prio`, `rr_min_io_rq`): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Linux kernel documentation, dm-service-time path selector: https://www.kernel.org/doc/html/v5.10/admin-guide/device-mapper/dm-service-time.html
- Linux kernel documentation, dm-queue-length path selector: https://docs.kernel.org/5.15/admin-guide/device-mapper/dm-queue-length.html
- fio documentation: https://fio.readthedocs.io/en/master/fio_doc.html

## Issues Found
- The post used "Active/Passive Arrays (ALUA)" as a heading and concluded that `failover` was appropriate when an array "only supports active/passive." ALUA is an asymmetric access model with optimized and non-optimized paths, not a synonym for active/passive. Changed the heading to "Configuring for ALUA Arrays" and clarified the conclusion to reserve `failover` for simplicity or arrays that support only a single active path.

## Review Notes
- The `path_grouping_policy` values shown are valid in RHEL 9. Red Hat documents `failover`, `multibus`, `group_by_prio`, and `group_by_node_name` with the semantics described in the post.
- The `path_selector` values `round-robin 0`, `queue-length 0`, and `service-time 0` are valid. Red Hat documents `service-time 0` as the default selector in RHEL 9, and the kernel documentation confirms the queue-length and service-time selection algorithms.
- The `prio alua`, `rr_min_io_rq`, `failback immediate`, `multipaths` stanza, and `multipath -ll` verification example are consistent with RHEL 9 multipath documentation.
- The fio commands use documented command-line options. For repeatable fixed-duration comparisons, a future revision could add `--time_based`, because `--runtime` alone caps runtime but does not force fio to loop until the time expires.
