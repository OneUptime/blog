# Validation Summary: How to Use Ansible to Configure System DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux DNS resolver configuration
- `/etc/resolv.conf`
- systemd-resolved
- systemd-networkd
- NSS and `/etc/nsswitch.conf`
- cloud-init
- AWS VPC DNS / Route 53 Resolver
- Kubernetes DNS behavior

## Sources Consulted
- Ansible `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.copy` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.file` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- systemd `resolved.conf` manual: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- systemd `nss-resolve` manual: https://www.freedesktop.org/software/systemd/man/latest/nss-resolve.html
- systemd `nss-myhostname` manual: https://www.freedesktop.org/software/systemd/man/latest/nss-myhostname.html
- Linux `resolv.conf` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- cloud-init resolv.conf documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/resolv_conf.html
- AWS Amazon DNS documentation: https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The static `/etc/resolv.conf` playbook removed `/etc/resolv.conf` unconditionally because `when: ansible_facts['resolv_conf'] is defined or true` always evaluates to true. I changed it to stat the file and remove it only when it is actually a symlink.
- The static `/etc/resolv.conf` playbook used `chattr +i` as a command with `changed_when: true`, making it non-idempotent and awkward to rerun after the file became immutable. I changed the example to remove the immutable flag before updating and then set the immutable flag through the Ansible `attributes` parameter.
- The per-interface DNS example created `/etc/systemd/network/{{ interface }}.network.d/dns.conf`, which only works if an existing systemd-networkd unit has exactly that filename. I changed it to create a valid `.network` file with a `[Match]` section for the interface.
- The NSS example configured `hosts: files dns myhostname`, which bypasses the systemd-resolved NSS module. I changed it to include `resolve [!UNAVAIL=return]` before `dns` and added installation of `libnss-resolve` on Debian-family systems.

## Review Notes
- The YAML snippets parse successfully with PyYAML.
- Full `ansible-playbook --syntax-check` could not be run because Ansible is not installed in this environment.
- The per-interface systemd-networkd example assumes the host uses systemd-networkd for the target interfaces. Hosts managed by NetworkManager or netplan-generated units may need manager-specific configuration.
