# Validation Summary: How to Access RDS from Lambda Functions in a VPC

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Lambda
- Amazon RDS
- Amazon VPC
- Security groups
- AWS Secrets Manager
- RDS Proxy
- AWS CLI
- Terraform AWS Provider
- Node.js / node-postgres
- Python / PyMySQL / boto3
- AWS CloudFormation

## Sources Consulted
- AWS Lambda VPC configuration documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Hyperplane ENI documentation: https://docs.aws.amazon.com/lambda/latest/dg/foundation-networking.html
- AWS Lambda with RDS and RDS Proxy documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html
- AWS Lambda reserved concurrency documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS CLI `lambda invoke` documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS CLI `lambda put-function-concurrency` documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-concurrency.html
- AWS CLI `secretsmanager create-secret` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS Secrets Manager JavaScript SDK examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_secrets-manager_code_examples.html
- Amazon VPC security group rule documentation: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Terraform AWS Provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider `aws_vpc_security_group_egress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Amazon RDS DB parameter documentation for PostgreSQL and MySQL defaults: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html and https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- node-postgres Client documentation: https://node-postgres.com/apis/client
- PyMySQL connection documentation: https://pymysql.readthedocs.io/en/latest/modules/connections.html
- AWS CloudFormation `AWS::Lambda::Function` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html

## Issues Found
- The original Terraform security group example used inline mutual security group references between the Lambda and RDS security groups. That can create a Terraform dependency cycle. I changed the snippet to create the security groups separately and then add `aws_vpc_security_group_egress_rule` and `aws_vpc_security_group_ingress_rule` resources.
- The original post did not mention that a Lambda function in private subnets needs a NAT gateway or interface VPC endpoint to call Secrets Manager. I added that requirement before the Secrets Manager code.
- The Node.js database section called itself a complete example but depended on the `getDbCredentials` helper from the prior section. I changed the wording and added an inline reminder to include that helper.
- The Python MySQL handler reset a local `connection` variable in the exception path instead of the global connection cache. I added `global connection` to the handler so stale connections are actually reset.
- The original RDS connection-limit examples gave fixed approximate values for specific instance classes. RDS connection limits vary by engine, instance class memory, and parameter group, so I replaced the fixed values with the documented memory-based default behavior.
- The AWS CLI `lambda invoke` example used `--payload '{}'` without the AWS CLI v2 `--cli-binary-format raw-in-base64-out` option. I added the flag so the command works as written with a raw JSON payload.

## Review Notes
The post is technically relevant and current after the fixes. I verified the linked OneUptime blog URLs return HTTP 200. I did not execute AWS or Terraform operations because the examples require live cloud resources and credentials.
