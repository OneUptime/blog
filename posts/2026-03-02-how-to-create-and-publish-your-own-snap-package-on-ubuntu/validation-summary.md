# Validation Summary: How to Create and Publish Your Own Snap Package on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- snapd
- Snap packages
- Snapcraft
- Snap Store publishing
- LXD
- Multipass
- Python packaging
- GitHub Actions

## Sources Consulted
- Snapcraft set up documentation: https://documentation.ubuntu.com/snapcraft/latest/how-to/set-up-snapcraft/
- Snapcraft build provider documentation: https://documentation.ubuntu.com/snapcraft/8.9.1/how-to/setup/select-a-build-provider/
- Snapcraft `snapcraft.yaml` reference: https://documentation.ubuntu.com/snapcraft/latest/reference/project-file/snapcraft-yaml/
- Snapcraft Python plugin reference: https://documentation.ubuntu.com/snapcraft/latest/reference/plugins/python_plugin/
- Snapcraft command reference: https://documentation.ubuntu.com/snapcraft/latest/reference/commands/
- Snapcraft publish documentation: https://documentation.ubuntu.com/snapcraft/latest/how-to/publishing/publish-a-snap/
- Snapcraft register documentation: https://documentation.ubuntu.com/snapcraft/latest/how-to/publishing/register-a-snap/
- Snapcraft `release` command reference: https://documentation.ubuntu.com/snapcraft/latest/reference/commands/release/
- Snapcraft authentication documentation: https://documentation.ubuntu.com/snapcraft/stable/how-to/publishing/authenticate/
- Snap `home` interface documentation: https://snapcraft.io/docs/home-interface
- Snapcraft desktop entry and icon documentation: https://documentation.ubuntu.com/snapcraft/8.9.0/how-to/crafting/configure-package-information/
- Canonical GitHub Action repositories: https://github.com/canonical/action-build and https://github.com/canonical/action-publish

## Issues Found
- The post said Multipass is the default build provider on Ubuntu. For `core22` and newer bases, LXD is the default on Linux. Updated the prerequisite text and install commands to reflect LXD as the Linux default and Multipass as an alternative.
- The Python example used the Python plugin but did not include Python project metadata, so the declared `bin/myapp` command would not be generated. Added a minimal `pyproject.toml` with a console script entry point and updated the app command to `bin/my-hello-app`.
- The example listed `python-packages: requests` even though the application did not use it. Removed the unused dependency from the main example.
- The build command used bare `snapcraft`. Updated it to `snapcraft pack`, matching current Snapcraft lifecycle documentation.
- The `home` interface comment described broad home directory access. Updated it to specify access to non-hidden files in the user's home directory.
- The snap name rule omitted that names must contain at least one letter and must not start or end with a hyphen. Updated the wording to match the Snapcraft name requirements.
- The GitHub Actions workflow used the old `snapcore` action repositories. Updated the workflow to use the current `canonical/action-build@v1` and `canonical/action-publish@v1` repositories.

## Review Notes
The local environment did not have `snapcraft` installed, so CLI behavior was checked against official Snapcraft documentation and current Canonical GitHub Action repositories rather than local `--help` output.
