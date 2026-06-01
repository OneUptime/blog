# Validation Summary: How to Set Up Azure Confidential Computing with DCsv3 Virtual Machines for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Confidential Computing
- Azure DCsv3 virtual machines
- Intel SGX and Enclave Page Cache (EPC)
- Azure CLI
- Intel SGX SDK and DCAP packages
- Open Enclave SDK
- Microsoft Azure Attestation
- Azure Kubernetes Service confidential computing node pools
- C/C++ SGX enclave application structure

## Sources Consulted
- Microsoft Learn: DCsv3 size series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dcsv3-series
- Microsoft Learn: Solutions on Azure for Intel SGX - https://learn.microsoft.com/azure/confidential-computing/virtual-machine-solutions-sgx
- Microsoft Learn: Create a confidential VM with the Azure CLI - https://learn.microsoft.com/en-us/azure/confidential-computing/quick-create-confidential-vm-azure-cli
- Microsoft Learn: Azure Attestation SGX enclave REST API - https://learn.microsoft.com/en-us/rest/api/attestation/attestation/attest-sgx-enclave?view=rest-attestation-2022-08-01
- Microsoft Learn: Deploy AKS cluster with Intel SGX nodes - https://learn.microsoft.com/en-us/azure/confidential-computing/confidential-enclave-nodes-aks-get-started
- Intel SGX Software Installation Guide for Linux - https://download.01.org/intel-sgx/sgx-linux/2.26/docs/Intel_SGX_SW_Installation_Guide_for_Linux.pdf
- Intel SGX Ubuntu package repository and SDK download index - https://download.01.org/intel-sgx/
- Open Enclave SDK documentation - https://openenclave.io/sdk/
- Open Enclave Ubuntu package install guide - https://github.com/openenclave/openenclave/blob/master/docs/GettingStartedDocs/install_oe_sdk-Ubuntu_20.04.md

## Issues Found
- The DCsv3 size table listed `Standard_DC32s_v3` with 128 GiB EPC memory. Microsoft lists it with 192 GiB EPC memory. Updated the value and added the missing `Standard_DC24s_v3` and `Standard_DC48s_v3` entries.
- The VM deployment command used the Ubuntu Confidential VM image and `--security-type ConfidentialVM`, which applies to Azure Confidential VM SKUs rather than DCsv3 Intel SGX application-enclave VMs. Updated the example to use the supported Ubuntu 22.04 Gen2 image and Trusted Launch settings.
- The SGX repository setup used `apt-key`, which is deprecated and not the current Intel guidance for Ubuntu 22.04. Updated it to use `/etc/apt/keyrings` with `signed-by`.
- The Intel SGX SDK installer URL referenced an older binary that is no longer present in the `latest` download path. Updated it to the currently published Ubuntu 22.04 SDK installer.
- The C snippets used `uint8_t` without including `<stdint.h>`. Added the missing header, and added `<stddef.h>` to the enclave snippet for `size_t`.
- The Open Enclave section implied `sudo apt-get install open-enclave` works on the Ubuntu 22.04 VM used earlier. The packaged install documentation currently targets Ubuntu 20.04, so the section now calls out that Ubuntu 22.04 users should follow Open Enclave source build or release instructions.

## Review Notes
The post remains a high-level tutorial and does not include a complete build system, enclave signing configuration, or production-grade key management. Those omissions are acceptable for the scope, but a future revision could add a full reproducible sample project and note that real workloads must use remote attestation before releasing secrets to an enclave.
