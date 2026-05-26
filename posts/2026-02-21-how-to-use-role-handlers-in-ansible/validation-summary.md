# Validation Summary: How to Use Role Handlers in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- Ansible handlers
- Ansible `notify` and `listen`
- Ansible `meta: flush_handlers`
- Ansible `block` and `rescue`
- Ansible service management modules

## Sources Consulted
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible role documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible block and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Local syntax check with `ansible-core` 2.17.14 for a handler using `block` and `rescue`

## Issues Found
- The introduction said handlers run at most once per play and implied role handlers are role-scoped. Ansible handlers are in a play-level handler namespace, and a handler can run again after `meta: flush_handlers` or a later handler execution point. Updated the wording to describe handler execution points and play-level scope.
- The deduplication and closing summary repeated the "once at the end of the play" wording. Updated those sections to say handlers run once per handler execution point.
- The cross-role handler section did not mention handler name conflicts or the runtime behavior of handlers from dynamically included roles. Added the documented `role_name : handler_name` form and the `include_role` availability caveat.
- The conditional handler example used two different handler names, so notifying only `Restart Nginx` would not trigger the sysvinit fallback. Updated the example to use a shared `listen` topic.
- The failure handling section said `block` and `rescue` within handlers require Ansible 2.14+. That version note applies to meta tasks as handlers, not basic block/rescue usage. Removed the incorrect version-specific claim.

## Review Notes
The examples are syntactically valid YAML and use current fully qualified Ansible module names. The service examples assume the relevant services and packages exist on the target systems.
