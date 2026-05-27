# Validation Summary: How to Use the Ansible oneline Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- Ansible stdout callback configuration
- Ansible ad-hoc commands
- Bash text processing
- GitHub Actions
- Python callback plugin customization

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.oneline callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/oneline_callback.html
- Ansible Core Documentation: Callback plugins: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Community Documentation: DEFAULT_STDOUT_CALLBACK / ANSIBLE_STDOUT_CALLBACK configuration: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#default-stdout-callback
- Ansible upstream source: oneline callback implementation: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/callback/oneline.py
- Ansible upstream source: minimal callback implementation: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/callback/minimal.py
- Local installed ansible-core Python package, version 2.21.0, for callback source inspection.

## Issues Found
- The post did not mention that the `oneline` callback is deprecated in current ansible-core and scheduled for removal in ansible-core 2.23. Added a note in the introduction.
- The unreachable output example used `UNREACHABLE! => {json}`. The current `oneline` implementation prints unreachable results as `hostname | UNREACHABLE!: message`. Updated the example.
- The post described all output as `hostname | STATUS => {result_json}`. Updated the wording because unreachable results and command-style modules use different one-line formats.
- The ad-hoc command examples used only `ANSIBLE_STDOUT_CALLBACK=oneline ansible ...`. Official Ansible callback documentation notes that ad-hoc `ansible` uses a different stdout callback by default; the `oneline` callback is specifically used by `ansible -o` / `ansible --one-line`. Updated ad-hoc examples to use `ansible -o`.
- The shell ad-hoc output example showed JSON output. The current `oneline` callback formats command-style modules as `hostname | STATUS | rc=N | (stdout) ...`. Updated the disk-space examples.
- The `service_facts` grep assumed no whitespace after the JSON colon. Updated it to tolerate the space produced by normal JSON formatting.
- The custom callback example used older private result attributes (`_host`, `_result`) and omitted result bodies for successful and changed tasks. Updated it to use current public attributes (`host`, `result`), preserve `oneline` result formatting, and include unreachable handling.

## Review Notes
The `ansible`, `ansible-playbook`, and `ansible-doc` command-line executables were not available in the local PATH, so CLI behavior was verified against official documentation, upstream source, and the locally installed ansible-core Python package source instead.
