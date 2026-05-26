# Validation Summary: How to Configure ansible.cfg for Your Project

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible.cfg configuration
- Ansible inventory
- Ansible fact caching
- Ansible callback plugins
- SSH connection settings
- Privilege escalation with become

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- ansible.builtin.default callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- community.general.yaml callback removal notice: https://docs.ansible.com/projects/ansible/13/collections/community/general/yaml_callback.html
- ansible.builtin.ssh connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- ansible-config CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-config.html

## Issues Found
- The post recommended `stdout_callback = yaml`. The `community.general.yaml` callback has been removed and is superseded by `callback_result_format = yaml` on the default callback in ansible-core 2.13 and newer. Updated the configuration and explanation to use `stdout_callback = default` with `callback_result_format = yaml`.
- The post used `callback_whitelist`, which is legacy terminology. Current Ansible documentation uses `callbacks_enabled`. Updated the example and section heading.
- The fact gathering comment and explanation implied that `gathering = smart` gathers a subset of facts and only re-gathers when cache expires. Current documentation says `smart` uses the cache plugin and avoids contacting the same host again during the same run when facts are available. Updated the comment and explanation.
- The SSH transfer comment said SCP is more reliable than SFTP. Current SSH connection documentation says SFTP is the most reliable method and `smart` tries SFTP first, then SCP, then piped transfer. Updated the comment.
- The environment variable explanation said every ansible.cfg setting has a corresponding variable and implied a direct section-based naming convention. Current documentation lists exact environment variables per setting, and names are not always direct section conversions. Updated the explanation to tell readers to check `ansible-config list` or the configuration reference.
- The inventory directory wording said Ansible reads all files in a directory. Current behavior depends on inventory parsing and ignore rules. Updated the wording to say Ansible combines the inventory sources it can parse.

## Review Notes
The post is technically relevant and the corrected examples align with current Ansible documentation. Ansible was not installed in the local environment, so validation was performed against official documentation rather than local CLI output.
