# Validation Summary: How to Set Up AWS Mainframe Modernization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Mainframe Modernization
- AWS Transform for mainframe
- Rocket Software runtime engine, formerly Micro Focus
- COBOL
- PL/I
- JCL
- CICS
- VSAM
- IBM Db2 for z/OS
- AWS SDK for Python, Boto3
- AWS Database Migration Service
- Amazon CloudWatch
- Apache Maven

## Sources Consulted
- AWS Mainframe Modernization application definition reference - https://docs.aws.amazon.com/m2/latest/userguide/applications-m2-definition.html
- Boto3 MainframeModernization create_environment reference - https://docs.aws.amazon.com/boto3/latest/reference/services/m2/client/create_environment.html
- Boto3 MainframeModernization create_application reference - https://docs.aws.amazon.com/boto3/latest/reference/services/m2/client/create_application.html
- Boto3 MainframeModernization update_application reference - https://docs.aws.amazon.com/boto3/latest/reference/services/m2/client/update_application.html
- Boto3 MainframeModernization create_deployment reference - https://docs.aws.amazon.com/boto3/latest/reference/services/m2/client/create_deployment.html
- AWS Transform mainframe modernization documentation - https://docs.aws.amazon.com/transform/latest/userguide/transform-app-mainframe.html
- AWS Mainframe Modernization features - https://aws.amazon.com/mainframe-modernization/features/
- AWS DMS supported sources - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.Sources.html
- AWS DMS CreateEndpoint API reference - https://docs.aws.amazon.com/dms/latest/APIReference/API_CreateEndpoint.html
- AWS Mainframe Modernization CloudWatch monitoring - https://docs.aws.amazon.com/m2/latest/userguide/monitoring-cloudwatch.html

## Issues Found
- The post described AWS Mainframe Modernization managed runtime as generally available for new setup without caveat. Added the current AWS availability note that the managed runtime environment is no longer open to new customers, while existing customers can continue to use it, and pointed new projects toward the self-managed experience or AWS Transform for mainframe.
- The post used older Micro Focus and Blu Age branding throughout. Updated the primary terminology to Rocket Software, formerly Micro Focus, and AWS Transform for mainframe, formerly AWS Blu Age, while keeping the underlying M2 API engine type values where those are still used by the SDK.
- The automated refactoring path claimed conversion to Java or .NET. AWS documentation describes AWS Transform for mainframe refactoring to Java-based applications, so the post now says Java.
- The comparison table described automated refactoring as a complete rewrite. Reworded that row to "Automated conversion" to match the AWS-described refactoring workflow.
- The create application JSON showed `definition.content.s3Location`, but the M2 API's `definition` shape is a tagged union with either `content` or `s3Location` at the top level. Updated the snippet to use `definition.s3Location`.
- The Rocket Software application definition used invalid field names and listener values, including `dataset-locations`, `type: "CICS"`, and ad hoc RDS properties. Updated the example to match the documented Rocket Software schema: `dataset-location`, `tn3270` listener, `secret-manager-arn`, `batch-settings`, and `cics-settings`.
- The deployment code used a nonexistent M2 `create_application_version` call and `sourceContent`. AWS Mainframe Modernization creates the initial application version with `create_application` and new versions with `update_application`, so the code now uses `update_application` and deploys the returned integer version.
- The CloudWatch alarm used `EnvironmentId` as the metric dimension name. AWS documents the dimension as lowercase `environmentId`, so the alarm example was corrected.
- Hard-coded M2 engine versions were presented as if universally valid. Added comments telling readers to choose supported versions returned by `list_engine_versions`.

## Review Notes
The post is accurate after these corrections. The examples remain illustrative and still require real AWS resource IDs, subnets, security groups, secrets, S3 buckets, supported engine versions, and IAM permissions before they can run in an AWS account.
