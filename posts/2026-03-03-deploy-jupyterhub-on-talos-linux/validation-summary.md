# Validation Summary: How to Deploy JupyterHub on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- JupyterHub (Zero to JupyterHub Helm chart, z2jh)
- Helm
- Jupyter Docker Stacks (scipy-notebook, tensorflow-notebook, r-notebook)
- KubeSpawner profile lists
- DummyAuthenticator, GitHubOAuthenticator, LDAPAuthenticator
- cert-manager / ingress-nginx
- Longhorn (RWX storage)
- Prometheus / ServiceMonitor (prometheus-operator)
- Velero (backup)
- Kubernetes ResourceQuota

## Sources Consulted
- [Zero to JupyterHub Installation Guide](https://z2jh.jupyter.org/en/stable/jupyterhub/installation.html)
- [Zero to JupyterHub Configuration Reference](https://z2jh.jupyter.org/en/latest/resources/reference.html)
- [Zero to JupyterHub Changelog](https://z2jh.jupyter.org/en/latest/changelog.html)
- [Jupyter Docker Stacks documentation](https://jupyter-docker-stacks.readthedocs.io/)
- [jupyter/docker-stacks GitHub repository](https://github.com/jupyter/docker-stacks) (quay.io migration as of 2023-10-20)
- [jupyterhub/helm-chart releases](https://github.com/jupyterhub/helm-chart/releases)

## Issues Found

1. **Obsolete `proxy.secretToken` generation step.** The post instructed readers to run `openssl rand -hex 32` and place the result in `proxy.secretToken`. Per the z2jh configuration reference, since chart version 1.0.0 this secret is auto-generated and does not need to be set manually. Removed both the `openssl rand` command block and the `secretToken` field from the values example.

2. **Deprecated Docker Hub image namespace (`jupyter/*`).** As of 2023-10-20 the Jupyter Docker Stacks images are only pushed to `quay.io/jupyter/*`; the `jupyter/*` Docker Hub repositories are no longer updated. Updated all image references — `jupyter/scipy-notebook`, `jupyter/tensorflow-notebook`, `jupyter/r-notebook`, and the `Dockerfile.datascience` `FROM` line — to use the `quay.io/jupyter/...` registry path.

3. **Missing markdown heading prefix on "Resource Management".** The line `Resource Management` was rendered as plain text rather than a section heading. Added the `##` prefix to match the surrounding section structure.

## Review Notes

- The `2024-01-15` tag for `quay.io/jupyter/scipy-notebook` (and the related tensorflow/r notebooks) is a date-style tag; the Jupyter Docker Stacks publish on a roughly weekly cadence and not every calendar date will exist. The exact date is illustrative — readers picking an arbitrary date should consult [https://quay.io/repository/jupyter/scipy-notebook?tab=tags](https://quay.io/repository/jupyter/scipy-notebook?tab=tags) for actual published tags.
- The Prometheus configuration block sets `hub.config.JupyterHub.authenticate_prometheus: false` and then redundantly does the same thing again via `extraConfig`. Either alone is sufficient, but having both is harmless and not technically incorrect, so it was left as-is.
- The post sets `singleuser.storage.dynamic.storageClass: local-path` (Rancher local-path) but the `### Shared Storage` section uses `longhorn` with `ReadWriteMany`. Both are valid Talos-friendly choices for different use cases (per-user vs. shared); readers should ensure the cited StorageClass(es) actually exist in their cluster.
- The `cull.maxAge: 28800` (8 hours) will terminate a running server even if actively used. Operators who want only idle culling should leave `maxAge` unset and rely on `cull.timeout` alone — this is a defensible default but worth flagging.
- `proxy.secretToken` itself remains a valid (optional) configuration field, so the removal was for clarity/currency, not because the field is invalid.
