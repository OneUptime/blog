# Validation Summary: How to Use the Ansible pip Module with virtualenv

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ansible
- ansible.builtin.pip
- ansible.posix.synchronize
- Python venv and virtualenv
- pip and requirements files
- PEP 668 externally managed Python environments
- Django, Gunicorn, and systemd

## Sources Consulted
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible `ansible.posix.synchronize` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- PEP 668: Marking Python base environments as externally managed: https://peps.python.org/pep-0668/
- Gunicorn deployment documentation for systemd: https://gunicorn.org/deploy/
- systemd.service manual for `Type=notify`: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The post said PEP 668 makes virtualenvs the only sanctioned way to install pip packages. Updated this to say pip refuses system installs by default and virtualenvs are the recommended way to install application dependencies, because PEP 668 and Ansible both document explicit override paths.
- The `virtualenv` installation example used `ansible.builtin.pip` with `executable: pip3`, which can fail on PEP 668-managed systems. Replaced it with an OS package installation example using `ansible.builtin.package` and `python3-virtualenv`.
- The Python 3.11 `venv` example set both `virtualenv_command: python3.11 -m venv` and `virtualenv_python: python3.11`. Ansible documents that `virtualenv_python` should not be used when `virtualenv_command` uses `-m venv`, so the parameter was removed and the explanation was updated.
- The full playbook used `ansible.builtin.synchronize`. Current Ansible documentation places this module in the `ansible.posix` collection, so the example was corrected to `ansible.posix.synchronize`.
- The tips section said `venv` requires no extra installation. Updated it to note that Debian-based systems require the matching `python3-venv` or `pythonX.Y-venv` OS package.

## Review Notes
- The Gunicorn systemd example's `Type=notify` usage is consistent with Gunicorn's deployment documentation.
- The `ansible.posix.synchronize` example assumes the `ansible.posix` collection is available; it is commonly included with the full `ansible` package but not with `ansible-core` alone.
