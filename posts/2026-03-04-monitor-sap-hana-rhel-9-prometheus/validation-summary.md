# Validation Summary: How to Monitor SAP HANA on RHEL with Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SAP HANA
- SUSE hanadb_exporter
- Prometheus
- Prometheus alerting rules
- systemd
- firewalld

## Sources Consulted
- SUSE hanadb_exporter README: https://github.com/SUSE/hanadb_exporter
- SUSE hanadb_exporter configuration example: https://raw.githubusercontent.com/SUSE/hanadb_exporter/main/config.json.example
- SUSE hanadb_exporter metrics example: https://raw.githubusercontent.com/SUSE/hanadb_exporter/main/metrics.json
- SUSE hanadb_exporter command-line parsing: https://raw.githubusercontent.com/SUSE/hanadb_exporter/main/hanadb_exporter/main.py
- SAP HANA Python driver installation documentation: https://help.sap.com/docs/PRODUCT_ID/f1b440ded6144a54ada97ff95dac7adf/39eca89d94ca464ca52385ad50fc7dea.html
- SAP HANA HDBSQL command-line documentation: https://help.sap.com/docs/SAP_HANA_CLIENT/f1b440ded6144a54ada97ff95dac7adf/c22c67c3bb571014afebeb4a76c3d95d.html
- SAP HANA CREATE USER documentation: https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20d5ddb075191014b594f7b11ff08ee2.html
- SAP HANA GRANT statement documentation: https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20f674e1751910148a8b990d33efbdc5.html
- SAP HANA M_HOST_RESOURCE_UTILIZATION system view: https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20b12419751910148afa9303eec370a0.html
- SAP HANA M_DISKS system view: https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/m-disks-system-view
- SAP HANA M_SERVICE_REPLICATION monitoring documentation: https://help.sap.com/docs/SAP_HANA_PLATFORM/4e9b18c116aa42fc84c7dbfd02111aba/c81a65984ec34b7d980cc1480c4d43c4.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The exporter installation used a non-existent GitHub release asset and treated hanadb_exporter like a standalone Linux tarball. Updated the installation to clone the SUSE repository, create a Python virtual environment, install the SAP HANA Python driver, and install the exporter package.
- The exporter configuration mixed query definitions into `config.json`, but hanadb_exporter expects connection settings in `config.json` and SQL metric definitions in a separate `metrics.json` file. Split the snippets into the documented file formats.
- The original `listen_address` value used `":9668"`, but hanadb_exporter uses `listen_address` for the bind address and `exposition_port` for the port. Updated these fields.
- Several SQL queries referenced columns that are not part of the documented SAP HANA monitoring views, including memory and CPU columns in `SYS.M_HOST_RESOURCE_UTILIZATION`. Replaced them with queries based on documented view columns and the upstream exporter example metrics.
- The replication metric attempted to export only string labels. Prometheus samples need a numeric value, so the replication status is now mapped to numeric status values as in the upstream exporter metrics.
- The monitoring user grants were broader and less aligned with the exporter documentation than needed. Replaced direct schema-level SELECT grants with a role containing the SAP HANA `MONITORING` privilege.
- The systemd unit ran the exporter as root and used an incomplete command. Updated it to use a dedicated service user and pass both `--config` and `--metrics`.
- Prometheus alert expressions used metric names that would not be emitted by hanadb_exporter. Updated the expressions to match the corrected metric names and the Python Prometheus client unit suffixes.
- The post created an alert rules file but did not mention loading it through Prometheus `rule_files`. Added a short instruction to include the rules file.
- Replaced `systemctl reload prometheus` with sending SIGHUP through systemd, which matches Prometheus' documented runtime configuration reload mechanism.

## Review Notes
- The post still uses example credentials in snippets. In production, use SAP HANA secure user store or another secrets mechanism instead of storing passwords in plaintext.
- The exporter is community maintained by SUSE and is not packaged for RHEL in the same way it is for SUSE systems, so the manual Python installation path is appropriate for a RHEL-focused guide.
