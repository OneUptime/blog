# Validation Summary: How to Use AWS Marketplace to Buy and Sell Software

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Marketplace
- AWS Marketplace Discovery API
- AWS Marketplace Catalog API
- AWS Marketplace Agreement API
- AWS Marketplace Metering and Entitlement APIs
- Amazon EC2 AMIs
- Amazon ECR, ECS, and EKS container deployment
- AWS Cost Explorer
- AWS Budgets
- Python and boto3

## Sources Consulted
- AWS Marketplace Discovery API, SearchListings: https://docs.aws.amazon.com/marketplace/latest/APIReference/API_marketplace-discovery_SearchListings.html
- AWS CLI marketplace-discovery search-listings reference: https://docs.aws.amazon.com/cli/latest/reference/marketplace-discovery/search-listings.html
- AWS Marketplace Agreement API overview: https://docs.aws.amazon.com/marketplace/latest/APIReference/agreement-apis.html
- AWS CLI marketplace-agreement search-agreements reference: https://docs.aws.amazon.com/cli/latest/reference/marketplace-agreement/search-agreements.html
- AWS Marketplace Catalog API ListEntities reference: https://docs.aws.amazon.com/marketplace-catalog/latest/api-reference/API_ListEntities.html
- AWS Marketplace private marketplace API guide: https://docs.aws.amazon.com/marketplace/latest/APIReference/work-with-private-marketplace.html
- AWS Marketplace Entitlement CLI reference: https://docs.aws.amazon.com/cli/latest/reference/marketplace-entitlement/get-entitlements.html
- AWS Marketplace Metering ResolveCustomer API reference: https://docs.aws.amazon.com/marketplace/latest/APIReference/API_marketplace-metering_ResolveCustomer.html
- AWS CLI meteringmarketplace meter-usage and batch-meter-usage references: https://docs.aws.amazon.com/cli/latest/reference/meteringmarketplace/
- AWS Marketplace AMI product requirements and AMI scanning guidance: https://docs.aws.amazon.com/marketplace/latest/userguide/product-and-ami-policies.html and https://docs.aws.amazon.com/marketplace/latest/userguide/best-practices-for-building-your-amis.html
- AWS Marketplace listing fees: https://docs.aws.amazon.com/marketplace/latest/userguide/listing-fees.html
- AWS Promotional Credit terms: https://aws.amazon.com/awscredits/
- AWS Cost Management budget filters: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html
- AWS CLI budgets create-budget reference: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Cost Explorer GetDimensionValues and billing dimensions: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetDimensionValues.html

## Issues Found
- Replaced the buyer catalog search example. The original used AWS Marketplace Catalog API `list-entities`, which is primarily for seller product and private marketplace administration, not buyer catalog discovery. Updated it to `aws marketplace-discovery search-listings` with a valid fulfillment option filter.
- Replaced the SaaS buyer subscription examples. `license-manager list-received-licenses` and `marketplace-entitlement get-entitlements` were not appropriate as general buyer subscription checks. Updated the example to use AWS Marketplace Agreement API `search-agreements` with `PartyType=Acceptor` and `AgreementType=PurchaseAgreement`.
- Corrected the placeholder AMI ID from a product-id-like value to a syntactically valid AMI ID pattern.
- Added the required ECR authentication step before pulling a Marketplace container image from ECR.
- Clarified Private Marketplace scope. It can be associated with an organization, OUs, or accounts; the original wording overstated it as only AWS Organizations level enforcement.
- Corrected procurement claims. Marketplace spend does not universally count toward every EDP or private pricing commitment, and promotional AWS credits generally do not apply to AWS Marketplace charges unless the specific credit terms allow it.
- Corrected the seller registration CLI example. Listing draft products via Catalog API is not a seller status check, and the modern enhanced filter shape uses `--entity-type-filters`.
- Replaced the AMI sharing command with current AWS Marketplace Management Portal AMI scanning guidance. The hard-coded Marketplace account sharing step was not the documented current scanning workflow.
- Corrected Marketplace seller fees from a broad "3-20%" claim to current standard examples: 3% for SaaS public offers and 20% for server public offers, with fees varying by offer type and deployment method.
- Fixed the Python SaaS integration snippet. The boto3 service name is `meteringmarketplace`, not `marketplace-metering`; the snippet was missing `datetime`; SaaS metering should use `batch_meter_usage`; and entitlement checks now use `CUSTOMER_AWS_ACCOUNT_ID`.
- Removed an invalid JavaScript-style comment from a `json` code block so the snippet is valid JSON.
- Corrected Marketplace cost filtering. Cost Explorer and Budgets should filter Marketplace purchases with the `BILLING_ENTITY` dimension value `AWS Marketplace`, not `RECORD_TYPE=Marketplace`. Updated the Budgets example to use `FilterExpression` and `Metrics`.
- Updated the conclusion to remove the inaccurate statement that buyers can apply AWS credits and EDP commitments generally.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and API documentation rather than local `--help` output.
