# Validation Summary: How to Configure Azure Confidential Ledger for Tamper-Proof Audit Trail Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Confidential Ledger
- Azure CLI
- Azure Confidential Ledger Python SDK
- Microsoft Entra ID authentication
- Confidential Consortium Framework
- Merkle-tree transaction receipts

## Sources Consulted
- Microsoft Learn: Azure Confidential Ledger documentation: https://learn.microsoft.com/en-us/azure/confidential-ledger/
- Microsoft Learn: Quickstart: Create a confidential ledger using the Azure CLI: https://learn.microsoft.com/en-us/azure/confidential-ledger/quickstart-cli
- Microsoft Learn: Azure CLI `az confidentialledger` reference: https://learn.microsoft.com/en-us/cli/azure/confidentialledger
- Microsoft Learn: Quickstart: Microsoft Azure confidential ledger client library for Python: https://learn.microsoft.com/en-us/azure/confidential-ledger/quickstart-python
- Microsoft Learn: Azure Confidential Ledger Python client API reference: https://learn.microsoft.com/en-us/python/api/azure-confidentialledger/azure.confidentialledger.confidentialledgerclient
- Microsoft Learn: Confidential Ledger Certificate Client API reference: https://learn.microsoft.com/en-us/python/api/azure-confidentialledger-certificate/azure.confidentialledger.certificate.confidentialledgercertificateclient
- Microsoft Learn: Azure Confidential Ledger client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/confidentialledger-readme
- Microsoft Learn: Manage Microsoft Entra token-based users in Azure Confidential Ledger: https://learn.microsoft.com/en-us/azure/confidential-ledger/manage-azure-ad-token-based-users
- Microsoft Learn: Verify Azure Confidential Ledger write transaction receipts: https://learn.microsoft.com/en-us/azure/confidential-ledger/verify-write-transaction-receipts
- Azure pricing: Azure Confidential Ledger pricing: https://azure.microsoft.com/en-us/pricing/details/confidential-ledger/

## Issues Found
- The Python write example used `entry_contents=...`, but the current `create_ledger_entry` API expects an entry object such as `{"contents": "..."}`. Updated the snippet accordingly.
- The certificate client was instantiated with a positional endpoint. The current API documents `certificate_endpoint` as a keyword-only parameter. Updated the constructor call.
- The receipt example used `get_transaction_receipt`, which is not the current SDK method name. Updated it to use `get_receipt` after waiting for commit with `begin_wait_for_commit`.
- The transaction polling example imported `TransactionState` from the top-level package and compared against `TransactionState.PENDING`. The current documented client supports `begin_wait_for_commit`, so the snippet now uses the poller.
- The Azure CLI examples used camelCase keys in `--aad-based-security-principals`. Updated them to the documented CLI shorthand field names: `principal-id`, `tenant-id`, and `ledger-role-name`.
- The explanation of `ledger-type` incorrectly described Public and Private as internet versus private endpoint access. Updated it to reflect Azure documentation: Public stores transaction data in plain text, while Private encrypts transaction data, and the type cannot be changed after creation.
- The pricing section incorrectly stated that pricing is transaction-based and that writes cost more than reads. Updated it to describe current ledger instance and storage-based pricing.
- The performance section gave a specific latency range without an official source. Replaced the hard-coded range with a general note to test against workload volume and region.

## Review Notes
- The tutorial is technically relevant and includes commands and Python implementation details.
- Azure Confidential Ledger names are globally unique, and ledger creation requires appropriate Azure subscription permissions; the post assumes those prerequisites but does not enumerate them.
- The examples were checked against Microsoft documentation current as of 2026-06-01.
