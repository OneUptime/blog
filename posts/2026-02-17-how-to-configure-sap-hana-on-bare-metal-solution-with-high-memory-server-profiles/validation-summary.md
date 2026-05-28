# Validation Summary: Configure SAP HANA on Bare Metal Solution with High-Memory Server Profiles

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Bare Metal Solution
- SAP HANA
- Google Cloud CLI (`gcloud bms`)
- SUSE Linux Enterprise Server for SAP and `saptune`
- Linux LVM, multipath storage, and SAP HANA filesystem mounts
- SAP HANA lifecycle manager (`hdblcm`)
- SAP HANA System Replication (`hdbnsutil`)
- Google Cloud's Agent for SAP Backint feature
- SAP HANA hardware and cloud measurement tools

## Sources Consulted
- Google Cloud SAP HANA on Bare Metal Solution planning guide: https://cloud.google.com/sap/docs/sap-hana-on-bms-planning
- Google Cloud SAP HANA on Bare Metal Solution deployment guide: https://cloud.google.com/sap/docs/sap-hana-on-bms-deployment
- Google Cloud certifications for SAP HANA: https://cloud.google.com/sap/docs/certifications-sap-hana
- Google Cloud CLI reference for `gcloud bms instances list`: https://cloud.google.com/sdk/gcloud/reference/bms/instances/list
- Google Cloud CLI reference for `gcloud bms instances describe`: https://cloud.google.com/sdk/gcloud/reference/bms/instances/describe
- Google Cloud Agent for SAP Backint configuration guide: https://cloud.google.com/sap/docs/agent-for-sap/latest/configure-backint-backup-recovery
- Google Cloud Backint agent overview and support notice: https://cloud.google.com/sap/docs/sap-hana-backint-overview
- SUSE `saptune` documentation: https://documentation.suse.com/sles-sap/16.0/html/SAP-saptune/
- SAP Help Portal, SAP HANA system replication command examples and modes: https://help.sap.com/docs/SAP_HANA_PLATFORM/
- SAP Help Portal, SAP HANA installation media extraction with SAPCAR: https://help.sap.com/docs/SAP_HANA_PLATFORM/2c1988d620e04368aa4103bf26f17727/1d5920fb965646a5bee76a9bfe290565.html
- SAP HANA Hardware and Cloud Measurement Tools guide: https://help.sap.com/doc/af47cce52aaa4ed4992d42d3cf319d62/2.0/en-US/How_to_Use_the_SAP_HANA_Hardware_and_Cloud_Measurement_Tools_en.pdf

## Issues Found
- The BMS profile table used unsupported `uts2-*` names and capped memory at 12 TB. Updated it to current SAP HANA BMS high-memory profile examples and corrected the maximum memory statement to 24 TB.
- The post described BMS HANA storage as local NVMe and provided commands to create new LVM layouts manually. Google Cloud provisions and maps the SAP HANA storage layout for BMS; replaced the destructive creation commands with validation commands for existing LVM, multipath, and mount layout.
- The `gcloud bms` examples used `--location`, but the documented flag is `--region`. Updated both `list` and `describe` examples.
- The OS prerequisite and tuning text implied a specific SLES 15 SP4 recommendation for all deployments. Updated it to require the SAP-certified OS image for the ordered BMS profile and scoped `saptune` usage to SLES for SAP.
- The memory section recommended manual huge page and NUMA sysctl edits. Replaced this with verification of SAP-managed OS tuning and left HANA memory limit configuration to the HANA post-installation step.
- The SAP HANA media extraction command used `tar` on a `.exe` file. Replaced it with SAPCAR extraction of the SAP HANA server `.SAR` archive.
- The post-installation SQL enabled `log_mode` but did not enable automatic log backups. Added `enable_auto_log_backup = yes`.
- The HSR procedure omitted the initial data backup prerequisite and used `HDB start`. Added a backup step and switched the secondary start example to `sapcontrol`.
- The replication mode descriptions overstated zero-data-loss guarantees. Reworded them to match SAP's documented behavior for `sync`, `syncmem`, and `async`.
- The backup section used the retired standalone Cloud Storage Backint agent path and an invalid old-style configuration file. Replaced it with the supported Backint feature of Google Cloud's Agent for SAP and its `installbackint` / `configurebackint` commands.
- The performance validation section referenced `hdbhwcheck`; updated it to the current SAP HANA Hardware and Cloud Measurement Tools flow and removed hard-coded throughput and latency thresholds that are not universal across certified BMS configurations.

## Review Notes
The guide is now technically aligned at a high level, but SAP HANA deployments remain version-, SID-, tenant-, license-, OS-, and support-contract-specific. Production users should still follow the exact SAP installation guide, SAP Notes, and Google Cloud order documentation for their chosen BMS profile and HANA revision.
