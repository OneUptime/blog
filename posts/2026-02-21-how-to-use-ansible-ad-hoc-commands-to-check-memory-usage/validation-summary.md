# Validation Summary: How to Use Ansible Ad Hoc Commands to Check Memory Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible setup facts
- Ansible cron module
- Linux memory reporting with `free` and `/proc/meminfo`
- Linux process inspection with `ps`, `/proc`, `dmesg`, and OOM scores
- Java `jstat`
- PostgreSQL, Redis, and Docker memory commands

## Sources Consulted
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/setup_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- procps `free(1)` man page: https://manpages.debian.org/testing/procps/free.1.en.html
- POSIX `crontab` manual: https://www.unix.com/man-page/posix/1p/crontab
- Oracle `jstat` command documentation: https://docs.oracle.com/en/java/javase/25/docs/specs/man/jstat.html
- Docker `docker stats` CLI documentation: https://docs.docker.com/reference/cli/docker/container/stats/
- PostgreSQL resource consumption documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html

## Issues Found
- The facts-based low-memory script used `ansible_memfree_mb`, which counts cache-heavy systems as high memory usage. Changed it to prefer `ansible_memory_mb.nocache.free`, falling back to `ansible_memfree_mb`, so the calculation better matches the article's guidance about cache.
- The RSS process example called RSS "actual memory usage." Changed it to "resident memory usage" because RSS can include shared pages and is not the same as unique process memory.
- The swap section said servers using swap are likely under memory pressure. Softened this to "actively using swap" and "may be under memory pressure" because inactive swapped pages can remain after pressure has passed.
- The `/proc/meminfo` cache command matched `SwapCached` as well as `Cached`. Anchored the grep pattern to return only `Cached`, `Buffers`, and `SReclaimable`.
- The `jstat` command passed all PIDs returned by `pgrep -f`, which can break when multiple Java processes match. Limited it to the first matching PID.

## Review Notes
Ansible was not installed in the local workspace, so Ansible-specific behavior was verified against official documentation rather than local `ansible-doc` output. The Linux shell snippets that do not require Ansible were checked locally for syntax and command behavior.
