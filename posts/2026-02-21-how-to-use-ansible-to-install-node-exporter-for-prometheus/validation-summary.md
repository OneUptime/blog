# Validation Summary: How to Use Ansible to Install Node Exporter for Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus Node Exporter
- Prometheus metrics and textfile collector
- systemd services
- UFW
- firewalld

## Sources Consulted
- Prometheus Node Exporter README and collector documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter v1.11.1 release: https://github.com/prometheus/node_exporter/releases/tag/v1.11.1
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- systemd service and execution environment documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html and https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html

## Issues Found
- The default Node Exporter version was pinned to `1.7.0`, which is outdated for this 2026 post. Updated it to `1.11.1`, the current upstream release available during validation, and verified the Linux amd64 tarball and checksum file exist.
- The post listed NTP as a normal optional collector. Current Node Exporter documentation marks the `ntp` collector as deprecated, so the wording was changed to mention supported optional collectors instead.
- The textfile collector cron example wrote directly to the final `.prom` file. Updated it to write to a temporary file and rename it into place, matching the Node Exporter documentation's atomic write pattern and avoiding partially read metric files.
- The enabled collectors comment described all listed collectors as being "on top of defaults"; current Node Exporter documentation lists `textfile` as enabled by default when configured with a directory. Adjusted the comment without changing the role behavior.

## Review Notes
Ansible was not installed in the local environment, so module behavior was checked against official Ansible documentation rather than local `ansible-doc` output. The role uses `community.general.ufw` and `ansible.posix.firewalld`, which require those collections and the corresponding firewall packages on managed hosts.
