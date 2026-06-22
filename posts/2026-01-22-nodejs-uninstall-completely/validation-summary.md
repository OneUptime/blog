# Validation Summary: How to Uninstall Node.js Completely on Different Platforms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm and npx
- nvm and nvm-windows
- Homebrew
- Windows PowerShell
- Chocolatey
- Debian/Ubuntu apt
- NodeSource Linux repositories
- yum and dnf
- Arch Linux pacman
- macOS pkg installer cleanup

## Sources Consulted
- Node.js downloads page: https://nodejs.org/en/download
- Node.js download archive: https://nodejs.org/en/download/archive/current
- nvm official README: https://github.com/nvm-sh/nvm
- nvm-windows README and wiki: https://github.com/coreybutler/nvm-windows and https://github.com/coreybutler/nvm-windows/wiki
- npm folders documentation: https://docs.npmjs.com/cli/v8/configuring-npm/folders/
- npm config documentation for current Windows cache default: https://docs.npmjs.com/cli/v9/using-npm/config/
- Homebrew manpage: https://docs.brew.sh/Manpage
- Chocolatey uninstall command documentation: https://docs.chocolatey.org/en-us/choco/commands/uninstall/
- Debian apt-get manpage: https://manpages.debian.org/testing/apt/apt-get.8.en.html
- NodeSource distributions page and setup script: https://nodesource.com/products/distributions and https://deb.nodesource.com/setup_24.x
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- Red Hat DNF command documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_yum-commands-list_managing-software-with-the-dnf-tool
- Arch Linux pacman manpage: https://archlinux.org/pacman/pacman.8.html
- Microsoft PowerShell Remove-Item documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item

## Issues Found
- The post used `which` in shell examples. Replaced it with `command -v` because `command` is the portable shell builtin for checking command resolution in POSIX-style shells.
- The Homebrew detection command used `brew list | grep node`, which can match unrelated formula names. Changed it to `brew list --formula | grep '^node$'` to check the exact formula.
- The nvm removal steps deleted `~/.nvm` without unloading nvm from the current shell session. Added `nvm unload` where appropriate, matching the official nvm removal guidance.
- The Windows cleanup commands for npm directories could fail noisily when paths did not exist. Added `-ErrorAction SilentlyContinue` to the relevant `Remove-Item` commands.
- The Windows npm cache comments did not reflect newer npm behavior. Updated the text to note that newer npm versions use `%LocalAppData%\npm-cache`.
- The nvm-windows cleanup steps omitted the official uninstaller and environment variables. Added a note about `unins000.exe` and explicitly mentioned `NVM_HOME` and `NVM_SYMLINK`.
- The NodeSource cleanup only removed the legacy `nodesource.list` file. Added removal of `nodesource.sources` and `/usr/share/keyrings/nodesource.gpg`, which are used by the current NodeSource setup script.
- The fresh nvm install command used outdated nvm version `v0.39.0`. Updated it to `v0.40.5`, the current version shown in the official nvm README checked during validation.
- Fixed the typo `NodesSource` to `NodeSource`.

## Review Notes
The guide remains intentionally broad because uninstall paths vary by installer and platform. Some manual `rm -rf` paths are conventional for Node.js installations under `/usr/local`, but users with custom prefixes, Homebrew on Apple Silicon, or custom npm prefix/cache settings may need to inspect their actual paths first.
