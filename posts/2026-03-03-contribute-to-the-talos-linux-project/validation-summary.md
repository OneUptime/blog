# Validation Summary: How to Contribute to the Talos Linux Project

## Status
validated

## Post Type
Guide / Tutorial — open source contribution walkthrough.

## Technologies Covered
- Talos Linux (siderolabs/talos)
- Go (toolchain, testing with stretchr/testify)
- GitHub workflow (fork/PR, branches, conventional commits, DCO)
- Makefile-driven build (talosctl, installer, kernel, iso, generate, lint, unit-tests)
- Hugo (documentation site under `website/`)
- Protocol Buffers (`make generate`)
- QEMU-based local cluster provisioning (`talosctl cluster create`)
- Sidero Labs project repositories (extensions, pkgs, tools, image-factory, sidero)

## Sources Consulted
- siderolabs/talos repository metadata, top-level directories, and Makefile (default branch `main`, current Go version 1.26, lint/unit-tests/installer/kernel/iso/generate targets confirmed): https://github.com/siderolabs/talos
- siderolabs/talos `CONTRIBUTING.md` (DCO sign-off requirement, `make conformance`): https://github.com/siderolabs/talos/blob/main/CONTRIBUTING.md
- Talos website directory layout in `release-1.7` and `main` branches (versioned dirs live directly under `website/content/`, no `docs/` segment): https://github.com/siderolabs/talos/tree/release-1.7/website/content
- siderolabs/talos `cmd/talosctl/cmd/mgmt/cluster/` source for v1.7 release branch — confirmed `--provisioner`, `--name`, `--install-image`, and `--iso-path` flags exist for that version.
- Verified existence and non-archived status of siderolabs/{talos, extensions, pkgs, tools, image-factory, sidero} via the GitHub API.
- Recent Talos commit messages (style: `type:` with optional scope, all carrying `Signed-off-by` trailers).

## Issues Found
1. **`make staticcheck` target does not exist.** The Talos Makefile only provides `make lint` (which runs go linters, vulncheck, deadcode, protobuf, and markdown checks) and `make fmt`. Replaced the bogus `make staticcheck` invocation with `make fmt` and updated the surrounding prose to describe what `make lint` actually does.
2. **Go version requirement was outdated.** The post stated "1.21+", but the current Talos `main` Makefile pins `GO_VERSION ?= 1.26`, and supported release branches use Go 1.23+. Updated to "1.23+; check the Makefile for the exact required version" so the floor matches recent supported releases without immediately rotting.
3. **Hugo documentation path was incorrect.** The post used `hugo new content/docs/v1.7/guides/my-new-guide.md`, but the Talos site does not nest versions under a `docs/` directory, and there is no plain `guides/` subdirectory — the versioned dirs (`v1.7`, `v1.8`, …) sit directly under `website/content/` and contain `talos-guides/`, `kubernetes-guides/`, `advanced/`, etc. Corrected the path to `content/v1.7/talos-guides/my-new-guide.md` with a clarifying comment.
4. **DCO sign-off requirement was missing.** Talos `CONTRIBUTING.md` requires every commit to carry a `Signed-off-by` line (`git commit --signoff`), and CI enforces this. Added an explicit callout and updated each example `git commit` invocation to use the `-s` flag.

## Review Notes
- Real-world Talos commits tend to use `type:` without a scope (e.g. `feat:`, `chore:`) rather than the `type(scope):` format used in the post's examples. Both are accepted by Conventional Commits, so the examples were left in place after adding a one-line note that the scope is optional.
- The `talosctl cluster create --provisioner qemu --iso-path …` form is correct for v1.7-era talosctl (confirmed in the `release-1.7` source), but the CLI in current `main` has been restructured into subcommands like `talosctl cluster create qemu` with new flags (`--schematic-id`, `--image-factory-url`, etc.). Since the post explicitly anchors examples to v1.7, this was left unchanged, but readers on Talos 1.13+ may need to consult `talosctl cluster create --help`.
- `CONTRIBUTING.md` also mentions `make conformance` as a required check; the post does not cover it. Not a correctness error, but worth adding in a future revision.
- The `siderolabs/sidero` repository still exists and is not archived, but Sidero Labs' bare-metal focus has shifted toward Omni and the Cluster API providers — readers exploring bare-metal contributions may want to look at sidero-controller-manager and Omni as well.
