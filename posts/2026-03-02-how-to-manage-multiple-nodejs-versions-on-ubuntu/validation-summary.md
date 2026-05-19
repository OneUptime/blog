# Validation Summary: How to Manage Multiple Node.js Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Node.js
- nvm (Node Version Manager)
- fnm (Fast Node Manager)
- NodeSource Debian/Ubuntu packages
- npm
- npx
- bash / zsh shell configuration
- Ubuntu

## Sources Consulted
- nvm official repository and README — https://github.com/nvm-sh/nvm
- fnm official repository — https://github.com/Schniz/fnm
- fnm installer — https://fnm.vercel.app/install
- NodeSource distributions — https://github.com/nodesource/distributions
- npm CLI docs (npx) — https://docs.npmjs.com/cli/v10/commands/npx
- Node.js release schedule — https://nodejs.org/en/about/previous-releases

## Issues Found
1. **`npx --no-install` comment was inaccurate.** The post described `npx --no-install some-cli-tool` as "Run without caching", which is incorrect. The `--no-install` flag tells npx not to download/install the package if it isn't already available — it has nothing to do with caching. Fixed the comment to: "Only run if the package is already installed; don't fetch it".

2. **Missing `autoload -U add-zsh-hook` in the auto-switch script.** The zsh `add-zsh-hook` function is not loaded by default in vanilla zsh. Without first running `autoload -U add-zsh-hook`, calling `add-zsh-hook chpwd autoload_nvmrc` would fail on a clean zsh install. Added the autoload line inside the `if [ -n "$ZSH_VERSION" ]` block to match the canonical example from the official nvm README.

3. **Comparison table claimed nvm supports fish shell.** nvm officially supports POSIX-compliant shells (sh, bash, ksh, dash, zsh) but does not natively support fish — fish users typically need a third-party wrapper like `bass`. Updated the shell compatibility row for nvm from "bash, zsh, fish" to "bash, zsh, ksh, dash" to reflect what is officially supported.

## Review Notes
- The nvm install script URL pins to `v0.40.0`. As of 2026, `v0.40.x` is the current major; minor patches have been released, but `v0.40.0` still works and pinning to a known version is a sensible practice for tutorials.
- `create-react-app` (used as an `npx --yes` example) was officially deprecated by the React team in early 2023 in favor of Vite, Next.js, etc. The command is still functional as an illustrative `npx` example, so it was left in place, but readers should be aware CRA is no longer the recommended way to scaffold a React app.
- The NodeSource `setup_18.x` / `setup_20.x` style scripts are still maintained at deb.nodesource.com and remain valid. Node 18 reached End-of-Life in April 2025, so production deployments should generally prefer Node 20 (Active LTS) or Node 22 (LTS) by mid-2026.
- Node 16 is referenced in examples (e.g., `nvm uninstall 16.20.2`). Node 16 reached EOL in September 2023, but using it as an "old version to remove" example is appropriate.
- The `autoload_nvmrc` function only wires the `chpwd` hook for zsh; bash users won't get auto-switching on `cd`. This is a feature limitation rather than a bug and matches the official nvm documentation's split between bash and zsh examples.
