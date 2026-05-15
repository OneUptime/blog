# Validation Summary: How to Set Up Jupyter Notebook Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Python 3
- Python virtual environments
- Jupyter Notebook and Jupyter Server
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using Python: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Jupyter documentation: Common configuration approach: https://docs.jupyter.org/en/latest/use/config.html
- Jupyter Server documentation: Security in the Jupyter Server: https://jupyter-server.readthedocs.io/en/latest/operators/security.html
- Jupyter Notebook documentation: Running a notebook server: https://jupyter-notebook.readthedocs.io/en/5.7.6/public_server.html
- firewalld documentation: Open a port or service: https://firewalld.org/documentation/howto/open-a-port-or-service
- systemd systemctl help output from the local environment for `enable --now`, `status`, `is-active`, and `show` command forms.

## Issues Found
- The original package installation used `epel-release`, `Development Tools`, and `<package-name>` placeholders. This would not install Jupyter Notebook on RHEL. I replaced it with RHEL Python packages and a Python virtual environment, matching Red Hat guidance to avoid system-level `pip` installs.
- The original verification command used `rpm -qi <package-name>`, which was a placeholder. I changed it to verify the RHEL Python RPMs and the installed Jupyter Notebook command.
- The original service configuration path `/etc/<service>/config.conf` and `<service>` systemctl commands were placeholders. I replaced them with a concrete `jupyter-notebook.service` systemd unit that runs Jupyter from the virtual environment as a dedicated non-root user.
- The original setup did not configure Jupyter authentication. I added `jupyter server password`, which Jupyter Server documents as the supported way to set a password and store the hashed password.
- The original test command `sudo <service> --test` was invalid for Jupyter Notebook. I replaced it with `systemctl is-active` and an `ss` listener check for port 8888.
- The original firewall command used `--add-service=<service>`, but Jupyter does not install a firewalld service definition. I replaced it with `--add-port=8888/tcp`.
- The original monitoring and troubleshooting commands used generic `<service>` and `pidof <service>` placeholders. I replaced them with commands that reference the actual systemd unit and main process ID.

## Review Notes
The post now describes a single-user Jupyter Notebook server. For shared multi-user environments, JupyterHub is the more appropriate official project. Production deployments should also add TLS or place Jupyter behind a TLS-terminating reverse proxy before exposing it beyond a trusted network.
