# Validation Summary: How to Use Azure CLI Batch Commands and JMESPath Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CLI
- JMESPath
- Bash scripting
- Azure Resource Manager resources
- Azure virtual machines
- Azure Storage accounts
- Azure networking resources
- Azure resource locks

## Sources Consulted
- Microsoft Learn: How to query Azure CLI command output using a JMESPath query - https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Azure CLI `az resource` reference - https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Azure CLI `az storage account` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure CLI `az network nsg` reference - https://learn.microsoft.com/en-us/cli/azure/network/nsg
- Microsoft Learn: Azure CLI `az network public-ip` reference - https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: Azure CLI `az lock` reference - https://learn.microsoft.com/en-us/cli/azure/lock
- JMESPath Specification - https://jmespath.org/specification.html

## Issues Found
- The storage account filter was described as finding accounts larger than a specific size, but the query filters `sku.tier=='Premium'`. Updated the comment to say it finds Premium-tier storage accounts.
- The combined VM filter was described as finding VMs with more than 4 cores, but the query only excludes `Standard_B2s` and does not inspect core count. Updated the comment to describe the actual size exclusion.
- The nested NSG rule example was labeled as flattening nested arrays, but the query returns rules grouped under each NSG. Updated the heading and comment to match the output shape.
- The audit script comment called accounts without infrastructure encryption "unencrypted storage accounts." Azure Storage is encrypted by default; this query checks the separate infrastructure encryption property. Updated the comment.
- The performance tip said `--query` reduces the response payload. Azure CLI documentation states queries are executed client-side on the returned JSON before display formatting. Updated the note to distinguish output reduction from service-side filtering.

## Review Notes
Azure CLI was not installed in the local environment, so commands could not be executed directly with `az --help`. Validation was performed against current Microsoft Learn CLI reference pages and the JMESPath specification.
