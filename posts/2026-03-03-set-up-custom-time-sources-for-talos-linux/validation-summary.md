# Validation Summary: How to Set Up Custom Time Sources for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- talosctl
- NTP and SNTP time synchronization
- chrony
- AWS Amazon Time Sync Service
- Google Cloud NTP
- Azure VM time synchronization and PTP
- VMware / ESXi time synchronization

## Sources Consulted
- Talos Linux v1.10 Time Synchronization documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/time-sync
- Talos Linux v1.12 Time Servers documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/time
- Talos Linux latest Configuration Patches documentation: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos Linux latest Configuration reference: https://www.talos.dev/latest/reference/configuration/
- Talos Linux latest CLI reference: https://www.talos.dev/latest/reference/cli/
- chrony.conf official documentation: https://chrony-project.org/doc/4.7/chrony.conf.html
- AWS EC2 Amazon Time Sync Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html
- Google Cloud Configure NTP documentation: https://cloud.google.com/compute/docs/instances/time-synchronization/configure-ntp
- Microsoft Learn, Time sync for Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/time-sync

## Issues Found
- The AWS section said the `169.254.169.123` endpoint supports both NTP and PTP. The endpoint is the NTP endpoint; AWS exposes PTP separately as a local hardware clock on supported Nitro instances. Updated the wording to distinguish the NTP endpoint from PTP.
- The Google Cloud example mixed the internal metadata NTP server with Google Public NTP servers. Google Cloud documentation recommends using the internal `metadata.google.internal` server for Compute Engine instances and avoiding mixed NTP sources. Updated the example to use only `metadata.google.internal`.
- The Azure example described host time but configured `time.windows.com`, which is a public NTP service rather than the Azure Hyper-V host time source. Updated the example to describe PTP device usage and show `/dev/ptp0`, with a note to verify the PTP device first.
- The validation commands used `talosctl get timeserverconfig`, which is not the documented resource for observing effective time servers. Updated it to `talosctl get timeservers`.
- The validation commands used `talosctl logs timed`, but Talos documentation says time sync logs are available through `controller-runtime`. Updated the command to query `controller-runtime` logs and filter for `time.Sync`.
- The fallback section stated that the NTP client tries servers strictly in order. Talos documentation notes it can prefer the last successful server, so the wording was changed to the more accurate behavior that Talos uses configured sources and continues with another available source if one is unreachable.

## Review Notes
The post uses the legacy `machine.time.servers` configuration, which is still documented and supported. Newer Talos documentation also describes `TimeSyncConfig` documents for time server configuration, so future updates could mention that option for newer multi-document configurations.
