# Validation Summary: How to Reference Parameter Store Values in CloudFormation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- AWS Systems Manager Parameter Store
- CloudFormation dynamic references
- AWS CLI
- Amazon RDS
- Amazon ECS
- Amazon EC2 AMI public parameters
- Amazon EKS optimized AMI public parameters

## Sources Consulted
- AWS CloudFormation: CloudFormation-supplied parameter types: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- AWS CloudFormation: Dynamic references general considerations: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html
- AWS CloudFormation: Plaintext SSM dynamic references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html
- AWS CloudFormation: SecureString SSM dynamic references: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html
- AWS CloudFormation: AWS::SSM::Parameter resource: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ssm-parameter.html
- AWS CloudFormation: AWS::RDS::DBInstance resource: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html
- AWS CloudFormation: ECS task definition secret property: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-service-secret.html
- AWS EC2: Reference latest AMIs using Systems Manager public parameters: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- Amazon ECS: Retrieving ECS-optimized Linux AMI metadata: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- Amazon EKS: Retrieve recommended Amazon Linux AMI IDs: https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
- Amazon EKS: Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI create-stack command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI update-stack command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack.html

## Issues Found
- The SSM parameter type example claimed it referenced a specific Parameter Store version with `/myapp/production/api-key:3`. CloudFormation-supplied SSM parameter types retrieve the latest value for the supplied Parameter Store key, so the example was changed to an unversioned `ApiKey` parameter. Version pinning remains shown under dynamic references, where it is supported.
- The RDS dynamic-reference examples omitted `AllocatedStorage`, and the combined example also omitted `MasterUsername`. These properties are conditionally required for creating a PostgreSQL `AWS::RDS::DBInstance`, so the examples were updated with `AllocatedStorage: '20'` and a plaintext SSM dynamic reference for the master username where needed.
- The dynamic-reference limit was listed as 200. AWS CloudFormation currently allows up to 60 dynamic references in a stack template, so the limit was corrected.
- The post said all resolved dynamic reference values are hidden in the CloudFormation console and API. AWS documents that this behavior applies to secure strings; the statement was narrowed to SecureString resolved values.
- The EKS public AMI parameter used Kubernetes `1.28` with the Amazon Linux 2 path. As of June 2, 2026, current EKS standard-support versions are `1.35`, `1.34`, and `1.33`, and the current Amazon Linux example format uses Amazon Linux 2023. The example was updated to `/aws/service/eks/optimized-ami/1.35/amazon-linux-2023/x86_64/standard/recommended/image_id`.
- The post said dynamic references can be refreshed by making a no-op template change. AWS documents that CloudFormation retrieves updated dynamic-reference values during stack updates, and secure secret values require an update that modifies the resource containing the reference. The sentence was corrected to say the stack update should modify that resource.

## Review Notes
The AWS CLI command shapes and CloudFormation SSM parameter type syntax were otherwise consistent with official AWS documentation. Amazon Linux 2 examples are still technically valid, but future updates may prefer Amazon Linux 2023 examples as AWS public AMI guidance continues to shift.
