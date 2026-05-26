# Validation Summary: How to Configure Molecule with Podman Driver

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible
- Molecule
- molecule-plugins Podman driver
- Podman
- containers.podman Ansible collection
- Linux cgroups and systemd in containers
- SELinux container labeling

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre ansible-native configuration documentation: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- molecule-plugins Podman driver source and bundled create playbook: https://github.com/ansible-community/molecule-plugins
- containers.podman.podman connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_connection.html
- containers.podman.podman_container module documentation: https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_container_module.html
- containers.podman.podman_login module documentation: https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_login_module.html
- containers.podman.podman_network module documentation: https://docs.ansible.com/ansible/latest/collections/containers/podman/podman_network_module.html
- Podman run manual, including systemd mode behavior: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman login manual: https://docs.podman.io/en/v3.4.4/markdown/podman-login.1.html
- Podman installation documentation: https://podman.io/docs/installation
- Red Hat RHEL container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/building_running_and_managing_containers/introduction-to-containers

## Issues Found
- The post said Podman is "rootless by default." Podman supports rootless operation when run by an unprivileged user, but rootful Podman is also valid. Changed the wording to "Rootless support."
- The post said Podman is pre-installed on Red Hat systems. Current Red Hat documentation presents Podman as part of supported container tools packages. Changed the wording to say it is available in RHEL repositories/container tools packages.
- The pip install example used an unquoted extras specifier. Updated it to `python3 -m pip install molecule "molecule-plugins[podman]"`, matching Molecule's current installation guidance and avoiding shell glob issues.
- The systemd cgroup v2 example used `environment`, but the Molecule Podman driver passes platform environment variables through `env`. Updated the key to `env`.
- Several systemd examples relied only on the command name. Added `systemd: true` where the examples are explicitly about running systemd, matching the Podman driver's supported platform option and Podman's documented systemd mode.
- The networking section implied a custom network must be created manually. The bundled Podman create playbook can create a named scenario network automatically. Updated the wording to reserve manual creation for custom lifecycle playbooks.
- The rootless SELinux comment described `label=disable` as rootless-specific. Updated it to describe the actual behavior: disabling SELinux label separation when labels cause mount issues.
- The "Using Podman Pods" section did not configure a Podman pod; it only published ports. Renamed and rewrote the short section text to describe port publishing accurately.
- The custom connection troubleshooting guidance used the short `podman` connection name and implied it was required for all Podman-driver use. Updated it to the fully qualified `containers.podman.podman` connection plugin and scoped the advice to custom inventory or default/delegated driver usage.

## Review Notes
The post uses Molecule's pre ansible-native driver style. Current Molecule documentation increasingly emphasizes ansible-native scenarios with standard Ansible inventory and playbooks, but the Podman driver and its bundled lifecycle playbooks remain documented and usable through molecule-plugins.
