# Validation Summary: How to Set Up an Active-Active Cluster with Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 High Availability Add-On
- Pacemaker
- pcs CLI
- Cluster clone resources
- Promotable clone resources
- OCF resource agents: apache, IPaddr2, pgsql

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- ClusterLabs Pacemaker Explained: Collective Resources - https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/collective.html
- ocf_heartbeat_IPaddr2 resource agent manual - https://www.mankier.com/7/ocf_heartbeat_IPaddr2
- ocf_heartbeat_pgsql resource agent manual - https://manpages.debian.org/testing/resource-agents/ocf_heartbeat_pgsql.7.en.html

## Issues Found
- The post described a single `IPaddr2` virtual IP as load-balanced. A normal `IPaddr2` VIP runs on one node at a time for failover and does not distribute traffic across web server clones by itself, so the heading, prerequisite, and explanation were corrected to distinguish failover VIPs from external load balancers.
- The promotable PostgreSQL example used non-current monitor-operation details and implied that any database primary/secondary setup can be made promotable directly. The wording now says the resource agent must support promoted and unpromoted roles, and the monitor operations were adjusted to match documented `pgsql` examples.
- Clone limits were shown with `pcs resource update WebServer-clone`, which would treat `clone-max` and `clone-node-max` as resource instance parameters. These are clone meta attributes, so the commands now use `pcs resource meta WebServer-clone`.
- The colocation example used `Promoted` in a position where RHEL documents the role selector as `promoted|unpromoted`. The command now uses `promoted` before the target clone.
- Resource and location status commands were corrected from `pcs resource status` and `pcs constraint location show` to the documented `pcs status resources` and `pcs constraint location config` forms.

## Review Notes
The tutorial remains a high-level guide. A production PostgreSQL promotable clone also requires PostgreSQL replication configuration and resource-agent-specific parameters appropriate to the deployment.
