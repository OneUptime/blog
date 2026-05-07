# Validation Summary: How to Configure Ansible AWX/Tower with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible AWX
- Red Hat Ansible Automation Platform Automation Controller
- Ansible SSH connection variables
- AWX REST API
- AWX inventory sources and dynamic inventory scripts
- AWX instance groups
- Kubernetes
- IPv6 networking

## Sources Consulted
- Ansible AWX repository README - https://github.com/ansible/awx
- AWX OpenAPI Schema documentation - https://docs.ansible.com/projects/awx/en/latest/open_api/
- AWX OpenAPI schema JSON - https://s3.amazonaws.com/awx-public-ci-files/awx/devel/schema.json
- AWX Credentials guide - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX Job Templates guide - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX Inventories guide - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- AWX Custom Inventory Scripts administration guide - https://docs.ansible.com/projects/awx/en/24.6.1/administration/custom_inventory_script.html
- AWX Inventory File Importing administration guide - https://docs.ansible.com/projects/awx/en/24.6.1/administration/scm-inv-source.html
- AWX Multi-Credential Assignment administration guide - https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html
- AWX Instance Groups guide - https://docs.ansible.com/projects/awx/en/24.6.1/userguide/instance_groups.html
- AWX Operator Extra Settings guide - https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/extra-settings.html
- Ansible SSH connection plugin documentation - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Kubernetes dual-stack networking documentation - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post described AWX as the upstream of “Ansible Automation Platform/Tower,” which is imprecise in current product terminology. It was corrected to describe AWX as an upstream project for Red Hat Ansible Automation Platform and to name Automation Controller as the current downstream component.
- The Step 1 explanation implied that a dual-stack Kubernetes cluster automatically gives AWX IPv6 reachability. Kubernetes documentation makes clear that dual-stack also depends on provider support, a compatible CNI, and egress routing, so the wording was corrected.
- The inventory and job-template examples used `ansible_ssh_extra_args` to force IPv6. Current Ansible SSH connection documentation distinguishes `ssh_extra_args` from `ssh_common_args`; the post was corrected to use `ansible_ssh_common_args` so the setting applies consistently to SSH CLI tools.
- The credential example hard-coded `credential_type: 1`, which is not a reliable API contract. It was corrected to look up the built-in Machine credential type through the AWX API before creating the credential.
- The credential example embedded raw private-key contents directly into a JSON string, which would break JSON because multiline key material needs escaping. It was corrected to build the payload with `jq` so the key is encoded safely.
- The Job Template example used a `credential` field during template creation. Current AWX documentation uses the job template credentials relationship for assignment, so the post was corrected to create the template first and then associate the credential through `/api/v2/job_templates/<id>/credentials/`.
- The AWX Operator example used `AWX_RUNNER_EXTRA_ARGS` as if it were a documented IPv6 configuration setting. The reviewed AWX Operator documentation does not document that as a supported IPv6 mechanism, so the section was corrected to use documented instance-group targeting guidance instead.
- The dynamic inventory section implied direct use of custom inventory scripts inside AWX. Current AWX administration docs state custom inventory scripts were discontinued and should be sourced from a project, so the post was corrected to register the script as a project-sourced inventory source.
- The connectivity-check example launched a job template with arbitrary `extra_vars` that would not by itself verify connectivity and may be ignored unless the template prompts for variables on launch. It was replaced with a documented ad hoc `ping` example that directly exercises controller-to-host connectivity.

## Review Notes
- The corrected API examples now assume `jq` is available locally so JSON payloads and returned object IDs can be handled safely.
- The examples also assume you already know or can provide valid AWX object IDs for your organization, project, and any instance group you intend to use.
- `ansible_ssh_common_args: "-6"` is most useful when hostnames resolve to both A and AAAA records; with a literal IPv6 `ansible_host`, it is optional.
- The verification example uses Ansible’s `ping` module, which validates Ansible connectivity and module execution rather than ICMP reachability.
