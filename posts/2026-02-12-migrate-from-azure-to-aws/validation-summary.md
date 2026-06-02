# Validation Summary: How to Migrate from Azure to AWS

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Microsoft Azure
- AWS
- Azure CLI
- AWS SDK for Python (boto3)
- Amazon EC2 and VM Import/Export
- AWS Application Migration Service
- Amazon VPC and AWS Site-to-Site VPN
- Azure SQL Database
- AWS Database Migration Service
- Amazon RDS for SQL Server
- Azure Cosmos DB
- Amazon DynamoDB
- Azure Blob Storage
- Amazon S3
- rclone
- AzCopy
- Microsoft Entra ID / Azure AD
- AWS IAM Identity Center
- Azure DNS
- Amazon Route 53
- Amazon CloudWatch

## Sources Consulted
- Azure CLI `az resource list` documentation: https://learn.microsoft.com/en-us/cli/azure/resource
- Azure CLI `az vm list` documentation: https://learn.microsoft.com/en-us/cli/azure/vm
- Azure CLI `az sql db list` documentation: https://learn.microsoft.com/en-us/cli/azure/sql/db
- Azure CLI `az disk grant-access` documentation: https://learn.microsoft.com/en-us/cli/azure/disk
- Azure DNS import/export documentation: https://learn.microsoft.com/en-us/azure/dns/dns-import-export
- AWS Site-to-Site VPN concepts and setup documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
- boto3 `create_vpn_connection` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/create_vpn_connection.html
- AWS VM Import/Export requirements: https://docs.aws.amazon.com/vm-import/latest/userguide/prerequisites.html
- AWS VM Import/Export import image documentation: https://docs.aws.amazon.com/vm-import/latest/userguide/import-vm-image.html
- AWS Application Migration Service supported operating systems: https://docs.aws.amazon.com/mgn/latest/ug/Supported-Operating-Systems.html
- AWS DMS Azure SQL Database source documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.AzureSQL.html
- boto3 DMS `create_endpoint` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dms/client/create_endpoint.html
- AWS Data Pipeline availability notice: https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/DocHistory.html
- Amazon Route 53 zone file import documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/rrs-changes-import-console.html
- Amazon Route 53 `ChangeResourceRecordSets` CLI documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Microsoft Entra ID and AWS IAM Identity Center SSO documentation: https://learn.microsoft.com/en-us/entra/identity/saas-apps/aws-single-sign-on-tutorial

## Issues Found
- The Azure SQL database inventory command omitted the resource group. Updated `az sql db list` to include `--resource-group myRG`, matching the Azure CLI documented command form when no default resource group is assumed.
- The AWS Site-to-Site VPN example only created a virtual private gateway and did not attach it to the VPC or create the required customer gateway and VPN connection. Updated the snippet to attach the virtual private gateway, create a customer gateway for the Azure VPN Gateway public IP, and create the VPN connection.
- The AWS Application Migration Service guidance implied all Azure VMs could be replicated the same way. Added a caveat to verify supported operating systems and kernels, because AWS documents limitations for Azure-specific Linux kernels.
- The DMS section described an Azure SQL Database migration without noting that Azure SQL Database sources do not support CDC in AWS DMS. Added the full-load-only caveat for Azure SQL Database.
- The DMS source endpoint used `EngineName='sqlserver'` for Azure SQL Database. Updated it to `EngineName='azuredb'`, which is the documented DMS engine value for Azure SQL Database endpoints.
- The Cosmos DB migration section suggested AWS Data Pipeline, which AWS says is no longer available to new customers. Replaced it with AWS Glue as a current ETL option.
- The Cosmos DB to DynamoDB sample only copied the `id` field, so it did not actually preserve the document's application fields. Updated the transformation to copy all document fields except Cosmos DB system metadata fields.
- The Azure DNS export command redirected JSON output, but Azure DNS exports BIND-compatible zone files using `--file-name`. Updated the command to write `example.com.zone`.
- The Route 53 import note implied a generic import path. Clarified that zone files can be imported through the Route 53 console, or converted to a `ChangeResourceRecordSets` JSON change batch for AWS CLI usage.

## Review Notes
The remaining examples are intentionally illustrative and still require real account IDs, resource names, credentials, IAM roles, firewall rules, route table updates, and production validation before use. The VM import section is technically plausible, but production migrations should also verify operating system support, licensing parameters, and VM Import/Export prerequisites.
