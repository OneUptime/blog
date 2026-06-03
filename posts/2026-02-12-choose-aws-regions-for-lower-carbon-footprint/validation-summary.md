# Validation Summary: How to Choose AWS Regions for Lower Carbon Footprint

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Regions
- AWS Customer Carbon Footprint Tool
- AWS Price List Query API / AWS CLI
- Amazon Route 53 weighted routing
- AWS Batch and boto3
- Cloud sustainability and electricity carbon intensity

## Sources Consulted
- AWS Billing User Guide: Understanding the Customer Carbon Footprint Tool (CCFT): https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ccft-overview.html
- AWS Billing User Guide: Calling AWS services and prices using the AWS Price List: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html
- AWS CLI Command Reference: pricing get-products: https://docs.aws.amazon.com/cli/latest/reference/pricing/get-products.html
- Amazon Route 53 API Reference: ChangeResourceRecordSets: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- Amazon Route 53 API Reference: ResourceRecordSet: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Boto3 documentation: Batch.Client.submit_job: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/batch/client/submit_job.html
- AWS Services in Scope by Compliance Program: https://aws.amazon.com/compliance/services-in-scope/
- AWS ISO and CSA STAR Certifications and Services: https://aws.amazon.com/compliance/iso-certified/
- AWS EC2 Reachability Test: https://ec2-reachability.amazonaws.com/
- Amazon Sustainability: Carbon-free energy: https://sustainability.aboutamazon.com/environment/sustainable-operations/renewable-energy
- Amazon announcement on matching 100% renewable electricity: https://www.aboutamazon.com/news/sustainability/amazon-renewable-energy-updates
- IEA Electricity 2025 emissions analysis: https://www.iea.org/reports/electricity-2025/emissions
- U.S. EIA FAQ on CO2 from electricity generation: https://www.eia.gov/tools/faqs/faq.php?id=74&t=3
- Hydro-Quebec overview of Quebec hydropower: https://www.hydroquebec.com/about/our-energy.html
- Statistics Sweden monthly electricity generation by type of production: https://www.scb.se/en/finding-statistics/statistics-by-subject-area/energy/energy-supply-and-use/monthly-electricity-statistics-including-switches-of-electricity-supplier/pong/tables-and-graphs/monthly-electricity-generation-by-type-of-production/
- Australian Government electricity generation fuel mix: https://www.energy.gov.au/australian-electricity-generation-fuel-mix

## Issues Found
- The compliance criteria snippet said all AWS regions meet SOC2 and ISO27001 requirements. AWS documents compliance scope by service and program, so I changed the comment to say required AWS services and regions should be verified as in scope.
- The latency measurement snippet described the EC2 Instance Metadata Service, but the command calls public regional EC2 endpoints with curl. I corrected the comment to avoid confusing public endpoint timing with IMDS.
- The AWS Pricing API example could imply that `--region us-east-1` selects the product region. AWS documents this as the Pricing API endpoint region, so I added a `location` filter and clarified that the location value should be changed for each candidate region.
- The post said AWS has a goal of powering operations with 100% renewable energy. Amazon states it matched 100% of electricity consumed across global operations, including AWS data centers, with renewable energy in 2023 and 2024, so I updated the statement.

## Review Notes
The carbon region rankings are approximate and depend on grid mix, workload timing, AWS procurement/accounting methods, and available AWS services in each region. The post correctly presents them as estimates rather than exact AWS-published region carbon intensity values.
