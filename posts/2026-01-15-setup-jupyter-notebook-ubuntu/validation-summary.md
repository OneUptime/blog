# Validation Summary: How to Set Up Jupyter Notebook on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Python, pip, and virtual environments
- Jupyter Notebook
- Jupyter Server
- JupyterLab
- Conda and Miniconda
- systemd
- Jupyter kernels: ipykernel, IRkernel, IJulia, bash_kernel
- JupyterHub
- jupyterhub-idle-culler
- Nginx and Let's Encrypt
- nbconvert, nbviewer, and Binder

## Sources Consulted
- Project Jupyter installation documentation: https://jupyter.org/install
- Jupyter Server configuration reference: https://jupyter-server.readthedocs.io/en/latest/other/full-config.html
- Jupyter Server security documentation: https://jupyter-server.readthedocs.io/en/latest/operators/security.html
- Jupyter Server public server documentation: https://jupyter-server.readthedocs.io/en/latest/operators/public-server.html
- Jupyter Server authentication API documentation: https://jupyter-server.readthedocs.io/en/stable/api/jupyter_server.auth.html
- Jupyter Notebook 7 feature documentation: https://jupyter-notebook.readthedocs.io/en/latest/notebook_7_features.html
- JupyterLab extension documentation: https://jupyterlab.readthedocs.io/en/latest/user/extensions.html
- JupyterLab extension development documentation: https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html
- JupyterHub quickstart documentation: https://jupyterhub.readthedocs.io/en/stable/tutorial/quickstart.html
- JupyterHub configuration reference: https://jupyterhub.readthedocs.io/en/stable/reference/config-reference.html
- JupyterHub idle-culler documentation: https://github.com/jupyterhub/jupyterhub-idle-culler
- Conda Linux installation documentation: https://docs.conda.io/projects/conda/en/stable/user-guide/install/linux.html
- IRkernel installation documentation: https://irkernel.github.io/installation/
- PEP 668 / externally managed environments: https://peps.python.org/pep-0668/

## Issues Found
- Replaced the `sudo pip3 install jupyter` system-wide pip example with a virtual environment installation using `python -m pip install notebook`, because modern Ubuntu Python installations may be externally managed and Project Jupyter documents `notebook` as the package for Jupyter Notebook.
- Updated the user install example to install `notebook`, persist `$HOME/.local/bin` in `~/.bashrc`, and warn that externally managed Ubuntu Python environments should use venv or conda instead.
- Updated Jupyter configuration examples from legacy `NotebookApp` keys and `jupyter_notebook_config.py` to current Jupyter Server configuration using `jupyter_server_config.py`, `ServerApp`, `IdentityProvider`, and `PasswordIdentityProvider`.
- Replaced `jupyter notebook password`, `notebook.auth.passwd`, and `c.NotebookApp.password` with the current Jupyter Server password command and authentication APIs.
- Fixed the systemd conda `PATH` example so it does not rely on shell-style `$PATH` expansion inside a systemd `Environment=` line, and changed the service config path to `jupyter_server_config.py`.
- Clarified that `jupyter_contrib_nbextensions` applies to legacy Notebook 6, while Notebook 7 uses JupyterLab-compatible extensions.
- Corrected the JupyterLab extension note: Node.js is only needed to build source extensions, not for typical prebuilt extensions installed with pip or conda.
- Added the missing `jupyterhub-idle-culler` installation step, imported `sys` in the JupyterHub config snippet, and replaced the older full-admin idle-culler service example with a current role/scopes-based service configuration.
- Clarified that JupyterHub `Spawner.mem_limit` and `Spawner.cpu_limit` require a spawner that supports resource limits.
- Updated later security and troubleshooting snippets from `NotebookApp`/legacy config names to current `ServerApp`, `FileContentsManager`, and `IdentityProvider` names.

## Review Notes
- The post is now technically valid for a modern Jupyter Notebook 7 / Jupyter Server 2 style setup. Some optional tools shown, such as Julia 1.10.0 and classic Notebook 6 extensions, are version-specific rather than latest-version recommendations.
