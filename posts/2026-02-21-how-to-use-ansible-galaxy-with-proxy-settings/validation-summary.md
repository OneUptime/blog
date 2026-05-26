# Validation Summary: How to Use Ansible Galaxy with Proxy Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Galaxy
- Ansible configuration (`ansible.cfg`)
- HTTP, HTTPS, and SOCKS proxy environment variables
- Python `urllib.request` and Requests proxy handling
- Git proxy configuration
- CI/CD environment variables for GitHub Actions and GitLab CI

## Sources Consulted
- Ansible Community Documentation: `ansible-galaxy` CLI reference, https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: installing collections and configuring the `ansible-galaxy` client, https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Ansible configuration settings (`GALAXY_SERVER`, `GALAXY_SERVER_TIMEOUT`, `GALAXY_IGNORE_CERTS`), https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Requests documentation: advanced usage, proxies, CA bundles, and SOCKS support, https://requests.readthedocs.io/en/stable/user/advanced/
- Python documentation: `urllib.request.ProxyHandler` and proxy environment variables, https://docs.python.org/3/library/urllib.request.html
- Git documentation: `git-config` `http.proxy`, https://git-scm.com/docs/git-config
- Live connectivity check for `https://galaxy.ansible.com/api/` using `curl`

## Issues Found
- Updated role installation examples from legacy `ansible-galaxy install` to current documented `ansible-galaxy role install`, matching the current Ansible CLI structure where role operations are under the `role` action.
- Changed the `ansible.cfg` Galaxy timeout key from `timeout = 60` to `server_timeout = 60`, which is the documented `[galaxy]` configuration key for the default Galaxy API timeout.
- Replaced the SOCKS dependency command `pip install pysocks` with `python -m pip install 'requests[socks]'`, matching the Requests documentation for enabling SOCKS proxy support and avoiding ambiguity about which Python environment receives the dependency.

## Review Notes
The `ansible-galaxy` executable was not installed in the local environment, so CLI flags were verified against the current official Ansible documentation rather than local `--help` output. The Galaxy API URL returned HTTP 200 during the live `curl` check.
