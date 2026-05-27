# Validation Summary: How to Use Ansible to Configure System Proxy Settings

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible
- Linux environment variables and profile scripts
- APT
- YUM/DNF
- pip
- npm
- wget
- curl
- Docker daemon and Docker CLI proxy configuration
- systemd drop-in files

## Sources Consulted
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Docker CLI proxy configuration: https://docs.docker.com/engine/cli/proxy/
- pip configuration documentation: https://pip.pypa.io/en/stable/topics/configuration/
- npm config documentation: https://docs.npmjs.com/cli/v10/using-npm/config/
- GNU Wget wgetrc commands: https://www.gnu.org/software/wget/manual/html_node/Wgetrc-Commands.html
- Debian `apt.conf(5)` man page: https://manpages.debian.org/bookworm/apt/apt.conf.5.en.html
- APT HTTP transport proxy documentation: https://manpages.debian.org/unstable/apt/apt-transport-http.1.en.html
- DNF configuration reference: https://dnf.readthedocs.io/en/latest/conf_ref.html
- curl manual / config file documentation: https://curl.se/docs/manpage.html

## Issues Found
- The package-manager playbook referenced `no_proxy_list` in the curl configuration without defining it in that play. Added `no_proxy_list` and `no_proxy` variables, then used `no_proxy` in the curl snippet.
- The YUM/DNF examples wrote only to `/etc/yum.conf`, but DNF's documented global configuration file is `/etc/dnf/dnf.conf`. Updated package-manager, authenticated proxy, test, and removal examples to choose `/etc/dnf/dnf.conf` when `ansible_pkg_mgr` is `dnf` or `dnf5`, otherwise `/etc/yum.conf`.
- The post created `/etc/pip.conf.d`, but pip's documented Unix global config locations are `/etc/xdg/pip/pip.conf` followed by `/etc/pip.conf`; `pip.conf.d` is not a standard pip include directory. Removed that unused task.
- The curl example wrote `/etc/curlrc` and called it system-wide, but curl's documented default config file lookup uses user-level curlrc files such as `$HOME/.curlrc`, not `/etc/curlrc`. Changed the example to manage `/root/.curlrc` and renamed the task accordingly.
- The removal playbook claimed to remove all proxy configuration but did not clean up pip, npm, wget, curl, or the Docker client proxy file created earlier in the post. Added cleanup tasks for those configurations.
- The authenticated proxy URL embedded raw username and password values. Updated it to use Ansible/Jinja `urlencode` for credentials before building the URL, so special characters do not break the proxy URI.
- The architecture diagram still showed only `yum.conf`. Updated it to `yum.conf/dnf.conf`.

## Review Notes
- The examples are technically valid for conventional Linux hosts, but proxy handling varies by tool. `no_proxy` wildcard and CIDR behavior is not fully consistent across every client, so enterprise deployments should test the exact tools and versions they run.
- The Docker client examples overwrite and remove `/root/.docker/config.json`. This matches the simplified tutorial flow, but a production role should merge or remove only the `proxies` key to avoid disturbing unrelated Docker client settings.
- Ansible was not installed in the local workspace, so I could not run `ansible-playbook --syntax-check`; the YAML snippets were reviewed manually against Ansible module syntax and official tool configuration docs.
