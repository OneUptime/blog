# Validation Summary: How to Use Ansible to Configure NixOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- NixOS declarative system configuration
- Nix configuration modules
- OpenSSH, nginx, firewall, chrony, garbage collection, and automatic upgrades on NixOS
- systemd services and timers on NixOS

## Sources Consulted
- NixOS Manual, Configuration and module imports: https://nixos.org/manual/nixos/stable/
- NixOS Manual, Firewall configuration: https://nixos.org/manual/nixos/stable/
- NixOS options reference: https://search.nixos.org/options
- Nixpkgs OpenSSH module source: https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/modules/services/networking/ssh/sshd.nix
- Nixpkgs chrony module source: https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/modules/services/networking/ntp/chrony.nix
- Nixpkgs automatic upgrade module source: https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/modules/tasks/auto-upgrade.nix
- Ansible package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html

## Issues Found
- The post described the entire system as being defined only in `/etc/nixos/configuration.nix`. Updated this to clarify that `configuration.nix` is the entry point and may import other modules, matching NixOS module behavior.
- The main NixOS template overwrote `/etc/nixos/configuration.nix` without importing `hardware-configuration.nix`, which would commonly drop required filesystem and hardware settings. Added `imports = [ ./hardware-configuration.nix ];`.
- The custom module example assigned `services.myapp`, an undeclared NixOS option that would fail evaluation. Replaced it with a valid `systemd.services.myapp` example.
- The module import example inserted `imports` after the module argument line, which would produce invalid Nix syntax. Changed it to update the existing `imports` attribute and rebuild when the module or import line changes.
- The infrastructure provisioning example used imperative package, timezone, hostname, SSH file, service, and UFW tasks that contradict the NixOS declarative model described in the article. Replaced the example with a NixOS configuration deployment and rebuild workflow.
- The monitoring example templated into `/etc/monitoring/config.yml` without ensuring the directory existed. Added a directory creation task.
- The scheduling example used `ansible.builtin.cron`, which is not the preferred declarative NixOS approach and may not be available unless cron is configured. Replaced it with a NixOS module defining an `/etc` script plus a systemd service and timer.
- Updated stale wording that referred to "this module" even though the post is about an Ansible-driven approach rather than a specific module.

## Review Notes
- The examples are still illustrative and assume a conventional non-flake `/etc/nixos/configuration.nix` workflow. Flake-based NixOS deployments would typically rebuild with `nixos-rebuild switch --flake`.
- `system.stateVersion = "24.05"` is valid as an example, but real systems should keep this value aligned with the release used when the system was first installed rather than bumping it during normal upgrades.
