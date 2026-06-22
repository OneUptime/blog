# Validation Summary: How to Install Visual Studio Code on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation and configuration walkthrough)

## Technologies Covered
- Visual Studio Code (CLI, settings.json, keybindings.json, launch.json, tasks.json)
- Ubuntu / APT package management (Snap, APT, .deb, Microsoft repository)
- GPG keyring-based APT repository signing
- VS Code extensions (Prettier, ESLint, Pylance, GitLens, Remote SSH/Containers, Docker, etc.)
- Integrated terminal profiles
- Git / GitLens integration
- Remote Development (SSH config, Dev Containers, docker-compose, Dockerfile)
- Debugging (debugpy, Node, Chrome, Go, Rust/LLDB, Docker)
- Workspace settings (single-folder, multi-root)

## Sources Consulted
- VS Code – Installing on Linux: https://code.visualstudio.com/docs/setup/linux
- VS Code – Command Line Interface: https://code.visualstudio.com/docs/configure/command-line
- Microsoft package repository index: https://packages.microsoft.com/repos/code/
- VS Code Python – Linting (deprecation of `python.linting.*`): https://code.visualstudio.com/docs/python/linting
- microsoft/vscode-python #16308 (deprecating `python.linting.enabled`): https://github.com/microsoft/vscode-python/issues/16308
- microsoft/vscode #125656 (`editor.suggest.maxVisibleSuggestions` removal): https://github.com/microsoft/vscode/issues/125656
- Debian Wiki – VisualStudioCode (apt-key deprecation / signed-by keyrings): https://wiki.debian.org/VisualStudioCode

## Issues Found
1. **Deprecated `apt-key` and legacy repository in the "Adding Microsoft Repository" script.**
   The script used `wget ... | sudo apt-key add -` together with `add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main"`. `apt-key` is deprecated and has been removed from current Ubuntu releases (24.04+), so this script would fail or emit deprecation warnings on modern systems. It also used the legacy `/repos/vscode` path instead of the official `/repos/code` used in Method 2.
   **Fix:** Rewrote the key import to dearmor the key into `/etc/apt/keyrings/packages.microsoft.gpg` and add the repository with a `signed-by=` source entry pointing at `https://packages.microsoft.com/repos/code stable main`, consistent with the modern, supported approach already shown in Method 2. Added `sudo install -m 0755 -d /etc/apt/keyrings` to ensure the keyrings directory exists and dropped the now-unneeded `software-properties-common` dependency.

2. **Removed/non-functional setting `editor.suggest.maxVisibleSuggestions`.**
   This setting (in the Performance Optimization section) was removed from the editor (Monaco) and is no longer honored by VS Code; the suggestion list is now dynamically sized. Leaving it suggests a limit that no longer takes effect.
   **Fix:** Removed the `"editor.suggest.maxVisibleSuggestions": 10` line.

## Review Notes
- **`python.linting.*` settings (Workspace Settings section):** `python.linting.enabled` and `python.linting.pylintEnabled` are deprecated in the Microsoft Python extension; built-in linting moved to standalone linter extensions (e.g. `ms-python.pylint`). They were left in place because they still produce only deprecation notices (not errors) and rewriting them to the new extension model would require adding new content beyond a technical correction. Readers on current versions should prefer the dedicated linter extensions.
- **Snap "Pros/Cons":** Snap VS Code uses `--classic` confinement, which is *not* sandboxed; listing "Sandboxed environment" as a pro is slightly misleading, but this is a minor wording point rather than a code/command error, so it was left unchanged.
- CLI flags `--max-memory` and `--prof-startup` were verified as valid VS Code command-line options.
- The Method 2 APT instructions (keyrings + `signed-by`, `/repos/code`) and the `.deb` download URL (`https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64`) are correct and current.
- Snap (`snap install code --classic`), keybindings, debug configs (debugpy/node/chrome/go/lldb), Dev Container and docker-compose snippets, and the `~/.config/Code/User/` paths were all verified as accurate.
