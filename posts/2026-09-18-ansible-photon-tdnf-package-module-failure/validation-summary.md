# Validation Summary: Manage Photon OS Packages with Ansible When the Generic package Module Fails

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and an Ansible playbook.

## Technologies Covered
- Photon OS and tdnf package management
- Ansible package, dnf, raw, command, and debug modules
- RPM installed-package queries
- Python bootstrap and interpreter compatibility
- YAML, shell commands, repository configuration, TLS, and package signatures

## Sources Consulted
- Ansible package module documentation and official source: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html and https://raw.githubusercontent.com/ansible/ansible/stable-2.19/lib/ansible/modules/package.py (source used when the documentation endpoint returned HTTP 429).
- Ansible dnf requirements: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html and the originally linked https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible raw module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible loop registration documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible release and Python support policy: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Photon repository configuration: https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/
- Photon tdnf commands: https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/
- Photon tdnf options: https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/options-for-commands/
- RPM command reference: https://rpm.org/docs/4.20.x/man/rpm.8
- RPM query implementation: https://github.com/rpm-software-management/rpm/blob/rpm-4.18.0-release/lib/query.c
- RPM diagnostic stream implementation: https://github.com/rpm-software-management/rpm/blob/rpm-4.18.0-release/rpmio/rpmlog.c

## Issues Found
- The RPM query accepted every exit code 1 as ordinary package absence. RPM can also return 1 after a query/database failure, so the subsequent task could attempt installation despite a failed state query. Updated `failed_when` to reject nonempty stderr as well as unexpected exit codes. RPM sends ordinary missing-package notices to stdout and error diagnostics to stderr. Added a short explanation that this deliberately also stops on warnings, without parsing English messages.
- The DNF reference was pinned to Ansible 13 documentation, which the official release table marks as end of life in June 2026. Replaced it with the current documentation URL; the Python binding requirement remains applicable.

## Review Notes
- Confirmed generic package-module delegation and the separate `python3-dnf` requirement. Merely choosing a package-manager fact does not install a backend or its dependencies.
- Confirmed raw execution does not require target Python, the bootstrap command is a real installation, and Python compatibility depends on the controller's ansible-core version. Administrative access and working privilege escalation remain prerequisites as stated.
- Confirmed tdnf install/update commands, the `-y` option, multi-package installation, and the repository/signature configuration guidance against Photon documentation.
- Reviewed loop registration, per-item return-code conditions, argv lists, and change reporting. The RPM query runs during check mode; installation is excluded. Debug output describes intended work but does not predict dependency resolution or contribute a changed count.
- The presence example is scoped to controlled plain package names such as curl and tcpdump. RPM also accepts package labels; the example should not be generalized to arbitrary version-qualified input or virtual provides.
- Parsed the YAML example with PyYAML and checked both shell examples with `bash -n`. Ansible was not installed locally, and no disposable Photon VM was available; no Ansible syntax-check or actual package transaction was run. The two-run idempotence, check-mode, missing-package, and repository-failure exercises remain deployment verification steps.
- An unavailable repository may be skipped when configured with `skip_if_unavailable`, or cached metadata may avoid a network request. Failure testing should force a transaction that actually needs the unavailable source.
- External technical references resolved to the intended resources except for temporary fetch restrictions noted above. No deprecated APIs were identified in the examples.
