# Validation Summary: How to Configure Custom DNS Entries in /etc/hosts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `/etc/hosts`
- GNU C Library NSS (`/etc/nsswitch.conf`, `getent`)
- Docker
- Docker Compose
- Ansible
- Basic networking and hostname resolution

## Sources Consulted
- Linux `hosts(5)` manual page: https://man7.org/linux/man-pages/man5/hosts.5.html
- Linux `nsswitch.conf(5)` manual page: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- Linux `getent(1)` manual page: https://man7.org/linux/man-pages/man1/getent.1.html
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker bridge networking docs: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Compose `services` reference (`extra_hosts`): https://docs.docker.com/reference/compose-file/services/
- Ansible `ansible.builtin.lineinfile` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- The write examples appended directly to `/etc/hosts` with shell redirection, which fails for typical non-root users even when `sudo` is added only to `echo`. I changed those examples to `printf ... | sudo tee -a /etc/hosts` and added `sudo` to the backup, editor, bulk-append, and `sed -i` examples so the commands work against a root-owned file.
- The domain-blocking example said `0.0.0.0` "resolves to loopback, connection refused." That is incorrect: `0.0.0.0` is not loopback. I changed the explanation to the accurate, narrower statement that the hostname is resolved to `0.0.0.0`.
- The NSS explanation was too absolute about `/etc/hosts` always being checked before DNS. I updated the wording to reflect that lookup order depends on `/etc/nsswitch.conf`, while keeping the guide's point about the common `files`-before-`dns` case.
- The Docker section incorrectly implied that other containers on the same network are added to a container's `/etc/hosts`. Docker's documented behavior for user-defined bridge networks is embedded DNS-based name resolution between containers. I corrected that explanation and kept `--add-host` / `extra_hosts` as the `/etc/hosts` override mechanism.
- The conclusion said `/etc/hosts` changes have "no caching or TTL" and always take effect immediately. The `hosts(5)` man page notes that changes normally take effect immediately except when applications cache the file. I updated the conclusion to reflect that caveat.

## Review Notes
- Docker Compose currently prefers `HOSTNAME=IP` in `extra_hosts`, but `HOSTNAME:IP` is also accepted in recent Compose versions. The post's Compose examples remain valid as written.
