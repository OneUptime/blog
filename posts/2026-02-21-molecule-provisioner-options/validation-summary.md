# Validation Summary: How to Configure Molecule Provisioner Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible Molecule
- Ansible provisioner configuration
- Ansible configuration settings
- Ansible inventory variables
- ansible-lint
- community.docker connection plugin

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule command usage documentation: https://docs.ansible.com/projects/molecule/usage/
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/

## Issues Found
- The post said `config_options` could override any ansible.cfg setting and used the `privilege_escalation` section there. Molecule blocks some config options, including `privilege_escalation`; the examples and explanation were updated to say "most" settings and to avoid that section.
- The complete example also configured privilege escalation under `config_options`. It was moved to inventory variables using `ansible_become` and `ansible_become_method`, which Ansible accepts as host or group variables.
- The Docker connection example used `ansible_connection: docker`. Current community.docker documentation says to use the fully qualified `community.docker.docker` connection plugin, so the example and surrounding explanation were updated.
- The linting section configured ansible-lint through `provisioner.lint`. Current Molecule versions do not configure ansible-lint through the provisioner, so the section was changed to show a `.ansible-lint` configuration and a direct `ansible-lint` command.
- The custom modules example used `config_options.defaults.library`, `module_utils`, and `filter_plugins`. Molecule disallows at least `library` and `filter_plugins` in `config_options`; the example was changed to the supported Ansible environment variables.

## Review Notes
The post uses the pre ansible-native Molecule configuration style. Current Molecule documentation notes that ansible-native configuration moves several settings, including `ansible_args`, `config_options`, `env`, and `playbooks`, under the root `ansible` section. The post is still useful as a pre ansible-native guide, but future updates could add version context.
