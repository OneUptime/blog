# Validation Summary: How to Configure RBAC and Organizations in Ansible Automation Controller on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ansible Automation Platform
- Ansible Automation Controller
- AWX / Automation Controller CLI
- Role-based access control
- Organizations and teams

## Sources Consulted
- Red Hat Ansible Automation Platform Automation Controller CLI basic usage: https://docs.ansible.com/automation-controller/latest/html/controllercli/usage.html
- Red Hat Ansible Automation Platform Automation Controller CLI reference: https://docs.ansible.com/automation-controller/4.7/html/controllercli/reference.html
- Automation Controller User Guide, Teams: https://docs.ansible.com/automation-controller/4.3/html/userguide/teams.html
- Automation Controller User Guide, Role-Based Access Controls: https://docs.ansible.com/automation-controller/4.3/html/userguide/security.html#role-based-access-controls

## Issues Found
- The CLI installation command used `pip install awxkit` for a RHEL Automation Controller article. Official Automation Controller CLI documentation installs `automation-controller-cli` from the Ansible Automation Platform RPM repository on RHEL. Updated the command to use `dnf` for RHEL 9.
- The team membership example used `awx teams associate --name ... --user ...`, which is not the documented CLI form for assigning a user to a team. Updated it to grant the user the `member` role on the team with `awx users grant`.
- The role grant examples used `awx roles grant` with `--type`, `--resource-type`, and `--resource-name`. Current CLI documentation exposes grants through `awx teams grant` and `awx users grant`, while `awx roles` is a deprecated/list-oriented resource in newer CLI documentation. Updated the examples to the documented grant syntax.
- The example for listing team roles used `awx roles list --team`, but `awx roles list` does not support filtering role assignments by team in the documented CLI. Updated it to resolve the team ID and use `awx role_team_assignments list --team`.
- The organization-level auditor assignment used the same invalid `awx roles grant` pattern. Updated it to `awx users grant` with `--organization` and `--role auditor`.

## Review Notes
The RBAC descriptions, organization/team concepts, and built-in role explanations are consistent with Automation Controller documentation. The corrected CLI examples still assume the named projects, inventories, job templates, organizations, teams, and users already exist where referenced.
