# Validation Summary: How to Use Ansible to Enforce File System Permissions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux file permissions and mode bits
- GNU find command
- SSH, SSL/TLS, cron, SUID/SGID, and home directory permission hardening

## Sources Consulted
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.fileglob` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html

## Issues Found
- The SSH host key tasks used `with_fileglob` with `/etc/ssh/ssh_host_*` paths. Ansible's `fileglob` lookup matches files on the controller, not on managed hosts, so this would not reliably enforce permissions on remote SSH host keys. Replaced those tasks with `ansible.builtin.find` on `/etc/ssh` followed by `ansible.builtin.file` loops over the returned remote paths.
- The SSL private key search matched all `*.pem` files, which would include public certificate files such as Let's Encrypt `cert.pem`, `chain.pem`, and `fullchain.pem`. Narrowed the private-key patterns to `*.key`, `privkey*.pem`, and `*-key.pem`, and added `follow: true` and `file_type: file` for remote symlinked certificate layouts.
- The SUID/SGID audit found SGID binaries but did not evaluate or report them. Added `expected_sgid_binaries`, SGID difference calculation, reporting, and optional SGID removal guarded by `remove_unauthorized_sgid`.
- The compliance report built `compliance_results` using a Jinja list mutation inside a folded scalar. That pattern renders text rather than producing a clean list for looping. Replaced it with an initialized list and a looped `set_fact` append pattern, including a `missing` fallback for absent files.

## Review Notes
- YAML syntax for all Ansible code blocks was parsed successfully after the fixes.
- Several example permissions are distro-policy dependent, especially groups such as `shadow` and `syslog`, and the expected SUID/SGID baseline. The examples are technically valid Ansible, but production roles should tune these values per OS family and distribution baseline.
