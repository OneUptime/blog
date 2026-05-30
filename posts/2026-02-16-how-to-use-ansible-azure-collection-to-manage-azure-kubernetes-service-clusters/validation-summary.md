# Validation Summary: How to Use Ansible Azure Collection to Manage Azure Kubernetes Service Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Azure AzCollection
- Azure Kubernetes Service
- Kubernetes
- Azure service principal authentication
- Azure managed identities

## Sources Consulted
- Ansible azure.azcollection collection index: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/index.html
- Ansible azure_rm_aks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_aks_module.html
- Ansible azure_rm_aksagentpool module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_aksagentpool_module.html
- Ansible azure_rm_akscredentials_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_akscredentials_info_module.html
- Ansible azure_rm_aksupgrade_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_aksupgrade_info_module.html
- Ansible azure_rm_aksversion_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_aksversion_info_module.html
- Ansible azure_rm_resourcegroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_resourcegroup_module.html
- Microsoft Learn AKS supported Kubernetes versions: https://learn.microsoft.com/azure/aks/supported-kubernetes-versions

## Issues Found
- The Azure credential file was labeled as YAML even though `~/.azure/credentials` is an INI-style file. Changed the code fence language to `ini`.
- The static Kubernetes versions in the examples included AKS versions that are no longer in regular support. Updated the examples to currently supported AKS minor versions.
- The node pool examples used the non-existent `azure_rm_aks_agentpool` module name. Updated them to `azure_rm_aksagentpool`.
- The Spot node pool example used incorrect parameter names, `priority` and `eviction_policy`. Updated them to `scale_set_priority` and `scale_set_eviction_policy`.
- The kubeconfig retrieval example used `azure_rm_aks_info` with the wrong registered return path. Updated it to use `azure_rm_akscredentials_info` and write `cluster_credentials[0].value`.
- The upgrade example checked all regional versions instead of upgrade versions for the specific cluster. Updated it to use `azure_rm_aksupgrade_info`.
- The upgrade task omitted parameters required by the `azure_rm_aks` module when `state=present`. Added `dns_prefix` and a matching `agent_pool_profiles` entry.
- The cluster debug output assumed one return shape. Updated it to work with the documented `state` wrapper and the module's current top-level return fields.
- The state management explanation said Ansible cannot track resources it did not create. Reworded it to say Ansible only manages resources described in playbooks.

## Review Notes
AKS Kubernetes version availability varies by region and over time. For production playbooks, prefer querying available versions and upgrades before pinning a target version.
