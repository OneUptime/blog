# Validation Summary: How to Use Ansible to Set Up a Vault Server (HashiCorp)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- HashiCorp Vault
- Vault HCL server configuration
- systemd
- Linux capabilities
- TLS

## Sources Consulted
- HashiCorp Vault TCP listener configuration: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault configuration parameters: https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault `/sys/health` API: https://developer.hashicorp.com/vault/api-docs/system/health
- HashiCorp Vault `/sys/init` API: https://developer.hashicorp.com/vault/api-docs/system/init
- HashiCorp Vault `operator init` command: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault server command: https://developer.hashicorp.com/vault/docs/commands/server
- HashiCorp Vault production hardening guidance: https://developer.hashicorp.com/vault/docs/concepts/production-hardening
- Ansible `community.general.capabilities` module: https://docs.ansible.com/ansible/latest/collections/community/general/capabilities_module.html
- Ansible `ansible.builtin.apt` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.systemd_service` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The post description claimed the role deployed auto-unseal, secret engines, authentication backends, and policies, but the provided tasks only install and configure the Vault server and show manual initialization/unseal steps. Updated the description and introductory wording to match the actual implementation.
- The defaults described secret engines and auth methods as items to enable, but no tasks in the post enable them. Updated those comments to identify them as optional follow-up configuration values.
- The capabilities task used the short `capabilities` module name. Current Ansible documentation places this module in the `community.general` collection, so the task now uses `community.general.capabilities`.
- The capabilities task used `cap_ipc_lock=+ep`; Ansible's `community.general.capabilities` documentation recommends matching the effective capability form because Linux may normalize operators and flags. Updated it to `cap_ipc_lock+ep`.
- The role installed `unzip` but did not install `libcap2-bin`, which provides the Linux `setcap` tooling commonly required for file capabilities on Debian/Ubuntu systems. Updated the package task to install both packages.

## Review Notes
- The Vault configuration, health check status codes, `/sys/init` request body, `vault operator init`, and `vault operator unseal` commands are consistent with official Vault documentation.
- `vault_version` is pinned to 1.15.4, while current Vault documentation lists newer supported release lines. This is not technically incorrect for a pinned example, but production users should track current Vault security releases.
- The example disables TLS certificate validation for local API calls. That can be practical for bootstrap flows with internal certificates, but a production role should prefer a trusted CA bundle instead of `validate_certs: no`.
- The download task does not verify a checksum. A production-ready role should validate the downloaded Vault archive before installation.
