# Validation Summary: How to Create Projects in AWX

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX projects
- AWX REST API
- Ansible awx.awx collection
- Git and Subversion SCM project sources
- Remote archive and manual AWX projects
- Ansible Galaxy roles and collections requirements

## Sources Consulted
- AWX User Guide, Projects: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/projects.html
- AWX API Reference: https://docs.ansible.com/projects/awx/en/24.6.1/rest_api/
- awx.awx.project module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/project_module.html
- awx.awx.project_update module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/project_update_module.html
- Ansible Galaxy collection install command documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The manual project example used `scm_type: ""`. Current `awx.awx.project` documentation lists `manual` as the valid manual SCM type choice, so the example was changed to `scm_type: manual`.
- The Git project section said Git is the default source control type. The official documentation lists Git as a supported SCM type but does not document it as the default, so the wording was changed to say Git is the most widely used source control type.
- The repository structure section said AWX will automatically install roles and collections from requirements files during project sync. Official AWX documentation scopes this behavior to SCM projects and notes that role and collection downloads are controlled by job settings, so the sentence was updated with that caveat.

## Review Notes
The remaining API fields, module parameters, project update endpoint, `awx.awx.project_update` usage, and `ansible-galaxy collection install awx.awx` command match the official documentation reviewed. The `awx.awx` collection documentation notes that the collection will be removed from the bundled Ansible package in Ansible 14, but it remains installable manually with `ansible-galaxy collection install awx.awx`.
