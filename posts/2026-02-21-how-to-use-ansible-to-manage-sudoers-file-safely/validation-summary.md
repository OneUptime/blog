# Validation Summary: How to Use Ansible to Manage sudoers File Safely

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Linux sudoers
- visudo
- YAML
- Jinja2 templates
- cron

## Sources Consulted
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Sudo visudo manual: https://www.sudo.ws/docs/man/visudo.man/
- Local sudoers(5) and visudo(8) manual pages available in the review environment

## Issues Found
- The examples used `visudo -cf %s`. This is valid syntax checking, but the official Ansible copy example uses `visudo -csf %s`, adding strict sudoers checks. Updated the Ansible validation examples and summary text to use `-csf`.
- The sudoers.d section said a bad drop-in does not corrupt the main sudoers config. That is true for file contents, but sudo still parses included drop-ins and can fail on a bad included file. Clarified that drop-ins do not overwrite the main file and still require validation.
- The post did not mention that validating an individual sudoers include file is not the same as checking the complete sudoers policy. Added a note to run `visudo -c` against the complete policy when drop-ins depend on aliases or defaults from other files.
- The multi-team example used complex Jinja in `copy.content`. Ansible's official copy module documentation recommends using the template module for advanced formatting or variable content. Updated the example to use `ansible.builtin.template` with a separate Jinja2 template snippet.
- The emergency recovery example only restored `/etc/sudoers`, which would not recover from a bad `/etc/sudoers.d` drop-in even though the validation command checks the whole policy. Updated the script and tasks to back up and restore `/etc/sudoers.d` as well.

## Review Notes
- Several sudoers command examples use shell-style wildcards in command arguments. This is syntactically valid sudoers syntax, but sudoers documentation warns that command-argument wildcards should be used carefully because they can match broader argument strings than expected.
- Absolute command paths such as `/bin/systemctl` and `/usr/sbin/ss` vary by distribution. The examples are plausible on common Linux systems, but production sudoers rules should use the target host's actual command paths.
