# Validation Summary: How to Configure just Command Runner on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- just command runner
- justfile syntax
- Rust cargo
- Snap
- Bash, Zsh, and Fish shell completions
- Node.js/TypeScript project automation
- Docker
- Go

## Sources Consulted
- just official README and manual: https://github.com/casey/just
- just settings manual: https://just.systems/man/en/settings.html
- just variables and assignments manual: https://just.systems/man/en/variables-and-assignments.html
- Snap Store page for just: https://snapcraft.io/just
- Local validation with just 1.51.0 installed from https://just.systems/install.sh

## Issues Found
- The official binary install command targeted `/usr/local/bin` without elevated permissions. Changed the command to pipe the installer into `sudo bash` so a normal Ubuntu user can write to that system directory.
- The shell completion examples appended generated completion scripts directly to shell startup files. Updated them to match the official completion locations for Bash, Zsh, and Fish, including creating the completion directories.
- The `just --show` example was described as showing the justfile, but `--show` requires a recipe argument. Changed it to `just --dump`, which outputs the justfile that would be run.

## Review Notes
- The justfile code blocks were syntax-checked with just 1.51.0. The import example was checked with placeholder imported files because the snippet intentionally references separate justfiles.
- The Snap installation command is valid for the current stable Snap Store package, although the upstream README also documents an edge-channel snap command.
