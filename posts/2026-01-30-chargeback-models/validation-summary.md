# Validation Summary: How to Implement Chargeback Models

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- FinOps chargeback and showback
- Cloud cost allocation
- AWS Cost Explorer API
- AWS Resource Groups Tagging API
- AWS CloudFormation resource tagging
- Python
- Boto3
- Mermaid diagrams

## Sources Consulted
- FinOps Foundation Invoicing & Chargeback capability: https://www.finops.org/framework/capabilities/invoicing-chargeback/
- FinOps Foundation Allocation capability: https://www.finops.org/framework/capabilities/allocation/
- AWS Cost Explorer GetCostAndUsage API Reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Boto3 Cost Explorer get_cost_and_usage documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS Cost Explorer granular data documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-granular-data.html
- Boto3 ResourceGroupsTaggingAPI get_resources documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/resourcegroupstaggingapi/client/get_resources.html
- AWS CloudFormation AWS::RDS::DBInstance Tag documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-rds-dbinstance-tag.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python decimal documentation: https://docs.python.org/3/library/decimal.html
- Python typing documentation: https://docs.python.org/3/library/typing.html

## Issues Found
- Updated chargeback guidance that implied chargeback is inherently the more mature model. FinOps Foundation guidance frames chargeback as dependent on accounting policy, so the post now says to use it when formal accounting or budgeting requires it.
- Changed "graduate to chargeback" wording to "move to chargeback" when accounting policies require it, to avoid implying showback is less mature.
- Fixed the `TagBasedAllocator.allocate` return annotation. The method returns both allocations and untagged costs, so the type hint now uses `Tuple[Dict[str, Decimal], Decimal]`.
- Fixed `allocate_proportional` so an empty `usage_metrics` list returns `{}` instead of dividing by zero in the fallback branch.
- Fixed `distribute_evenly` so an empty teams list returns `{}` instead of dividing by zero.
- Corrected the AWS Cost Explorer collector docstring. The example groups costs by service and a tag; it does not fetch resource-level tags from `get_cost_and_usage`.

## Review Notes
The Python examples were checked for syntax compilation. The AWS Cost Explorer example uses valid `Granularity`, `Metrics`, and `GroupBy` fields, but real deployments should also handle pagination via `NextPageToken` and ensure required cost allocation tags and granular data settings are enabled where applicable.
