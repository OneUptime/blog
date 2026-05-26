# Validation Summary: How to Use AWX Custom Credential Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX custom credential types
- AWX REST API
- Ansible playbooks
- Ansible environment variable lookups
- AWX credential injection with environment variables, extra variables, and generated files

## Sources Consulted
- AWX community documentation: Custom Credential Types - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credential_types.html
- AWX community documentation: Credentials - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX community documentation: Secret handling and connection security - https://docs.ansible.com/projects/awx/en/24.6.1/administration/secret_handling.html
- Ansible documentation: Logging Ansible output - https://docs.ansible.com/ansible/latest/reference_appendices/logging.html

## Issues Found
- The post claimed credentials are never exposed in job logs and that secret fields are masked in logs. AWX documentation states secret fields are encrypted and not exposed through the API, but recommends using `no_log` on tasks that might print secret values. Updated the security wording accordingly.
- The file injector example used `tower.filename.kubeconfig_content` without defining a named file template. Current AWX documentation uses `awx.filename`, with suffixes matching named `template.<name>` entries. Updated the example to use `template.kubeconfig` and `awx.filename.kubeconfig`.
- The extra variables database example used `database_user` and `database_password` in the playbook without injecting them. Added those variables to the injector snippet so the example is internally consistent.
- The injection flow diagram ended with "Mask Secrets in Output", which overstated AWX behavior. Changed it to "Store Job Output".
- The input validation example implied a port range check and used `format: "text"`, which is not the documented AWX custom credential format validation. Replaced it with the documented `ssh_private_key` format example and kept the `choices` example.

## Review Notes
- The REST API examples use placeholder AWX URLs and IDs, which is appropriate for a tutorial. Users still need a valid token, organization ID, credential type ID, credential ID, and job template ID in a real AWX instance.
- AWX allows multiple cloud credentials on a job template, but each cloud credential must be a different credential type. The post's "different types" wording is consistent with that constraint.
