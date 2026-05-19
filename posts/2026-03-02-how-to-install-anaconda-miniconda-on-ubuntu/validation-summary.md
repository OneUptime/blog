# Validation Summary: How to Install Anaconda/Miniconda on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu/Linux shell
- Anaconda Distribution
- Miniconda
- conda package and environment management
- conda channels and environment files
- pip in conda environments
- mamba

## Sources Consulted
- Anaconda Linux installer documentation: https://www.anaconda.com/docs/getting-started/anaconda/install/linux-install
- Anaconda silent mode installation documentation: https://www.anaconda.com/docs/getting-started/advanced-install/silent-mode
- Anaconda Miniconda documentation: https://www.anaconda.com/docs/getting-started/miniconda/main
- Anaconda Distribution overview: https://www.anaconda.com/docs/getting-started/anaconda/main
- Anaconda installer archive and SHA-256 index: https://repo.anaconda.com/archive/
- Miniconda installer archive and SHA-256 index: https://repo.anaconda.com/miniconda/
- conda Linux installation documentation: https://docs.conda.io/projects/conda/en/stable/user-guide/install/linux.html
- conda init command reference: https://docs.conda.io/projects/conda/en/stable/commands/init.html
- conda environment management documentation: https://docs.conda.io/projects/conda/en/stable/user-guide/tasks/manage-environments.html
- conda env export command reference: https://docs.conda.io/projects/conda/en/stable/commands/env/export.html
- Mamba user guide: https://mamba.readthedocs.io/en/stable/user_guide/mamba.html

## Issues Found
- The Anaconda package count and installer size were outdated. Updated the description from "250+ pre-installed packages" and "around 800 MB" to "hundreds of pre-installed packages" and "around 1.2 GB" for the current Linux x86_64 installer.
- The Miniconda installer size was outdated. Updated it from "around 80 MB" to "around 155 MB" for the current Linux x86_64 installer.
- The Anaconda download command pointed to the older `Anaconda3-2024.10-1-Linux-x86_64.sh` installer while the text instructs readers to download the latest installer. Updated it to the current official Linux x86_64 installer, `Anaconda3-2025.12-2-Linux-x86_64.sh`.
- The environment export section said `environment.yml` reproduction was exact. Adjusted the wording because current conda documentation distinguishes portable environment YAML exports from exact same-platform explicit specs and newer lockfile workflows.

## Review Notes
The `conda env export` command remains valid, but current conda documentation recommends the newer `conda export` command for modern environment exports in conda 25.7 and later. The existing command was left in place because it still works and changing the section would require broader restructuring than a technical correction.
