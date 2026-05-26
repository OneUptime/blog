# Validation Summary: How to Verify Ansible Galaxy Collection Signatures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Galaxy collections
- ansible-galaxy CLI
- Ansible configuration
- GnuPG / GPG detached signatures
- Galaxy NG / Automation Hub collection signing
- GitHub Actions CI/CD
- Bash scripting
- YAML requirements files

## Sources Consulted
- Ansible Community Documentation: Verifying collections: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_verifying.html
- Ansible Core 2.13 Documentation: ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible-core/2.13/cli/ansible-galaxy.html
- Ansible Core 2.13 Documentation: Installing collections with signature verification: https://docs.ansible.com/projects/ansible-core/2.13/user_guide/collections_using.html#installing-collections-with-signature-verification
- Ansible Community Documentation: Ansible configuration settings for GALAXY_GPG_KEYRING and GALAXY_REQUIRED_VALID_SIGNATURE_COUNT: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Red Hat Documentation: Managing content in automation hub, collection signature keys and ansible-galaxy verification: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/managing_automation_content/managing-cert-valid-content/
- Galaxy NG Documentation: Enabling collection signing: https://docs.ansible.com/projects/galaxy-ng/en/latest/config/collection_signing.html

## Issues Found
- The `ansible.cfg` example claimed to require signatures but only configured `gpg_keyring`. Added `required_valid_signature_count = +1`, because Ansible requires the leading `+` to fail when no valid signatures are found.
- Installation, explicit-signature, verification, requirements, and CI examples described strict signature verification but did not consistently enforce missing-signature failures. Added `--required-valid-signature-count +1` to those strict examples.
- The "allow unsigned collections" example used `--required-valid-signature-count 0`, but Ansible documents this option as a positive integer or `all` for current verification semantics. Changed it to `1` without a leading `+`, which verifies signatures when present without failing solely because none are found.
- The all-collections Bash script incremented `FAILURES` inside a pipeline subshell, so the final failure count would remain zero in common Bash execution. Rewrote the loop to use process substitution so verification failures affect the final exit status.

## Review Notes
- `ansible-galaxy` was not installed in the local environment, so CLI behavior was checked against official Ansible CLI documentation rather than local `--help` output.
- The post uses example signature URLs and placeholder key IDs. These are syntactically consistent with Ansible's documented examples, but readers must replace them with real signature sources and verified public-key fingerprints.
