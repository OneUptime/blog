# Validation Summary: How to Use the Ansible get_url Module with Checksums

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.get_url`
- YAML playbooks
- SHA checksum verification
- GPG signature verification
- GNU `sha256sum`
- OpenSSL `dgst`
- HashiCorp release checksums
- Kubernetes and Prometheus release artifacts

## Sources Consulted
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `get_url` module source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/get_url.py
- GNU Coreutils manual for `sha256sum` and SHA-2 utilities: https://www.gnu.org/software/coreutils/manual/coreutils.html
- OpenSSL `dgst` manual: https://docs.openssl.org/master/man1/openssl-dgst/
- HashiCorp security page for PGP keys and release checksum verification: https://www.hashicorp.com/en/trust/security
- HashiCorp binary verification guide: https://developer.hashicorp.com/well-architected-framework/verify-hashicorp-binary
- Kubernetes official kubectl SHA256 artifact: https://dl.k8s.io/release/v1.29.1/bin/linux/amd64/kubectl.sha256
- HashiCorp Terraform 1.7.3 SHA256SUMS: https://releases.hashicorp.com/terraform/1.7.3/terraform_1.7.3_SHA256SUMS
- HashiCorp Vault 1.15.4 SHA256SUMS: https://releases.hashicorp.com/vault/1.15.4/vault_1.15.4_SHA256SUMS
- HashiCorp Consul 1.17.2 SHA256SUMS: https://releases.hashicorp.com/consul/1.17.2/consul_1.17.2_SHA256SUMS
- Prometheus 2.50.0 release checksums: https://github.com/prometheus/prometheus/releases/download/v2.50.0/sha256sums.txt
- Node Exporter 1.7.0 release checksums: https://github.com/prometheus/node_exporter/releases/download/v1.7.0/sha256sums.txt

## Issues Found
- The kubectl SHA256 checksum did not match the official Kubernetes checksum for v1.29.1 linux/amd64. Updated the value so the `get_url` task would verify successfully.
- The first kubectl YAML example had invalid indentation for `ansible.builtin.get_url`. Fixed the indentation so the snippet is valid YAML.
- The discussion of supported checksum algorithms was too absolute. Ansible delegates algorithm availability to Python `hashlib`, which varies by Python/OpenSSL version and can be affected by FIPS mode, so the wording now includes that caveat.
- The Terraform SHA256SUMS example and `sha256sum` output used incorrect hashes for Terraform 1.7.3. Replaced them with the official HashiCorp checksums.
- The Prometheus checksum variable used an incorrect SHA256 for Prometheus 2.50.0 linux-amd64. Updated it to the official release checksum.
- The HashiCorp dictionary example used incorrect or placeholder SHA256 values for Terraform, Vault, and Consul. Replaced them with the official release checksums for the referenced versions.
- The GPG verification example claimed to download the HashiCorp GPG key but imported `/usr/share/keyrings/hashicorp-archive-keyring.gpg` without creating it. Added a `get_url` task for HashiCorp's official PGP key and changed the import command to use that downloaded key.

## Review Notes
The `checksum: "sha256:file:///tmp/..."` example is valid: Ansible's checksum URL handling accepts `file` URLs in addition to HTTP, HTTPS, and FTP. The GPG example remains intentionally minimal and does not cover key fingerprint trust policy, which would be a useful future improvement for a security-focused production guide.
