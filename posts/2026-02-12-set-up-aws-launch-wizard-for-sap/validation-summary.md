# Validation Summary: How to Set Up AWS Launch Wizard for SAP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Launch Wizard for SAP
- AWS CLI
- SAP HANA
- SAP NetWeaver
- SAP HANA System Replication
- Pacemaker high availability clustering
- Amazon EC2
- Amazon EBS
- Amazon EFS
- AWS Backint Agent for SAP HANA
- Amazon S3
- AWS Backup
- Amazon CloudWatch and CloudWatch Application Insights

## Sources Consulted
- AWS Launch Wizard for SAP user guide: https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sap.html
- How AWS Launch Wizard for SAP works: https://docs.aws.amazon.com/launchwizard/latest/userguide/how-launch-wizard-sap-works.html
- Deploying an SAP application with the AWS CLI: https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sap-deploying-cli.html
- AWS Launch Wizard `create-deployment` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/launch-wizard/create-deployment.html
- AWS Launch Wizard SAP deployment specifications: https://docs.aws.amazon.com/launchwizard/latest/APIReference/launch-wizard-specifications-sap.html
- AWS Launch Wizard `SapHanaHA` specification reference: https://docs.aws.amazon.com/launchwizard/latest/APIReference/launch-wizard-specifications-sap-hana-ha.html
- AWS Launch Wizard supported SAP versions: https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sap-versions.html
- Amazon EC2 instance types for SAP on AWS: https://docs.aws.amazon.com/sap/latest/general/ec2-instance-types-sap.html
- SAP HANA EBS Storage Reference: https://docs.aws.amazon.com/sap/latest/sap-hana/hana-storage-config-reference-layout.html
- AWS Backint Agent for SAP HANA: https://docs.aws.amazon.com/sap/latest/sap-hana/aws-backint-agent-sap-hana.html
- Install and configure AWS Backint Agent for SAP HANA: https://docs.aws.amazon.com/sap/latest/sap-hana/aws-backint-agent-s3-installing-configuring.html
- Version history for AWS Backint Agent: https://docs.aws.amazon.com/sap/latest/sap-hana/aws-backint-agent-version-history.html
- CloudWatch Application Insights for SAP HANA metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-metrics-sap-hana.html
- Tutorial: Set up monitoring for SAP HANA with CloudWatch Application Insights: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-tutorial-sap-hana.html

## Issues Found
- The post used `aws launchwizard`, but the documented AWS CLI service command is `aws launch-wizard`. Updated all Launch Wizard CLI commands.
- The deployment pattern was written as `SAPHanaHA`; the documented SAP HANA HA pattern is `SapHanaHA`. Corrected the pattern name.
- The `create-deployment` example used non-existent or incorrect specification keys such as `HANAMemory`, `SID`, `InstanceNumber`, `MasterPassword`, `OperatingSystem`, `VPCCIDR`, `HAEnabled`, and `BackupEnabled`. Replaced the payload with a `file://hana-ha-specifications.json` example using documented `SapHanaHA` specification names.
- The instance recommendation table mapped several HANA sizes to incorrect instance sizes. Replaced it with representative SAP-certified scale-up mappings and added a note to confirm current certification and Availability Zone support.
- The 512 GiB SAP HANA EBS storage example used inaccurate data and log volume sizes and IOPS. Updated the example to align with the AWS SAP HANA EBS storage reference.
- The post implied Launch Wizard creates VPC networking. Clarified that Launch Wizard uses the VPC and subnets provided by the user.
- The post described EFS, Backint, and CloudWatch behavior too broadly. Updated wording to reflect that EFS is deployment-dependent, Backint can target Amazon S3 or AWS Backup, and SAP-specific metrics should be configured with CloudWatch Application Insights.
- The Backint configuration file path included an extra `aws-backint-agent/` directory. Corrected it to `/usr/sap/HDB/SYS/global/hdb/opt/hdbconfig/aws-backint-agent-config.yaml`.
- The CloudWatch alarm example used an unsupported `SAP/HANA` namespace and `MemoryUsedPercent` metric name. Replaced it with documented `hanadb_*` metric names and a `list-metrics` command to discover the actual namespace and dimensions before alarm creation.
- The scaling section stated that Launch Wizard supports modifying the deployment. Reworded it to describe SAP HANA scale-up through EC2 instance resizing with SAP Basis coordination.
- The conclusion stated the deployment is production-ready from day one. Softened this to a technically accurate statement that Launch Wizard provides a strong foundation for production readiness.

## Review Notes
The blog is technically relevant and remains useful after correction. The CLI examples are still illustrative: real deployments require current AMI IDs, subnet IDs, security groups, KMS keys, SAP installation media paths, and validation of the latest Launch Wizard specification requirements for the selected deployment pattern.
