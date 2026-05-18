# Validation Summary: How to Set Up Fabric for SSH Task Automation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fabric (Python SSH automation library, versions 2.x and 3.x)
- Paramiko (underlying SSH library)
- Python 3 / `venv` / `pip`
- OpenSSH client + `~/.ssh/config`
- Ubuntu (target OS)
- nginx (used in deployment examples)
- systemd (`systemctl`, `journalctl`)
- Django (`manage.py migrate`, `collectstatic`) — used as example app
- `concurrent.futures.ThreadPoolExecutor` (parallel multi-host execution)

## Sources Consulted
- Fabric official documentation — https://docs.fabfile.org/en/latest/
- Fabric getting-started guide — https://docs.fabfile.org/en/latest/getting-started.html
- Fabric changelog — https://www.fabfile.org/changelog.html
- Fabric on PyPI — https://pypi.org/project/fabric/
- Invoke task invocation docs — https://docs.pyinvoke.org/en/stable/concepts/invoking-tasks.html
- Fabric GitHub repository — https://github.com/fabric/fabric

## Issues Found

1. **Outdated version statement.** The post stated "This guide covers Fabric 2 (the current version)". Fabric 3.0.0 was released in January 2023 and 3.x has been the current major line for over three years as of May 2026. Updated the intro (and the front-matter description) to refer to "modern Fabric (2.x and 3.x)" and note that the 2.x and 3.x APIs are largely compatible, so the examples work on either.

2. **Broken usage example for the `deploy` task.** The `deploy` task is defined as `def deploy(ctx, host, branch='main')`, but its docstring claimed it could be invoked as `fab -H web1 deploy`. The `-H` flag in Fabric only controls which `Connection` is bound to the task's first parameter; it does **not** auto-populate other arguments. Calling `fab -H web1 deploy` against this signature fails with a missing required argument for `host`. Updated the usage examples in the docstring to `fab deploy web1` / `fab deploy web1 --branch=staging` (which match the actual task signature, since the task opens its own `Connection(host)` internally) and added a short note explaining why `-H` is not used here.

## Review Notes

- The `deploy` task is illustrative rather than fully production-hardened. A couple of architectural points a reader should be aware of (left as-is — they are design choices, not API errors):
  - The task creates the release directory with `sudo` (`conn.sudo(f'mkdir -p {release_dir}')`) but then runs `git clone` and the cleanup `xargs rm -rf` without `sudo`. In practice, deployment trees under `/var/www` are usually pre-owned by the deploy user so the clone and cleanup steps work, or the entire workflow uses `sudo`. The example mixes the two.
  - The idiomatic Fabric 2/3 pattern is to let `c`/`ctx` be the `Connection` (via `fab -H host taskname`) and use `c.run` / `c.sudo` directly, instead of taking `host` as a parameter and opening a fresh `Connection` inside the task. The current example demonstrates the `Connection()` pattern explicitly, which is also valid.
- The `Using Environment Variables` section relies on Fabric's `inline_ssh_env`, which defaults to `True` in `Connection.run()` since Fabric 2.5 — so the example works out of the box on current Fabric. Readers on older Fabric, or whose SSH server's `AcceptEnv` is restrictive, may need to either set `inline_ssh_env=True` explicitly or prefix the command with `export`. Not a bug in the post; just a known gotcha worth being aware of.
- All other code samples (decorators, `Connection`, `Config(overrides=...)`, `conn.run` / `conn.sudo` / `conn.put` / `conn.get` / `conn.cd` context manager, `key_filename` in `connect_kwargs`, `warn=True`, `hide=True`, `--branch` / `--depth` git flags, `ThreadPoolExecutor` usage, `fab -H` syntax for the non-`deploy` tasks) were verified against the official Fabric/Invoke/Paramiko docs and are correct.
