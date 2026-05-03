# Validation Summary: How to Deploy JupyterHub via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- JupyterHub (multi-user Jupyter server)
- DockerSpawner (per-user container spawner)
- OAuthenticator (GitHub OAuth integration)
- Portainer (Docker management UI)
- Docker Compose (stack definition)
- Jupyter Docker Stacks (`datascience-notebook` image)
- Python ML libraries: xgboost, lightgbm, catboost, shap, mlflow
- R packages: tidymodels, xgboost
- PAM authentication

## Sources Consulted
- JupyterHub changelog (5.0.0 release notes): https://jupyterhub.readthedocs.io/en/stable/reference/changelog.html
- JupyterHub authenticator API reference: https://jupyterhub.readthedocs.io/en/stable/reference/api/auth.html
- DockerSpawner API reference: https://jupyterhub-dockerspawner.readthedocs.io/en/latest/api/index.html
- JupyterHub upstream Dockerfile: https://github.com/jupyterhub/jupyterhub/blob/main/Dockerfile
- OAuthenticator (GitHub) reference: https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.github.html
- Jupyter Docker Stacks documentation: https://jupyter-docker-stacks.readthedocs.io/en/latest/

## Issues Found

1. **`Authenticator.allow_all = True` is a JupyterHub 5.0 feature, but image was pinned to `4.0`.** This config trait was introduced in JupyterHub 5.0.0 (May 2024) and does not exist in 4.x. Setting it on 4.0 would emit a "trait not found" warning and have no effect. Fixed by bumping the image tag from `jupyterhub/jupyterhub:4.0` to `jupyterhub/jupyterhub:5.0`, which is consistent with the post's intent of using `allow_all`.

2. **The official `jupyterhub/jupyterhub` image does not include DockerSpawner or OAuthenticator.** The upstream Dockerfile describes itself as "an incomplete base image"; it ships only JupyterHub itself. With the original stack, `from dockerspawner import DockerSpawner` in the config would raise `ModuleNotFoundError` and the hub would refuse to start. Same for `from oauthenticator.github import GitHubOAuthenticator` in Step 4. Fixed by overriding `command:` to install `dockerspawner` and `oauthenticator` via pip before launching `jupyterhub`, with a comment explaining why.

3. **`jupyter/datascience-notebook` on Docker Hub is no longer being updated.** Per the official Jupyter Docker Stacks docs, since 2023-10-20 images are only pushed to Quay.io. Fixed by switching the `c.DockerSpawner.image` value and the `FROM` line in the custom Dockerfile to `quay.io/jupyter/datascience-notebook:latest`.

## Review Notes

- All DockerSpawner config keys (`mem_limit`, `cpu_limit`, `network_name`, `use_internal_ip`, `notebook_dir`, `volumes`, `image`) are valid traitlets per the DockerSpawner reference.
- `c.JupyterHub.authenticator_class = "jupyterhub.auth.PAMAuthenticator"` is a valid full class path. The shorthand entrypoint `"pam"` would also work.
- All `GitHubOAuthenticator` fields used (`oauth_callback_url`, `client_id`, `client_secret`, `allowed_organizations`) are documented and valid.
- The Python package versions referenced in the Dockerfile (xgboost 2.0.3, lightgbm 4.3.0, catboost 1.2.3, shap 0.44.1, mlflow 2.10.0) all exist on PyPI and are mutually compatible.
- The `command: sh -c "pip install ..."` workaround installs dependencies on every container start, which adds startup latency. A cleaner long-term approach is to build a small custom hub image (`FROM jupyterhub/jupyterhub:5.0; RUN pip install dockerspawner oauthenticator`) and reference it in the stack — worth considering as a future improvement.
- Authors using JupyterHub 5.0 with OAuthenticator should be aware that explicit authorization (e.g., `allowed_organizations`) is required; the deny-by-default change applies to OAuth flows as well.
- Compose `version: "3.8"` is still accepted by Docker Compose v2 but the version key is now considered obsolete and emits a warning. Not a correctness issue.
