# Validation Summary: How to Use the Ansible unarchive Module to Extract Archives

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.unarchive
- ansible.builtin.file
- ansible.builtin.user
- ansible.builtin.template
- ansible.builtin.systemd
- GNU tar
- unzip/zipinfo
- Linux file permissions
- systemd

## Sources Consulted
- Ansible `ansible.builtin.unarchive` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/systemd_service_module.html
- GNU tar local help output (`tar --help`) for `--strip-components`, `--absolute-names`, and wildcard behavior.
- unzip local help output (`unzip -hh`) for include/exclude and destination argument behavior.

## Issues Found
- The post described support for "gz archives" and implied `.gz` files were supported. Ansible documentation states that `unarchive` handles `.tar.gz` archives but does not handle plain `.gz`, `.bz2`, `.xz`, or `.zst` files that do not contain a tar archive. Updated the description and introduction.
- The tar `include` example used a wildcard path without enabling tar wildcard matching. GNU tar does not treat member-name arguments with wildcards as patterns unless wildcard options are supplied. Changed the example to include the exact `myapp-2.5.0/conf/` archive directory.
- The idempotency section said `unarchive` re-extracts on every run by default. The module can compare archive contents with the destination and skip extraction when they already match. Reworded the section to present `creates` as an explicit guard and noted that the path must be absolute and under `dest`.
- The troubleshooting section listed generic compression tools but omitted the documented `zipinfo` requirement and GNU tar requirement. Updated the wording to match Ansible's documented requirements.
- The absolute-path troubleshooting example used `--absolute-names` while describing safe extraction under `dest`. `--absolute-names` can restore archive members to their original absolute paths instead of keeping extraction rooted under the destination. Removed that option and clarified when it should be avoided.

## Review Notes
The examples use the `ansible.builtin.systemd` alias, which remains supported as a backward-compatible alias for `ansible.builtin.systemd_service`. A future refresh could switch examples to `ansible.builtin.systemd_service` for current naming, but the existing examples are still technically valid.
