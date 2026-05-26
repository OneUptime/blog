# Validation Summary: How to Use Ansible Template with validate Parameter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible `ansible.builtin.template`
- Jinja2 templates
- nginx configuration validation
- sudoers / `visudo`
- OpenSSH `sshd_config`
- Apache HTTP Server configuration validation
- PHP INI parsing
- systemd unit validation
- YAML and JSON validation with Python
- Bash validation scripts

## Sources Consulted
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- nginx command-line parameter documentation: https://nginx.org/en/docs/switches.html
- Sudo `visudo` manual: https://www.sudo.ws/docs/man/visudo.man/
- OpenSSH manual pages: https://www.openbsd.org/openssh/manual.html
- Apache `apachectl` documentation: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Apache configuration file documentation: https://httpd.apache.org/docs/current/en/configuring.html
- PHP `parse_ini_file` manual: https://www.php.net/manual/en/function.parse-ini-file.php
- PHP command-line options manual: https://www.php.net/commandline.options
- systemd-analyze manual: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation
- Python `json` module documentation: https://docs.python.org/3/library/json.html

## Issues Found
- The Apache examples used `validate` commands without `%s`. Ansible documents that the validation command must include `%s`, so the direct `apachectl configtest` / `apache2ctl -t` examples would not satisfy the `validate` parameter contract. Replaced them with a wrapper-script approach that receives `%s`, temporarily installs the candidate virtual host, runs `apache2ctl -t`, and cleans up.
- The YAML and JSON Python examples embedded `%s` directly inside Python string literals. Updated them to pass the temporary file path as `sys.argv[1]`, which is less brittle and still satisfies Ansible's `%s` requirement.
- The multiple-validation example relied on shell chaining without correctly passing the temporary file to the shell command. Updated it to explicitly invoke `bash -c`, pass `%s` as an argument, and reference the candidate file as `$1`.

## Review Notes
- Ansible documents that `validate` commands are passed securely and shell features such as expansion and pipes do not work unless an explicit shell such as `bash -c` is invoked.
- Local `ansible` and `php` executables were not installed in the review workspace, so those checks were performed against official documentation rather than local CLI output.
