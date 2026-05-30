# Validation Summary: How to Transfer Data from AWS S3 to Azure Blob Storage Using AzCopy

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Microsoft AzCopy v10
- Azure Blob Storage
- Azure Storage shared access signatures (SAS)
- Microsoft Entra ID authentication for AzCopy
- AWS S3
- AWS IAM
- AWS KMS / SSE-KMS
- Azure CLI
- AWS CLI

## Sources Consulted
- Microsoft Learn: Copy data from Amazon S3 to Azure Storage by using AzCopy: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-s3
- Microsoft Learn: Get started with AzCopy: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10
- Microsoft Learn: AzCopy v10 configuration settings: https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-configuration-settings
- Microsoft Learn / Azure Storage AzCopy reference: azcopy copy: https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy
- Microsoft Learn: Find errors and resume jobs by using log and plan files in AzCopy: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-configure
- Microsoft Learn: Azure CLI `az storage account generate-sas`: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- AWS Documentation: Downloading objects from Requester Pays buckets: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ObjectsinRequesterPaysBuckets.html
- AWS Documentation: Amazon S3 GetObject API: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS S3 product details / performance guidance: https://aws.amazon.com/s3/details/
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- Microsoft Azure bandwidth pricing: https://azure.microsoft.com/en-us/pricing/details/bandwidth/
- Azure Storage AzCopy source repository, checked for current environment-variable support: https://github.com/Azure/azure-storage-azcopy

## Issues Found
- The post incorrectly stated that S3-to-Blob transfers flow through the machine running AzCopy. Updated the explanation to match Microsoft documentation: AzCopy uses service-to-service copy with pre-signed S3 URLs, and the data is copied directly between AWS S3 and Azure Storage servers.
- The post advised running AzCopy on an Azure VM in the destination region to minimize egress costs and maximize upload bandwidth. Updated this because client placement does not remove AWS-to-Azure egress for service-to-service copy.
- The prerequisites and performance sections implied client bandwidth and buffer memory were primary bottlenecks. Updated these to focus on a stable runner, log/plan files, enumeration, and job orchestration.
- The AWS credential section used `AWS_DEFAULT_REGION`, which is not documented as an AzCopy S3 credential setting. Replaced it with guidance to use a region-specific S3 endpoint in the AzCopy source URL.
- The SAS expiry command used GNU `date` syntax only. Added the macOS `date -v+7d` equivalent as a commented alternative.
- The region-specific S3 example used the older hyphenated endpoint form. Updated it to the dot-form endpoint recommended by current AzCopy source guidance.
- The verification section implied AzCopy preserves Content-MD5 when available. Replaced that with checksum guidance that avoids relying on S3 ETags for multipart-uploaded or SSE-KMS-encrypted objects.
- The requester-pays guidance recommended `--s2s-preserve-access-tier=false`, which is unrelated to S3 Requester Pays. Replaced it with the AWS requirement for `x-amz-request-payer=requester` and noted that AzCopy does not expose a documented requester-pays flag.
- The large-file note described multipart downloads/uploads through the client. Updated it to describe large service-to-service copies being split into Azure Blob blocks.
- The SSE-KMS note only mentioned `kms:Decrypt`. Updated it to account for required S3 read permissions and KMS key policy/permissions.
- The S3 request-rate number was wrong for GET operations. Updated it from 3,500 GET requests per second per prefix to at least 5,500 GET/HEAD requests per second per prefix.
- The timeout section used unsupported `AZCOPY_RETRY_DELAY`. Replaced it with the documented `AZCOPY_REQUEST_TRY_TIMEOUT` setting and adjusted the text to describe per-request timeout, not retry delay.
- The cost section incorrectly claimed running AzCopy on same-region EC2 can avoid S3 egress charges. Updated it to state that cross-cloud transfer to Azure still leaves AWS and can incur egress charges.

## Review Notes
The main command syntax for `azcopy copy`, `--recursive`, include/exclude patterns, `--cap-mbps`, `--log-level`, `azcopy jobs list/show/resume`, and Azure CLI account SAS generation matches current official documentation. Pricing should be rechecked before publication because cloud egress prices vary by region and can change.
