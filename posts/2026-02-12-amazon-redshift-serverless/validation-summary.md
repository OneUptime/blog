# Validation Summary: How to Set Up Amazon Redshift Serverless

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Amazon Redshift Serverless
- AWS CLI
- AWS CloudFormation
- AWS IAM
- Amazon S3 COPY loading
- Redshift SQL
- Redshift Data API
- EventBridge
- Python redshift_connector

## Sources Consulted
- Amazon Redshift Serverless compute capacity: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-capacity.html
- Amazon Redshift Serverless billing and usage limits: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-billing-on-demand.html
- AWS CLI create-workgroup reference: https://docs.aws.amazon.com/cli/latest/reference/redshift-serverless/create-workgroup.html
- AWS CLI create-usage-limit reference: https://docs.aws.amazon.com/cli/latest/reference/redshift-serverless/create-usage-limit.html
- AWS CLI Redshift Data API execute-statement reference: https://docs.aws.amazon.com/cli/latest/reference/redshift-data/execute-statement.html
- CloudFormation AWS::RedshiftServerless::Namespace reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-redshiftserverless-namespace.html
- CloudFormation AWS::RedshiftServerless::Workgroup reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-redshiftserverless-workgroup.html
- Granting permissions to Amazon Redshift Serverless: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security-other-services.html
- Amazon Redshift COPY authorization parameters: https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-authorization.html
- Amazon Redshift SYS_LOAD_ERROR_DETAIL reference: https://docs.aws.amazon.com/redshift/latest/dg/SYS_LOAD_ERROR_DETAIL.html
- Amazon Redshift STL_LOAD_ERRORS reference: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_ERRORS.html
- Amazon Redshift CREATE TABLE reference: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_TABLE_NEW.html
- Amazon Redshift COPY reference: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html
- Amazon Redshift DATEADD function reference: https://docs.aws.amazon.com/redshift/latest/dg/r_DATEADD_function.html

## Issues Found
- The post said the minimum `base-capacity` is 8 RPUs and scales only in increments of 8. AWS currently documents a 4 RPU minimum, increments of 4 from 4 to 8, increments of 8 from 8 to 512, and increments of 32 above 512 in supported Regions. Updated the capacity explanation.
- The CloudFormation IAM trust policy only allowed `redshift.amazonaws.com`. AWS documentation for Redshift Serverless says the trust relationship should include both `redshift.amazonaws.com` and `redshift-serverless.amazonaws.com`. Added the serverless service principal.
- The load-error query used `stl_load_errors`, which AWS documents as not containing queries run on serverless namespaces. Replaced it with `sys_load_error_detail` and the correct `start_time` column.
- The usage-limit examples used a workgroup name in the ARN path. Redshift Serverless workgroup ARNs use the workgroup ID. Updated the examples to use a UUID-shaped placeholder.

## Review Notes
The local AWS CLI was not installed in the workspace, so CLI verification was performed against the official AWS CLI command reference rather than local `aws --help` output. The post's remaining examples are illustrative and still require real subnet IDs, security group IDs, account IDs, IAM roles, S3 paths, credentials, and permissions in a target AWS account.
