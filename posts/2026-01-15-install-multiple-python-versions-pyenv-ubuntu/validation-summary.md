# Validation Summary: How to Install Multiple Python Versions on Ubuntu with pyenv

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pyenv (Python version manager)
- pyenv-virtualenv
- pyenv-installer (pyenv.run)
- Python (CPython)
- pip / pipx
- Ubuntu (apt, build-essential and build dependencies)
- Bash / Zsh shell configuration

## Sources Consulted
- pyenv official repository and README — https://github.com/pyenv/pyenv
- pyenv-installer repository (pyenv.run) — https://github.com/pyenv/pyenv-installer
- pyenv wiki: Suggested build environment (Ubuntu build dependencies) — https://github.com/pyenv/pyenv/wiki#suggested-build-environment

## Issues Found
No technical issues found.

All commands and claims were verified against official documentation:
- `curl https://pyenv.run | bash` and the listed installed components (pyenv, pyenv-virtualenv, pyenv-update) are accurate.
- The Ubuntu build dependency package list matches the pyenv wiki's suggested build environment.
- The manual install steps (`git clone https://github.com/pyenv/pyenv.git ~/.pyenv` and the optional `src/configure && make -C src`) are correct.
- Shell configuration (`PYENV_ROOT`, PATH export, `eval "$(pyenv init -)"`, `eval "$(pyenv virtualenv-init -)"`) is functional and correct.
- Version-management subcommands (`install`, `install --list`, `versions`, `version`, `global`, `local`, `shell`, `shell --unset`) are correct.
- Virtual environment subcommands (`virtualenv`, `virtualenvs`, `activate`, `deactivate`, `virtualenv-delete`) are correct, including the form `pyenv virtualenv <name>` that uses the current active Python version.
- Utility commands (`update`, `uninstall`, `rehash`, `prefix`, `which`) are correct.
- `PYTHON_CONFIGURE_OPTS` examples (`--enable-optimizations`, `--with-openssl=/usr`) are valid build options.
- pip/pipx usage and the lazy-loading shell function are valid.

## Review Notes
- The post uses the generic shell init form `eval "$(pyenv init -)"`. This remains valid and functional. The current pyenv README recommends the shell-specific form (`eval "$(pyenv init - bash)"` / `eval "$(pyenv init - zsh)"`) and the conditional `[[ -d $PYENV_ROOT/bin ]] && export PATH=...` purely for faster shell startup. The post's `command -v pyenv >/dev/null || export PATH=...` snippet is an older but still-working recommended form. Neither is incorrect, so no change was made.
- Specific Python patch versions (3.12.1, 3.11.7, 3.10.13, 3.8.18, 3.9.18) are used as examples. These exist, though newer patch releases are available; the post appropriately notes "or latest 3.12.x", so this is not an error.
- Python 2.7 is mentioned as installable side-by-side, which pyenv still supports, though Python 2 is end-of-life — a minor caveat readers should be aware of.
