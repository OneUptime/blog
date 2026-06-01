# Validation Summary: How to Set Up Azure Confidential VMs with Customer-Managed Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Confidential VMs
- Azure Key Vault Premium
- Azure Key Vault Managed HSM
- Azure Disk Encryption Sets
- Azure Managed Disks
- Azure CLI
- Customer-managed keys
- AMD SEV-SNP and Intel TDX

## Sources Consulted
- Microsoft Learn: Create a confidential VM with the Azure CLI for Azure confidential computing - https://learn.microsoft.com/en-us/azure/confidential-computing/quick-create-confidential-vm-azure-cli
- Microsoft Learn: Server-side encryption of Azure Disk Storage - https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Microsoft Learn: Overview of managed disk encryption options - https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption-overview
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az keyvault key` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/key?view=azure-cli-latest
- Microsoft Learn: Azure RBAC built-in roles for Key Vault crypto operations - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- Microsoft Learn: About Azure confidential VMs - https://learn.microsoft.com/en-us/azure/confidential-computing/confidential-vm-overview
- Microsoft Learn: Azure Confidential VM options - https://learn.microsoft.com/en-us/azure/confidential-computing/virtual-machine-options

## Issues Found
- The Key Vault setup used RBAC without granting the Confidential VM Orchestrator release permissions required for confidential OS disk encryption. I changed the example to use Key Vault access policies, added the Confidential VM Orchestrator service principal setup, and granted `get` and `release`.
- The confidential VM key creation command omitted `--exportable true` and `--default-cvm-policy`, which are required for the confidential VM secure key release flow. I added both flags.
- The post stated that only 3072-bit and 4096-bit keys are supported. Azure managed disks support RSA and RSA-HSM keys of 2048, 3072, and 4096 bits, so I corrected the comment.
- The VM creation command used `--os-disk-encryption-set` for confidential OS disk encryption with CMK. I changed it to `--os-disk-secure-vm-disk-encryption-set`, which is the Azure CLI parameter for customer-managed-key encrypted Confidential VM OS disk and VM guest state.
- The data disk example used the confidential VM disk security type for a data disk. Microsoft documentation describes confidential disk encryption as OS-disk focused, so I changed the data disk flow to use Azure Disk Storage server-side encryption with a separate standard DES referencing the same key.
- The key rotation example only updated one disk encryption set and described full re-encryption. I updated both DES resources for manual rotation and changed the wording to rewrapping, matching Azure's envelope encryption behavior.
- The post suggested automatic key rotation for the confidential VM OS disk DES. Azure documentation currently states that automatic key rotation is not supported for confidential VM OS disk encryption, so I limited automatic rotation to the standard data disk DES.
- The confidential VM size list and availability command were outdated/imprecise. I updated the Intel TDX families to v6, added current AMD v6 families, and changed the region availability example to use `az vm list-skus` with a specific confidential VM family.
- The conclusion claimed the setup protects data in transit. The post does not configure transport encryption, so I narrowed the statement to data at rest and in use.

## Review Notes
Azure CLI was not installed in the local environment, so commands were validated against Microsoft Learn CLI references and product documentation rather than by executing them locally.
