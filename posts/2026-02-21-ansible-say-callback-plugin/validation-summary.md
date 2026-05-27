# Validation Summary: How to Use the Ansible say Callback Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- `community.general.say` callback
- Ansible configuration
- macOS `say`
- Linux `espeak`
- Python custom Ansible callback plugins

## Sources Consulted
- Ansible Community Documentation: `community.general.say` callback, https://docs.ansible.com/ansible/latest/collections/community/general/say_callback.html
- Ansible Core Documentation: Callback plugins, https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Core Documentation: Developing plugins, https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_plugins.html
- Ansible Community Documentation: Configuration settings, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: `ansible.builtin.default` callback, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible Community Documentation: Callback plugin index, https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- `community.general.say` source, https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/say.py

## Issues Found
- The post used the older `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` settings. Changed these to the current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED` settings.
- The post said the callback supports `spd-say` and recommended `speech-dispatcher`. The official callback requires `say` or `espeak`, so the `spd-say` and `speech-dispatcher` references were removed.
- The post described announcements like `ok on web-01`, `changed on web-02`, and detailed recap summaries. The current callback source speaks messages such as `Running Playbook`, `Starting task: ...`, `Failure on host ...`, `pew`, and `Play complete`, so the event list and sample output were corrected.
- The post implied `display_ok_hosts` and `display_skipped_hosts` make the say callback quieter. These options apply to default stdout output, not to the say callback's own event handling, so the explanation was corrected.
- The custom callback used `CALLBACK_NEEDS_WHITELIST`. Updated it to the current `CALLBACK_NEEDS_ENABLED` property used by Ansible callback plugins.
- The deployment script exported `SAY_VOICE`, which is not an option consumed by the say callback. Removed it and made the final shell announcement choose `say` or `espeak` based on availability.
- The visual callback example used `stdout_callback = yaml`, which is outdated for current Ansible. Updated it to use `ansible.builtin.default` with `callback_result_format = yaml`.
- The callback combination example used unqualified `timer` and `profile_tasks`. Updated these to `ansible.posix.timer` and `ansible.posix.profile_tasks`, and noted that they come from the `ansible.posix` collection.
- Added a note that `community.general.say` is in the `community.general` collection and may need to be installed when using `ansible-core`.

## Review Notes
The post is now technically accurate for current Ansible documentation. One caveat remains: the exact voices used by the built-in callback are implementation details from the current `community.general.say` source and may change in a future collection release.
