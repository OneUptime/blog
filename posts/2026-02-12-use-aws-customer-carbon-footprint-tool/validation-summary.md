# Validation Summary: How to Use AWS Customer Carbon Footprint Tool

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Customer Carbon Footprint Tool
- AWS Sustainability service and API
- AWS Billing and Cost Management Data Exports
- AWS IAM
- AWS CLI
- Boto3 for Python
- AWS Compute Optimizer
- Amazon EC2, Amazon S3, Amazon CloudFront, AWS Lambda, Amazon CloudWatch

## Sources Consulted
- AWS Billing and Cost Management User Guide: Viewing your carbon footprint - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/what-is-ccft.html
- AWS Billing and Cost Management User Guide: Understanding the Customer Carbon Footprint Tool - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ccft-overview.html
- AWS Sustainability User Guide: Getting started with AWS Sustainability - https://docs.aws.amazon.com/sustainability/latest/userguide/getting-started.html
- AWS Sustainability User Guide: Key concepts - https://docs.aws.amazon.com/sustainability/latest/userguide/key-concepts.html
- AWS Sustainability User Guide: Prerequisites - https://docs.aws.amazon.com/sustainability/latest/userguide/setting-up.html
- AWS Sustainability API Reference: GetEstimatedCarbonEmissions - https://docs.aws.amazon.com/sustainability/latest/APIReference/API_GetEstimatedCarbonEmissions.html
- Boto3 documentation: Sustainability client get_estimated_carbon_emissions - https://docs.aws.amazon.com/boto3/latest/reference/services/sustainability/client/get_estimated_carbon_emissions.html
- AWS CLI Command Reference: sustainability get-estimated-carbon-emissions - https://docs.aws.amazon.com/cli/latest/reference/sustainability/get-estimated-carbon-emissions.html
- AWS Data Exports documentation: Carbon emissions table - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-carbon-emissions.html
- AWS Data Exports documentation: Carbon emissions columns - https://docs.aws.amazon.com/cur/latest/userguide/carbon-emissions-columns.html
- AWS CLI Command Reference: bcm-data-exports create-export - https://docs.aws.amazon.com/cli/latest/reference/bcm-data-exports/create-export.html
- AWS CLI Command Reference: compute-optimizer get-ec2-instance-recommendations - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS Graviton product page - https://aws.amazon.com/ec2/graviton/

## Issues Found
- The post did not mention AWS's announced June 30, 2026 deprecation of the Customer Carbon Footprint Tool in favor of AWS Sustainability. Added a brief note in the introduction.
- The emissions methodology described a simple regional grid carbon-intensity model and carbon offsets. Updated the explanation and diagram to reflect location-based and market-based emissions calculations and AWS carbon-free energy purchases.
- The IAM snippet used `aws-portal:ViewBilling` and a nonexistent/old API-focused action as the primary access guidance. Replaced it with `sustainability:GetCarbonFootprintSummary` for CCFT and the current AWS Sustainability API permissions.
- The JSON IAM example included a JavaScript-style comment, making it invalid JSON. Removed the comment.
- The service breakdown table asserted typical percentages and included services not shown individually in the CCFT service view. Replaced it with AWS-documented service grouping behavior and noted API/Data Exports service grouping.
- The avoided emissions explanation incorrectly described carbon offsets. Replaced it with the documented emissions savings definition based on location-based versus market-based calculations.
- The Boto3 example used nonexistent `get_carbon_footprint_summary` response fields and an unused Billing Conductor client. Replaced it with `get_estimated_carbon_emissions` and the documented response structure.
- The reporting section incorrectly described sustainability columns in CUR. Replaced it with an AWS Data Exports `CARBON_EMISSIONS` table example using `aws bcm-data-exports create-export`.
- The Compute Optimizer CLI example used the response enum `OVER_PROVISIONED` instead of the documented filter value `Overprovisioned`. Corrected the filter syntax.
- The Spot, serverless, and S3 Glacier sustainability claims were overstated. Reworded them to align with AWS service behavior without claiming unverified direct energy savings.
- The alerting pipeline referenced CUR sustainability columns. Updated it to use the `CARBON_EMISSIONS` Data Exports table.
- ESG scope mapping omitted Scope 1. Updated it to Scope 1, Scope 2, and Scope 3 categories attributed to AWS usage.
- The post stated a 3-month data lag and historical data back to January 2020. Updated this to monthly publication between the 15th and 21st after usage, January 2022 historical availability in AWS Sustainability, and the CCFT console's previous-38-month view.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI snippets were validated against the official AWS CLI command reference rather than local `--help` output. The Data Exports command still requires a real S3 bucket, bucket owner account ID, and permissions before it can run in an AWS account.
