# Validation Summary: `mlrun` Missing in Iguazio Jupyter: Align Client and Cluster Versions

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Iguazio platform and Jupyter services
- MLRun Python client, server, feature store, and runtime images
- Python import discovery, distribution metadata, and subprocess execution
- IPython notebook shell commands
- pip and Conda environments

## Sources Consulted
- Iguazio Conda environment guide: https://www.iguazio.com/docs/v3.5/services/create-python-virt-env-conda/
- Iguazio support matrix: https://www.iguazio.com/docs/latest-release/cluster-mgmt/deployment/support-matrix/
- Iguazio MLRun service documentation: https://www.iguazio.com/docs/latest-release/services/app-services/mlops-services/mlops-services/
- Iguazio package installation and alignment instructions: https://www.iguazio.com/docs/latest-release/intro/introduction/#installing-and-updating-the-mlrun-python-package
- MLRun client setup, compatibility, extras, and dependency guidance: https://docs.mlrun.org/en/stable/setup-guide.html
- MLRun versioned installation guidance: https://docs.mlrun.org/en/v1.9/install.html
- MLRun function image builds: https://docs.mlrun.org/en/stable/runtimes/image-build.html
- MLRun legacy Python environment notes: https://docs.mlrun.org/en/stable/change-log/index.html
- Python distribution metadata: https://docs.python.org/3/library/importlib.metadata.html
- Python import discovery and reload behavior: https://docs.python.org/3/library/importlib.html
- Python interpreter information: https://docs.python.org/3/library/sys.html#sys.executable
- Python subprocess calls: https://docs.python.org/3/library/subprocess.html#subprocess.check_call
- pip interpreter selection and version pins: https://pip.pypa.io/en/stable/user_guide/
- IPython shell syntax: https://ipython.readthedocs.io/en/stable/interactive/tutorial.html#system-shell-commands

## Issues Found
- The diagnostic cell used `importlib.metadata` without stating its minimum Python version. This standard-library module was introduced in Python 3.8, while older Iguazio installations can use Python 3.7. Added a Python 3.8-or-newer prerequisite to the cell introduction; the MLRun release's own supported Python requirement still applies.
- The runtime verification paragraph explained image isolation but omitted the required image update when changing MLRun client versions. Added an instruction to update and rebuild runtime images with the same MLRun version before remote execution, following the official client setup guide.

## Review Notes
- Reviewed both Python code blocks and parsed them successfully with Python's AST parser. The version-pinned subprocess command uses the active interpreter and valid pip syntax; `check_call` reports installation failures through an exception.
- Confirmed the exact `!/User/align_mlrun.sh` command in Iguazio's instructions and the shell escape syntax in IPython documentation. The script is specific to platform-provided Jupyter services.
- Confirmed the distinction between service availability, local package installation, API access, and remote runtime dependencies. Metadata lookup does not import MLRun; top-level module discovery is appropriate for the initial diagnostic.
- The linked Conda guide is explicitly for Iguazio v3.5. It documents the named environments and distinguishes persistent pip installations and custom environments from nonpersistent Conda modifications to preconfigured environments. The post appropriately recommends checking persistence after restart.
- The support matrix distinguishes platform and MLRun versions. Iguazio's platform instructions require matching the installed client to the service; the broader MLRun compatibility window should not override platform-specific requirements.
- MLRun documents a two-minor-release backward compatibility window from v1.3.0 and excludes the feature store from backward compatibility. Consult documentation for the deployed release, since stable/latest-release URLs can change.
- All four technical documentation links in the original post resolved to the intended official resources. No configuration snippets or deprecated APIs required correction.
- Validation was based on official documentation and local syntax checks. No Iguazio cluster was available, so package installation, alignment script execution, authenticated API calls, remote function execution, and restart persistence were not tested live.
