# Validation Summary: How to Use CodeArtifact with pip (Python)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeArtifact
- AWS CLI
- pip
- twine
- Python packaging with setuptools, setup.py, and pyproject.toml
- Poetry
- AWS CodeBuild buildspec files
- Python virtual environments

## Sources Consulted
- AWS CodeArtifact User Guide: Configure and use pip with CodeArtifact: https://docs.aws.amazon.com/codeartifact/latest/ug/python-configure-pip.html
- AWS CodeArtifact User Guide: Configure and use twine with CodeArtifact: https://docs.aws.amazon.com/codeartifact/latest/ug/python-configure-twine.html
- AWS CodeArtifact User Guide: Authentication and tokens: https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html
- AWS CodeArtifact User Guide: Using Python packages in CodeBuild: https://docs.aws.amazon.com/codeartifact/latest/ug/using-python-packages-in-codebuild.html
- AWS CodeBuild User Guide: Build specification reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- pip documentation: Configuration: https://pip.pypa.io/en/stable/topics/configuration/
- pip documentation: pip config: https://pip.pypa.io/en/stable/cli/pip_config.html
- Python Packaging User Guide: Writing your pyproject.toml: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- setuptools documentation: Configuring setuptools using pyproject.toml files: https://setuptools.pypa.io/en/latest/userguide/pyproject_config.html
- Poetry documentation: Repositories: https://python-poetry.org/docs/repositories/
- OneUptime linked CodeArtifact guide: https://oneuptime.com/blog/post/2026-02-12-aws-codeartifact-package-management/view

## Issues Found
- The `pyproject.toml` example used `build-backend = "setuptools.backends._legacy:_Backend"`, which is not the standard documented setuptools PEP 517 backend. Changed it to `build-backend = "setuptools.build_meta"` to match current Python Packaging and setuptools documentation.
- The CodeBuild buildspec examples configured CodeArtifact in `pre_build` but installed Python dependencies in the `install` phase. CodeBuild executes `install` before `pre_build`, so dependency installation could run before pip was authenticated. Moved dependency installation into `pre_build` after `aws codeartifact login`; kept runtime selection in `install`.
- The publishing buildspec ran `aws codeartifact login --tool twine` before installing `twine`. Reordered the commands so pip is authenticated first, build tools are installed, requirements are installed, and then twine is configured.
- The pip configuration path sentence treated Linux and macOS as identical. Updated it to reflect pip's documented macOS user config behavior.
- The virtual environment section said CodeArtifact login configures pip "inside the venv." AWS documents `aws codeartifact login --tool pip` as configuring pip's user config. Updated the wording to say the venv should be activated before installing and that the venv's pip reads the configured user config.

## Review Notes
- The AWS CodeArtifact pip and twine command flags, endpoint URL shapes, username `aws`, `/simple/` suffix for pip/Poetry installation sources, token lifetime description, and `.pypirc` example are consistent with AWS documentation.
- The Poetry source and publishing commands are consistent with Poetry's repository documentation. Since CodeArtifact is configured as a primary Poetry source, the linked prerequisite that the repository has a PyPI upstream connection is important for resolving public packages.
