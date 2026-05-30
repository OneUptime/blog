# Validation Summary: How to Set Up Azure Pipelines for Python Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines tasks: UsePythonVersion@0, Cache@2, PublishTestResults@2, PublishCodeCoverageResults@2, PublishBuildArtifacts@1
- Python virtual environments
- pip requirements files
- pytest
- pytest-cov
- coverage.py
- pytest-xdist
- flake8
- mypy
- Python package builds

## Sources Consulted
- Microsoft Learn: Customize Python pipelines in Azure Pipelines - https://learn.microsoft.com/en-gb/azure/devops/pipelines/ecosystems/customize-python?view=azure-devops
- Microsoft Learn: jobs.job.strategy YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-job-strategy?view=azure-pipelines
- Microsoft Learn: Pipeline caching in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops
- Microsoft Learn: PublishTestResults@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines
- Microsoft Learn: PublishCodeCoverageResults@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-code-coverage-results-v2?view=azure-pipelines
- pytest documentation: Configuration files - https://docs.pytest.org/en/stable/reference/customize.html
- pytest-cov documentation: Configuration and command-line options - https://pytest-cov.readthedocs.io/en/stable/config.html
- pytest-xdist documentation: Running tests across multiple CPUs - https://pytest-xdist.readthedocs.io/en/latest/distribution.html
- coverage.py documentation: Configuration reference - https://coverage.readthedocs.io/en/7.14.1/config.html
- Python Packaging User Guide: Packaging Python projects - https://packaging.python.org/tutorials/packaging-projects/

## Issues Found
- The dependency caching snippet said the dependency installation step should run only when the cache was not restored, but the YAML did not set `cacheHitVar` or add a condition. Added `cacheHitVar: VENV_CACHE_RESTORED` and `condition: ne(variables.VENV_CACHE_RESTORED, 'true')` in line with Azure Pipelines Cache@2 documentation.
- The dependency caching snippet activated `.venv` during installation but did not create the virtual environment in that snippet. Added `python -m venv .venv` to the conditional installation step so it works on a cache miss.
- The package build example uses `python -m build`, but the sample `requirements-dev.txt` did not include the PyPA `build` package. Added `build>=1.0.0` under a packaging section.

## Review Notes
The main Azure Pipelines, pytest, pytest-cov, coverage.py, pytest-xdist, flake8, and mypy examples are otherwise consistent with the referenced documentation. The virtual-environment caching pattern is workable, but future revisions could also mention pip's download cache as a simpler and less fragile cache target for many Python projects.
