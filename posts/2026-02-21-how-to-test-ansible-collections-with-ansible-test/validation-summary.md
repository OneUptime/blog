# Validation Summary: How to Test Ansible Collections with ansible-test

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-core
- ansible-test
- Ansible collections
- Python unit testing with pytest/unittest.mock
- YAML playbooks and GitHub Actions
- Docker-based test environments

## Sources Consulted
- Ansible Core documentation: Testing collections: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_testing.html
- Ansible Community documentation: Testing Ansible and Collections: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_running_locally.html
- Ansible Community documentation: Integration tests: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_integration.html
- Ansible Community documentation: Sanity test ignores: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/ignores.html
- Ansible Core 2.16 documentation: Sanity Tests list: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/testing/sanity/index.html
- Ansible Community documentation: integration-aliases: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/integration-aliases.html

## Issues Found
- The post said setting `ANSIBLE_COLLECTIONS_PATH` was an alternative for the required `ansible_collections/<namespace>/<collection>` path. Official `ansible-test` guidance requires running from a collection path containing `ansible_collections`, and collection dependencies must be in the same collection root because `ansible-test` does not use configured collection roots. Replaced the sentence with dependency placement guidance.
- The sanity test table listed `no-unwanted-files` for collection testing, but the Ansible Core 2.16 sanity test list marks that as an additional test for ansible-core, not for collections. Replaced it with `no-illegal-filenames`, which is available for collection sanity testing.
- The sanity ignore examples used a three-column-style format and separated error codes with a space. Official ignore syntax uses two columns, with error codes appended to the test name using a colon. Updated the format description and examples to `pep8:E501` and `pylint!skip`.
- The unit test introduction said the example validates IP addresses, but the example tests a TCP port-checking module. Updated the wording.
- The unit test snippet imported `pytest` but did not use it. Removed the unused import.
- The integration test assumed SSH was open on localhost port 22, which is not reliable in Docker or CI. Updated the example to start a local Python HTTP server on `127.0.0.1:18080`, wait for it, test the open port, and clean it up.
- The Docker image examples listed hard-coded image names that may not be supported by every `ansible-test` version. Updated the example to use the generic `ubuntu` image and point readers to `ansible-test integration --help` for the version-specific image list.
- The integration aliases example used `needs/target/setup_postgresql` for setup. Official alias documentation uses `setup/once/TARGET` or `setup/always/TARGET` to run setup targets before dependent tests. Changed the example to `setup/once/setup_postgresql`.

## Review Notes
The local environment did not have `ansible-test` installed, so CLI behavior was verified against official Ansible documentation rather than local `--help` output. The sample `check_port`, filter, and helper functions are illustrative and depend on corresponding collection code not included in the post.
