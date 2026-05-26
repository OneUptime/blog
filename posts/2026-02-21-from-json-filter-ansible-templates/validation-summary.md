# Validation Summary: How to Use the from_json Filter in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2 templates and filters
- JSON parsing
- Docker CLI
- Ansible uri, shell, set_fact, template, debug, and slurp modules
- AWS CLI
- kubectl
- Consul HTTP API
- Terraform CLI

## Sources Consulted
- Ansible filter documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Docker inspect CLI documentation: https://docs.docker.com/reference/cli/docker/inspect/
- AWS CLI describe-instances documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Kubernetes kubectl get documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Consul catalog services CLI documentation: https://developer.hashicorp.com/consul/commands/catalog/services
- Consul Catalog HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/catalog
- Terraform output command documentation: https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found
- The `uri` module note incorrectly implied that `return_content: true` makes `from_json` necessary. Ansible documents that JSON is loaded into the registered result's `json` key whenever the response reports `Content-Type: application/json`, independently of `return_content`. Updated the note to clarify when `from_json` is actually needed.
- The Consul chaining example used `consul catalog services -format json`, but current Consul `catalog services` documentation does not list a `-format` option and the documented CLI output is plain service names, not JSON objects with `ServiceName` and `ServiceAddress` fields. Replaced the command with the documented Consul Catalog HTTP API endpoint for service nodes, which returns JSON containing service/node fields suitable for `from_json` processing.

## Review Notes
The remaining examples are technically sound as illustrative playbook snippets. The Docker, AWS CLI, kubectl, Terraform, and Ansible module usages match current official documentation. The AWS, Kubernetes, Docker, Terraform, and Consul examples assume those CLIs/services are installed and configured in the target execution environment.
