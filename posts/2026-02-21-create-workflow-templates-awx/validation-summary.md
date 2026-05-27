# Validation Summary: How to Create Workflow Templates in AWX

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX workflow job templates
- AWX workflow nodes and approvals
- AWX API v2
- Ansible `awx.awx` collection
- iCalendar recurrence rules for AWX schedules
- Mermaid workflow diagrams

## Sources Consulted
- AWX Workflows user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflows.html
- AWX Workflow Job Templates user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflow_templates.html
- `awx.awx.workflow_job_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_module.html
- `awx.awx.workflow_job_template_node` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_node_module.html
- `awx.awx.workflow_launch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_launch_module.html
- `awx.awx.schedule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/schedule_module.html
- AWX source code for workflow node relation and convergence behavior: https://github.com/ansible/awx

## Issues Found
- The initial workflow diagram used `Approved` as an edge label from an approval node, but AWX workflow edge types are success, failure, and always. Changed the edge label to `Success` so it matches AWX terminology; approval maps to the success path, while denial or timeout maps to failure.
- The parallel execution and convergence text implied that AWX always waits for every parent to meet its condition before a convergent node runs. AWX defaults convergent nodes to "Any"; "All" behavior requires `all_parents_must_converge`. Added `all_parents_must_converge: true` to the approval node example and revised the convergence explanation.
- Clarified that parallel links should reference existing child nodes. The `workflow_job_template_node` module documents `success_nodes`, `failure_nodes`, and `always_nodes` as lists of node identifiers.

## Review Notes
- The Ansible module examples use current `awx.awx` module names and parameters for collection version 24.6.1.
- The Ansible documentation notes that `awx.awx` will be removed from the bundled Ansible package in Ansible 14, but it remains installable as a standalone collection with `ansible-galaxy collection install awx.awx`.
