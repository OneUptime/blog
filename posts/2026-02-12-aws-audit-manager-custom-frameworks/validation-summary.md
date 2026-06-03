# Validation Summary: How to Set Up AWS Audit Manager Custom Frameworks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Audit Manager
- AWS CLI
- Boto3 / Python
- AWS Config
- AWS CloudTrail
- AWS Security Hub
- Amazon S3 manual evidence storage
- AWS Organizations / cross-account framework sharing

## Sources Consulted
- AWS CLI Command Reference: `auditmanager create-control` - https://docs.aws.amazon.com/cli/latest/reference/auditmanager/create-control.html
- AWS CLI Command Reference: `auditmanager batch-import-evidence-to-assessment-control` - https://awscli.amazonaws.com/v2/documentation/api/2.9.19/reference/auditmanager/batch-import-evidence-to-assessment-control.html
- AWS CLI Command Reference: `auditmanager start-assessment-framework-share` - https://docs.aws.amazon.com/cli/latest/reference/auditmanager/start-assessment-framework-share.html
- Boto3 Audit Manager `create_assessment_framework` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/auditmanager/client/create_assessment_framework.html
- Boto3 Audit Manager `create_assessment` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/auditmanager/client/create_assessment.html
- Boto3 Audit Manager `list_controls` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/auditmanager/client/list_controls.html
- AWS Audit Manager User Guide: AWS Config rules supported by Audit Manager - https://docs.aws.amazon.com/audit-manager/latest/userguide/control-data-sources-config.html

## Issues Found
- The post used `AWS_CloudTrail` as an Audit Manager control mapping `sourceType`. AWS documents the enum value as `AWS_Cloudtrail`, so the examples and evidence source list were corrected.
- The cross-account sharing example used a non-existent `create-assessment-framework-share` CLI command. AWS documents the current command as `start-assessment-framework-share`, so the command was corrected.
- The assessment creation section said the assessment defines AWS services and a time period. The current `CreateAssessment` API ignores `awsServices` and infers services from control data sources; it also does not take a time-period field. The explanation and example were updated accordingly.
- The Python framework example used empty strings for missing control IDs via `control_map.get(..., '')`, which could send invalid control IDs to `create_assessment_framework`. The example now fails clearly with `require_control()` when a referenced control is missing.
- The manual evidence example used a control name as `--control-id`. AWS CLI expects the assessment control identifier, so the placeholder and comment were updated to show an ID-style value.
- Removed an unused `json` import from the Python framework example.

## Review Notes
The post remains technically relevant and valid after the corrections. Users still need to replace placeholder AWS account IDs, ARNs, framework IDs, assessment IDs, and control IDs with real values from their Audit Manager environment.
