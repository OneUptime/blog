# Validation Summary: How to Use AWS Compute Optimizer for Right-Sizing Recommendations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Compute Optimizer
- AWS CLI
- Boto3 for Python
- Amazon EC2
- AWS Lambda
- Amazon EBS
- Amazon ECS on AWS Fargate
- EC2 Auto Scaling groups

## Sources Consulted
- AWS CLI Command Reference: update-enrollment-status - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/update-enrollment-status.html
- AWS CLI Command Reference: put-recommendation-preferences - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/put-recommendation-preferences.html
- Boto3 Compute Optimizer: get_ec2_instance_recommendations - https://docs.aws.amazon.com/boto3/latest/reference/services/compute-optimizer/client/get_ec2_instance_recommendations.html
- Boto3 Compute Optimizer: get_lambda_function_recommendations - https://docs.aws.amazon.com/boto3/latest/reference/services/compute-optimizer/client/get_lambda_function_recommendations.html
- Boto3 Compute Optimizer: get_ebs_volume_recommendations - https://docs.aws.amazon.com/boto3/latest/reference/services/compute-optimizer/client/get_ebs_volume_recommendations.html
- Boto3/Botocore Compute Optimizer: get_ecs_service_recommendations - https://docs.aws.amazon.com/botocore/latest/reference/services/compute-optimizer/client/get_ecs_service_recommendations.html
- AWS Compute Optimizer User Guide: Resource requirements - https://docs.aws.amazon.com/compute-optimizer/latest/ug/requirements.html
- AWS Compute Optimizer User Guide: Metrics analyzed by AWS Compute Optimizer - https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html
- AWS Compute Optimizer User Guide: Enhanced infrastructure metrics - https://docs.aws.amazon.com/compute-optimizer/latest/ug/enhanced-infrastructure-metrics.html
- AWS Compute Optimizer User Guide: Supported resources - https://docs.aws.amazon.com/compute-optimizer/latest/ug/supported-resources.html

## Issues Found
- The post stated that Compute Optimizer generally needs at least 30 hours of metric data. Updated this to reflect resource-specific requirements: EC2 and Auto Scaling groups need 30 hours in the past 14 days, EBS volumes need 30 consecutive attached/running hours, Lambda functions need 50 invocations in the last 14 days, and ECS services on Fargate need 24 hours of metrics in the past 14 days.
- The EC2 finding category list used uppercase enum names and included `NOT_OPTIMIZED`. Updated the list to the documented finding names described for EC2 instance recommendations and removed the category that was not described in the EC2 findings explanation.
- The EC2 example contained an unused projected CPU calculation and checked for `CPU`, while current documented projected metric names use `Cpu`. Removed the unused block.
- The ECS example accessed `currentServiceConfiguration["taskDefinition"]`, but the documented response exposes `cpu`, `memory`, `containerConfigurations`, `autoScalingConfiguration`, and `taskDefinitionArn` under `currentServiceConfiguration`. Updated the snippet to read CPU and memory directly and print recommended CPU and memory from each recommendation option.
- The ECS section described ECS recommendations without the Fargate qualifier. Updated it to state that Compute Optimizer generates ECS service recommendations for services running on AWS Fargate.
- The full-report snippet only counted uppercase EC2 finding values and compared optimized findings against `Optimized`. Updated the comparisons to handle both documented mixed-case values and the uppercase API-response note for EC2.
- The enhanced recommendations section said enhanced infrastructure metrics consider metrics at 1-minute granularity instead of 5 minutes. Updated this because official docs describe enhanced infrastructure metrics as extending the lookback period to up to 93 days; the metrics documentation separately states EC2/EBS/Lambda use five-minute intervals while ECS on Fargate uses one-minute intervals.

## Review Notes
- Python code snippets were syntax-checked locally with `python3 compile()`.
- The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
