# Validation Summary: How to Use YAML Folded Strings in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- YAML folded block scalars
- YAML chomping indicators
- Ansible playbooks
- Ansible `when` conditionals
- Ansible `ansible.builtin.command` and `ansible.builtin.debug` modules
- AWS CLI `s3 sync`
- Docker CLI `pull` and `run`

## Sources Consulted
- YAML 1.2.2 Specification, Block Scalar Styles and Block Chomping: https://yaml.org/spec/1.2.2/
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.debug` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/debug_module.html
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Docker `docker image pull` CLI reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The introduction said folded strings collapse multiline YAML into a single line at runtime. This was too broad because YAML folded block scalars fold most single line breaks into spaces, but blank lines and more-indented lines can preserve line breaks. Updated the wording to say folded strings fold most single line breaks into spaces.
- The chomping guidance said to always use `>-` for `when` conditions and command arguments to avoid trailing-newline issues. This was overly absolute. Updated it to recommend `>-` when the intended value is one logical line with no trailing newline.
- The first pitfall framed the trailing newline as specifically a command issue. Updated it to state that omitting `>-` leaves a trailing newline in the scalar value, which matters when the value must not include a final newline.

## Review Notes
- YAML folded scalar behavior was verified with the YAML 1.2.2 specification and local PyYAML parsing for the paragraph and indentation examples.
- The Ansible snippets use valid task/module shapes and raw Jinja2 expressions for `when`, consistent with Ansible documentation. The local environment did not have the `ansible-playbook` CLI available, so full playbook syntax checking could not be run from the command line.
