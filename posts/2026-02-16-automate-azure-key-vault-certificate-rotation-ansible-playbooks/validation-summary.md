# Validation Summary: How to Automate Azure Key Vault Certificate Rotation with Ansible Playbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault certificates
- Ansible and azure.azcollection
- Azure App Service TLS/SSL bindings
- Azure CLI
- Slack webhook notifications
- Cron, Ansible Automation Platform automation controller, and AWX scheduling

## Sources Consulted
- Ansible Community Documentation: azure.azcollection collection index - https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/index.html
- Ansible Community Documentation: azure.azcollection.azure_rm_keyvaultcertificate module - https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_keyvaultcertificate_module.html
- Ansible Community Documentation: azure.azcollection.azure_rm_keyvaultcertificate_info module - https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_keyvaultcertificate_info_module.html
- Ansible Community Documentation: azure.azcollection.azure_rm_webapp module - https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_webapp_module.html
- Microsoft Learn: az webapp config ssl - https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Microsoft Learn: About Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates
- Microsoft Learn: AppServiceCertificate class - https://learn.microsoft.com/en-us/python/api/azure-mgmt-web/azure.mgmt.web.models.appservicecertificate
- Red Hat Customer Portal: What's New in Ansible Automation Controller 4.0 - https://access.redhat.com/articles/6184841

## Issues Found
- The Key Vault certificate generation examples used non-current Ansible module parameters: `certificate_name`, `certificate_policy`, nested policy objects, and `state: present`. Updated them to the documented `name`, flat `policy` fields, `enabled: true`, and `state: generate`.
- The certificate secret content type used `application/x-pem-certificate`, which is not the content type shown by the Ansible module for PEM certificate imports/generation. Updated it to `application/x-pem-file`.
- The App Service deployment example used `azure_rm_appservicecertificate`, which is not listed in the current `azure.azcollection` index, and `azure_rm_webapp` did not actually create a hostname SSL binding. Replaced the sample with documented `az webapp config ssl import` and `az webapp config ssl bind` commands executed through `ansible.builtin.command`.
- The notification playbook referenced `certificates | length` even though the standalone snippet did not define `certificates`. Updated it to use `certificates | default([]) | length`.
- The notification playbook used `ansible_date_time` while `gather_facts: false` was set. Replaced those references with Ansible's `now(utc=true)` calls.
- The article said the examples cleaned up old certificate versions, but the provided playbooks did not do that. Adjusted the claim to describe notification instead.
- The CA-issued certificate example used the same incorrect Key Vault certificate module parameter structure as the self-signed example. Updated it to the documented `policy` format and `state: generate`.
- The CA issuer explanation implied every configured CA issuer supports end-to-end automation. Updated it to say supported CA issuers can automate that flow, matching Azure Key Vault documentation around supported issuer providers.
- The scheduling section referred to Ansible Tower. Updated it to Ansible Automation Platform automation controller, the current name for the product successor, while keeping AWX.

## Review Notes
The post is now technically valid as a tutorial-style starting point. Production use would still need environment-specific handling for App Service custom domain setup, Key Vault access policies or RBAC permissions, issuer account configuration, and idempotency around CLI-based SSL imports and bindings.
