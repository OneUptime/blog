# Validation Summary: How to Use Ansible to Handle Large File Transfers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible.builtin.copy
- ansible.posix.synchronize
- ansible.builtin.get_url
- amazon.aws.s3_object
- ansible.builtin.unarchive
- Ansible async and forks
- SSH connection options
- rsync
- curl

## Sources Consulted
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible ssh connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Amazon AWS s3_object module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_object_module.html
- rsync project and man page: https://rsync.samba.org/ and https://rsync.samba.org/ftp/rsync/rsync.1.html
- curl command documentation: https://curl.se/docs/manpage.html

## Issues Found
- The post claimed that the `copy` module base64-encodes file contents during transfer and inflates payloads by roughly 33%. Current Ansible SSH file transfer uses configured transfer methods such as sftp, scp, or piped transfer, so the claim was replaced with a narrower explanation about checksumming and connection-plugin staging.
- The S3 example used `amazon.aws.aws_s3`. Current amazon.aws documentation redirects that name to `amazon.aws.s3_object`, so the example and decision guide were updated to use `amazon.aws.s3_object`.
- The S3 object key had a leading slash. The current `amazon.aws.s3_object` documentation deprecates leading slashes for object keys, so the example key was changed from `/db/dump_20260221.sql.gz` to `db/dump_20260221.sql.gz`.
- The timeout example used `ansible_command_timeout` for an SSH file-transfer scenario. That variable applies to persistent connection command timeouts, mainly network connections, not normal SSH file transfer behavior. It was replaced with SSH keepalive arguments.
- The temporary HTTP server task combined a shell background operator with Ansible async. It was changed to run `python3 -m http.server 8888` directly with `async` and `poll: 0`, using `chdir` instead of an inline `cd`.
- The post recommended async execution for `copy` and `synchronize`. Ansible documentation explicitly notes that `copy` does not perform a background file transfer with async, so the section was changed to recommend `forks` for host-level parallelism and reserve async for long-running command-based pull transfers.

## Review Notes
The remaining examples are structurally correct but still assume expected environment details: `rsync` must be installed for `ansible.posix.synchronize`, the relevant Ansible collections must be installed, target hosts need network access for pull-based downloads, and the staging HTTP server address may need to be set explicitly in inventories where `ansible_default_ipv4.address` is not the reachable control-node address.
