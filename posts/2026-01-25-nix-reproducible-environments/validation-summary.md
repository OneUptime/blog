# Validation Summary: How to Configure Nix for Reproducible Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nix package manager
- Nix flakes
- nix-shell and mkShell development shells
- direnv
- Nixpkgs
- GitHub Actions
- Cachix
- Node.js, Python, PostgreSQL, Redis, Rust, Go, Terraform, AWS CLI, kubectl

## Sources Consulted
- Nix install documentation: https://nix.dev/install-nix.html
- Nix download page: https://nixos.org/download/
- Nix flakes concept documentation: https://nix.dev/concepts/flakes.html
- Nix flake reference manual: https://nix.dev/manual/nix/2.24/command-ref/new-cli/nix3-flake
- nix flake update reference: https://nix.dev/manual/nix/2.25/command-ref/new-cli/nix3-flake-update
- nix develop reference: https://nix.dev/manual/nix/2.18/command-ref/new-cli/nix3-develop
- Nix declarative shell tutorial: https://nix.dev/tutorials/first-steps/declarative-shell.html
- direnv stdlib documentation for `use flake`: https://direnv.net/man/direnv-stdlib.1.html
- NixOS 26.05 release announcement and support window: https://nixos.org/blog/announcements/2026/nixos-2605/
- NixOS / Nixpkgs release notes: https://nixos.org/manual/nixos/stable/release-notes
- Nixpkgs 26.05 package evaluation via official `nixos/nix` Docker image and `github:NixOS/nixpkgs/nixos-26.05`
- cachix/install-nix-action documentation: https://github.com/cachix/install-nix-action
- cachix/cachix-action documentation: https://github.com/cachix/cachix-action
- Node.js release status: https://nodejs.org/en/about/previous-releases
- Go 1.25 release notes: https://go.dev/doc/go1.25

## Issues Found
- Updated overbroad reproducibility claims. The original text promised "perfectly" reproducible environments, "forever" eliminating conflicts, and bit-for-bit identical environments. I changed this to describe consistent, locked package inputs and store paths on the same platform, which matches Nix's documented behavior more accurately.
- Replaced the installer command with the current documented Nix installer commands. The Linux multi-user command now uses `curl --proto '=https' --tlsv1.2 -L ... | sh -s -- --daemon`, and the macOS command is shown separately.
- Updated flake inputs from `nixos-24.05` to `nixos-26.05`, since 24.05 is no longer a current supported Nixpkgs branch and 26.05 is the current stable release on the validation date.
- Corrected the explanation of `flake.lock`. It pins the flake input graph, not literally every individual package dependency as a separate lock entry.
- Updated package attributes for the current stable Nixpkgs branch: `nodejs_20` to `nodejs_24`, `postgresql_15` to `postgresql_17`, and `go_1_22` to `go_1_25`.
- Replaced removed/erroring `pkgs.nodePackages.*` references with current top-level package attributes: `pkgs.typescript`, `pkgs.typescript-language-server`, `pkgs.eslint`, and `pkgs.prettier`.
- Clarified direnv shell hook setup by showing separate Bash and Zsh commands.
- Updated GitHub Actions examples to current major versions: `cachix/install-nix-action@v31` and `cachix/cachix-action@v17`.

## Review Notes
The flake snippets were parsed and evaluated with the official `nixos/nix` Docker image against `github:NixOS/nixpkgs/nixos-26.05`. Evaluation checked that the development shell outputs and package attributes resolve without building the full environments.
