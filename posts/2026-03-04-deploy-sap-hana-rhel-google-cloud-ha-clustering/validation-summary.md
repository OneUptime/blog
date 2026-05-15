# Validation Summary: How to Deploy SAP HANA on RHEL in Google Cloud with HA Clustering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for SAP
- SAP HANA system replication
- Google Cloud Compute Engine
- Google Cloud internal passthrough Network Load Balancing
- Pacemaker and pcs
- GCP fence agent
- SAP HANA Pacemaker resource agents

## Sources Consulted
- Google Cloud SAP HANA HA scale-up cluster configuration guide for RHEL: https://cloud.google.com/sap/docs/sap-hana-ha-config-rhel
- Google Cloud Compute Engine operating system image details: https://cloud.google.com/compute/docs/images/os-details
- Google Cloud SAP HANA certifications: https://cloud.google.com/sap/docs/certifications-sap-hana
- Google Cloud SAP HANA high-availability planning guide: https://cloud.google.com/sap/docs/sap-hana-ha-planning-guide

## Issues Found
- The internal load balancer example created only a health check, backend service, and forwarding rule. Added static internal VIP reservation, unmanaged instance groups, backend attachments, failover backend configuration, health-check thresholds, and the health-check firewall rule required by Google Cloud's SAP HANA HA guidance.
- The package list omitted `resource-agents-gcp`, which Google Cloud documents with the RHEL Pacemaker agent set. Added it.
- The Pacemaker health-check resource used `azure-lb`, which is not the correct resource for Google Cloud. Replaced it with the Google-documented HAProxy listener managed by Pacemaker and added the local `IPaddr2` VIP resource on `lo`.
- The `fence_gce` examples used `plug` and host mapping values that do not match Google Cloud's SAP HANA HA examples. Changed the fence resources to use `port`, monitor retries, start timeout, and the recommended primary-node delay setting.
- The SAP HANA resource was missing documented timeouts, monitor operations, `DUPLICATE_PRIMARY_TIMEOUT`, and `meta` placement for promotable clone attributes. Updated the command to match the RHEL 8-and-later form used by Google Cloud.
- The cluster setup skipped `pcsd` startup and `pcs host auth`, which are required before cluster setup on RHEL 8 and later. Added those steps.

## Review Notes
The post remains a condensed guide and does not cover the full production procedure, including SAP HANA installation, system replication setup, HA/DR provider hooks, corosync tuning, and validation testing. Those omissions are acceptable for a short blog post, but a production runbook should follow the full Google Cloud and Red Hat procedures.
