# Validation Summary: How to Switch Between OpenTofu Versions Quickly

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- tofuenv
- asdf and the asdf-opentofu plugin
- direnv
- Debian update-alternatives
- Bash and Zsh shell aliases/scripts

## Sources Consulted
- OpenTofu `tofu version` command documentation: https://opentofu.org/docs/cli/commands/version/
- OpenTofu GitHub releases for v1.7.3, v1.8.5, v1.9.0, and v1.10.0: https://github.com/opentofu/opentofu/releases
- tofuenv README and command documentation: https://github.com/tofuutils/tofuenv
- asdf version management documentation: https://asdf-vm.com/manage/versions.html
- asdf 0.16.0 upgrade guide: https://asdf-vm.com/guide/upgrading-to-v0-16.html
- asdf-opentofu plugin README: https://github.com/virtualroot/asdf-opentofu
- direnv shell hook documentation: https://direnv.net/docs/hook.html
- direnv README behavior for `.envrc` and `direnv allow`: https://github.com/direnv/direnv
- Debian `update-alternatives` man page: https://manpages.debian.org/bookworm/dpkg/update-alternatives.1.en.html
- GNU Bash alias documentation: https://www.gnu.org/software/bash/manual/html_node/Aliases.html

## Issues Found

1. **Outdated asdf commands**: Changed `asdf global` and `asdf local` examples to current `asdf set` syntax. asdf 0.16.0 and newer removed `asdf global` and `asdf local`; `asdf set -u` writes the default version to the user's home `.tool-versions`, while `asdf set` writes a local `.tool-versions` file.

2. **Outdated asdf install-and-switch command**: Changed `asdf install opentofu 1.9.0 && asdf global opentofu 1.9.0` to `asdf install opentofu 1.9.0 && asdf set -u opentofu 1.9.0` for current asdf releases.

3. **direnv example changed global tofuenv state**: Replaced `tofuenv use $(cat .opentofu-version)` in `.envrc` with `export TOFUENV_TOFU_VERSION="$(cat .opentofu-version)"`. This matches tofuenv's documented environment override and lets direnv manage the version per directory without leaving a persistent tofuenv selection behind after changing directories.

4. **Shell reload command was bash-only**: Clarified that users should reload the relevant shell config (`~/.bashrc` for bash or `~/.zshrc` for zsh) after adding the direnv hook.

## Review Notes
- The tofuenv `use`, `install`, `latest`, and `.opentofu-version` examples match the tofuenv README.
- `tofu version` is the documented OpenTofu command for showing the installed version and may print additional platform/provider details beyond the first version line shown in the examples.
- The referenced OpenTofu versions v1.7.3, v1.8.5, v1.9.0, and v1.10.0 exist in the official OpenTofu GitHub releases.
- `tofuenv use latest` selects the latest matching installed version when one exists; tofuenv may auto-install a matching remote version if no matching local version is installed and auto-install is enabled.
- tofuenv's README points users toward `tenv` as a successor project, but the tofuenv commands used in this post remain documented.
