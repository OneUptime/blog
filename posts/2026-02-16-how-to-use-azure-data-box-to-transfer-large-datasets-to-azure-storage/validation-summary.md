# Validation Summary: How to Use Azure Data Box to Transfer Large Datasets to Azure Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Box
- Azure Data Box Disk
- Azure Data Box Next Gen
- Azure Storage
- Azure CLI
- SMB and NFS
- Robocopy
- rsync

## Sources Consulted
- Microsoft Learn: Microsoft Azure Data Box overview - https://learn.microsoft.com/en-us/azure/databox/data-box-overview
- Microsoft Learn: Tutorial to order Azure Data Box - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-ordered
- Microsoft Learn: Azure CLI `az databox job` reference - https://learn.microsoft.com/en-us/cli/azure/databox/job
- Microsoft Learn: Tutorial to set up Azure Data Box - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-set-up
- Microsoft Learn: Tutorial to copy data via SMB on Azure Data Box - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-copy-data
- Microsoft Learn: Tutorial to copy data to Azure Data Box via NFS - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-copy-data-via-nfs
- Microsoft Learn: Tutorial to prepare Azure Data Box to ship - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-prepare-to-ship
- Microsoft Learn: Return Azure Data Box and verify data upload - https://learn.microsoft.com/en-us/azure/databox/data-box-deploy-picked-up
- Microsoft Learn: Track and log Azure Data Box events - https://learn.microsoft.com/en-us/azure/databox/data-box-logs
- Microsoft Learn: Microsoft Azure Data Box Disk FAQ - https://learn.microsoft.com/en-us/azure/databox/data-box-disk-faq
- Microsoft Learn: Microsoft Azure Data Box security overview - https://learn.microsoft.com/en-us/azure/databox/data-box-security

## Issues Found
- The opening transfer-time example incorrectly said 100 TB over a 10 Gbps connection takes over 11 days. Corrected it to a 1 Gbps example with real-world throughput caveats.
- The SKU section described Data Box Heavy as a current option. Microsoft documentation now states Data Box Heavy has been retired, so the post now points readers to Data Box Next Gen 120 TB / 525 TB devices for larger migrations.
- The Azure CLI order command used an incorrect `--street-address-1` flag and omitted the required `--transfer-type ImportToAzure` parameter. Updated the command to use `--street-address1`, include `--transfer-type`, and include `--company-name`.
- The share mapping explanation implied each share maps directly to a container or file share. Updated it to clarify that Data Box shares map to storage types, with folders mapping to containers or Azure file shares.
- The block blob copy paths did not include an access tier folder. For orders placed after April 1, 2024, Microsoft documentation recommends copying block blob data under an access tier folder, so the Robocopy and rsync examples now use `Hot/migration-container`.
- The SMB credential guidance incorrectly pointed to Azure portal device credentials. Updated it to use the SMB share credentials shown in the local web UI under Connect and copy.
- The NFS example omitted the required NFS client access configuration step. Added a sentence directing users to allow the Linux host IP address in the local web UI before mounting.
- The security section stated that Microsoft overwrites all data multiple times during device wipe. Microsoft documents secure erasure according to NIST SP 800-88 Revision 1, so the wording was corrected to match the documented guarantee.
- The closing recommendation still referenced Data Box Heavy. Updated it to recommend Data Box Next Gen or multiple Data Box devices.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was validated against the official Azure CLI reference and Microsoft Learn tutorials rather than local `az --help` output.
