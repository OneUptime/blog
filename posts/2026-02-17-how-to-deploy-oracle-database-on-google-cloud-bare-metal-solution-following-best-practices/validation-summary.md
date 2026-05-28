# Validation Summary: How to Deploy Oracle Database on Google Cloud Bare Metal Solution Following

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Bare Metal Solution
- Google Cloud CLI
- Oracle Database 19c
- Oracle Grid Infrastructure 19c
- Oracle ASM / ASMLib
- Oracle Net Listener
- SQL*Plus

## Sources Consulted
- Google Cloud Bare Metal Solution planning documentation: https://docs.cloud.google.com/bare-metal/docs/bms-planning
- Google Cloud Bare Metal Solution deployment documentation: https://docs.cloud.google.com/bare-metal/docs/bms-deploy
- Google Cloud Bare Metal Solution maintenance documentation: https://docs.cloud.google.com/bare-metal/docs/bms-maintenance
- Google Cloud Bare Metal Solution Oracle best practices: https://docs.cloud.google.com/bare-metal/docs/solutions/oracle/bms-oracle-best-practices
- Google Cloud SDK `gcloud bms instances list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/bms/instances/list
- Google Cloud SDK `gcloud bms instances describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/bms/instances/describe
- Oracle Database 19c preinstallation RPM documentation: https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/installing-oracle-linux-with-public-yum-repository-support.html
- Oracle Database 19c Linux installation documentation: https://docs.oracle.com/en/database/oracle/oracle-database/19/ladbi/installing-oracle-database.html
- Oracle Database 19c DBCA command reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/creating-and-configuring-an-oracle-database.html

## Issues Found
- The Google Cloud CLI examples used `--location` for `gcloud bms instances list` and `describe`; the official CLI uses `--region`. Updated both commands.
- The text said the CLI listed available BMS server configurations, but `gcloud bms instances list` lists provisioned instances. Updated the comment and provisioning note.
- Several BMS server specifications used vCPU counts as physical core counts and overstated memory. Updated the examples to match Google Cloud's published BMS server configuration table.
- The post implied a complete high availability configuration, but it only configures a standalone database and connectivity. Updated the description and body wording, and described standalone Grid Infrastructure as ASM plus Oracle Restart.
- The OS preparation used installer groups that the Oracle preinstallation RPM does not create by default. Added commands to create the extra groups and add the `oracle` user to them.
- The ASM preparation used `/dev/sd*` paths. Google Cloud's Oracle on BMS best practices say not to use `/dev/sd*` paths for ASM on BMS because they are not stable across path failures or reboots. Updated the example to use `/dev/mapper/*` placeholders and ASMLib scan settings.
- The DBCA example used `-diskGroupName` and `-recoveryGroupName`, which are not part of the Oracle Database 19c DBCA `createDatabase` syntax in the official command reference. Removed those flags and kept `-datafileDestination '+DATA'` and `-recoveryAreaDestination '+FRA'`.
- The listener example used `HOST = 0.0.0.0`. Updated it to bind to the BMS server IP used elsewhere in the post.

## Review Notes
The guide remains a high-level deployment walkthrough. A production deployment should also validate NTP, multipath configuration, firewall rules, backups, patching workflow, and whether ASMFD or UDEV is preferable to ASMLib for the chosen Grid Infrastructure version.
