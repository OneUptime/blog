# Validation Summary: How to Install JupyterHub for Multi-User Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- JupyterHub (multi-user Jupyter)
- JupyterLab / Jupyter notebook
- PAM authentication
- LocalProcessSpawner
- configurable-http-proxy (Node.js)
- Nginx (HTTPS reverse proxy with WebSocket upgrade)
- Let's Encrypt / certbot
- systemd
- ipykernel (kernel registration)
- jupyterhub-idle-culler
- PyTorch (CUDA 12.1 wheel index)
- Ubuntu 20.04/22.04

## Sources Consulted
- JupyterHub docs — https://jupyterhub.readthedocs.io/en/stable/
- JupyterHub Authenticators reference — https://jupyterhub.readthedocs.io/en/stable/reference/authenticators.html
- JupyterHub Spawners reference — https://jupyterhub.readthedocs.io/en/stable/reference/spawners.html
- JupyterHub user environment howto — https://jupyterhub.readthedocs.io/en/stable/howto/configuration/config-user-env.html
- jupyterhub-idle-culler README — https://github.com/jupyterhub/jupyterhub-idle-culler
- systemd.syntax man page — https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- PyTorch previous versions — https://pytorch.org/get-started/previous-versions/
- NodeSource distributions — https://github.com/nodesource/distributions

## Issues Found
1. **Inline comment in systemd unit file (hard bug).** The line `User=root  # JupyterHub needs root to spawn processes as different users` would cause systemd to treat the entire string `root  # JupyterHub...` as the username and fail to start the service — systemd does not support end-of-line comments. Moved the comment to its own line above the `User=root` directive.
2. **Misleading "Max 4 CPUs"/"Max 4GB RAM" comments on `c.Spawner.cpu_limit` / `c.Spawner.mem_limit`.** `LocalProcessSpawner` does not actually enforce these limits — they are advisory and only exposed to the singleuser server as `CPU_LIMIT` / `MEM_LIMIT` environment variables. Real enforcement requires a container-based spawner (Docker, Kubernetes, systemd). Replaced the misleading comments with an accurate description that points the reader at DockerSpawner/KubeSpawner for real enforcement.

## Review Notes
- The `jupyterhub.auth.PAMAuthenticator` class path is valid; the more idiomatic modern value is the entry-point string `"pam"`, but the dotted path still works.
- `c.Authenticator.allow_all = False` is correct for JupyterHub 5.0+ (the setting was added in 5.0 and defaults to False). With `allow_all = False` and no `allowed_users` set, only the `admin_users` set will be able to log in, which matches the post's intent.
- The idle-culler service uses `"admin": True`, which still functions in JupyterHub 2.0+ but is deprecated in favor of `c.JupyterHub.load_roles` with explicit scopes (`list:users`, `read:users:activity`, `read:servers`, `delete:servers`). Left as-is because it still works; readers deploying against future JupyterHub releases should migrate.
- The PyTorch `cu121` wheel index URL is valid and resolves, but PyTorch's current selector page (2026) advertises CUDA 12.6/12.8 wheels — for a brand-new install on recent NVIDIA drivers, a newer CUDA index may be preferable.
- NodeSource's `setup_20.x` install script still works for Node 20 (which remains in active LTS), but NodeSource's documentation now nudges users toward the manual apt-repo configuration rather than the one-liner installer.
- The first `c.JupyterHub.services = []` in Step 3 is overwritten by the later idle-culler block — readers must keep only the second assignment if they enable the culler. Not a bug, but worth being aware of.
- Earlier `# Shut down servers that have been idle for 1 hour` comment above `c.JupyterHub.shutdown_on_logout = False` is slightly mismatched (idle shutdown is what the idle-culler does, not `shutdown_on_logout`), but the settings themselves are valid defaults so no edit was made.
