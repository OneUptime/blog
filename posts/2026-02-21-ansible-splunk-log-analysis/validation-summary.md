# Validation Summary: How to Use Ansible with Splunk for Log Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Splunk Universal Forwarder
- Splunk `inputs.conf` and `outputs.conf`
- Linux log monitoring
- Cron-based automation

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Splunk Universal Forwarder documentation for configuring forwarding with `outputs.conf`: https://help.splunk.com/splunk-enterprise/forward-and-process-data/universal-forwarder-manual/9.4/forward-data/configure-forwarding-with-outputs.conf
- Splunk Universal Forwarder documentation for configuration files and `add forward-server`: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/10.0/configure-the-universal-forwarder/configure-the-universal-forwarder-using-configuration-files
- Splunk documentation for monitoring files and directories with `inputs.conf`: https://help.splunk.com/en/splunk-enterprise/get-started/get-data-in/9.1/get-data-from-files-and-directories/monitor-files-and-directories-with-inputs.conf
- Splunk documentation for administrator credential seeding with `--seed-passwd`: https://help.splunk.com/?resourceId=Splunk_Security_Secureyouradminaccount

## Issues Found
- The forward server task used `splunk add forward-server` with `changed_when: true`, which makes the task non-idempotent and can repeatedly report changes on every playbook run. Replaced it with an `outputs.conf` template using the documented `[tcpout]` and `[tcpout:<group>]` configuration format.
- The task snippet notified `restart splunk forwarder`, but the role did not define that handler. Added a matching `roles/splunk_forwarder/handlers/main.yml` snippet so the playbook example is complete.

## Review Notes
- The Splunk indexer must already be configured to receive data on port `9997`, and the destination indexes such as `os`, `security`, `application`, and `web` must exist before events are sent to them.
- The examples are Linux-focused and use Debian/Ubuntu log paths and a `.deb` package installation flow.
