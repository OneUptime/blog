# Validation Summary: How to Use the symmetric_difference Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible set operation filters
- Ansible playbooks, facts, task variables, and conditionals
- Ansible modules: `ansible.builtin.debug`, `ansible.builtin.shell`, `ansible.builtin.find`, `ansible.builtin.set_fact`, `ansible.builtin.apt`, and `amazon.aws.ec2_instance_info`
- Jinja templating in Ansible
- Linux command-line tools: `apache2ctl`/`apachectl`, `ss`, `awk`, `grep`, `sort`, and `uniq`

## Sources Consulted
- Ansible documentation: `ansible.builtin.symmetric_difference` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/symmetric_difference_filter.html
- Ansible documentation: union, intersection, and difference list behavior - https://docs.ansible.com/projects/ansible/latest/collections/community/general/docsite/filter_guide_abstract_informations_lists_helper.html
- Ansible documentation: `ansible.builtin.sort` filter - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/sort_filter.html
- Ansible documentation: `ansible.builtin.find` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: `amazon.aws.ec2_instance_info` module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Ansible documentation: conditionals - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_conditionals.html
- Apache HTTP Server documentation: `apachectl` - https://httpd.apache.org/docs/current/en/programs/apachectl.html
- GNU Grep manual - https://www.gnu.org/software/grep/manual/grep.html
- iproute2 `ss(8)` manual page - https://manpages.debian.org/testing/iproute2/ss.8.en.html

## Issues Found
- The post showed exact output ordering for `symmetric_difference` without noting that Ansible's built-in set filters return results in arbitrary order. I added a note about arbitrary ordering and applied `sort` to the basic examples that show deterministic output.
- The Apache module collection command used `awk '{print $1}'`, which can include the `Loaded Modules:` header line as `Loaded`. I changed it to `awk '/_module/ {print $1}'` so only module rows are captured.

## Review Notes
The remaining Ansible examples use valid modules and filter syntax according to current documentation. The `amazon.aws.ec2_instance_info` example depends on the external `amazon.aws` collection and AWS SDK credentials/configuration being available, which is expected for that module. The `grep -P` usage is valid for GNU grep but may not be portable to non-GNU grep implementations.
