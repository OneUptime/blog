# Validation Summary: How to Use Docker Scout CLI Commands

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Docker
- Docker Scout CLI
- Container vulnerability scanning
- SBOM generation
- SARIF, SPDX, CycloneDX, and GitLab vulnerability report formats
- Bash scripting for CI/CD and monitoring workflows

## Sources Consulted
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- `docker scout cves` reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- `docker scout sbom` reference: https://docs.docker.com/reference/cli/docker/scout/sbom/
- Docker Scout SBOM guide: https://docs.docker.com/scout/how-tos/view-create-sboms/
- `docker scout compare` reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- `docker scout recommendations` reference: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- `docker scout policy` reference: https://docs.docker.com/reference/cli/docker/scout/policy/
- `docker scout quickview` reference: https://docs.docker.com/reference/cli/docker/scout/quickview/
- `docker scout repo` subcommand references: https://docs.docker.com/reference/cli/docker/scout/repo/enable/, https://docs.docker.com/reference/cli/docker/scout/repo/disable/, https://docs.docker.com/reference/cli/docker/scout/repo/list/
- `docker scout cache prune` reference: https://docs.docker.com/reference/cli/docker/scout/cache/prune/
- Docker Scout CLI GitHub README and install instructions: https://github.com/docker/scout-cli

## Issues Found
- The post claimed it covered every Docker Scout CLI command, but the current CLI reference includes additional subcommands such as `attestation`, `config`, `integration`, `push`, `stream`, `vex`, and `watch`. Changed the wording to "the most common Docker Scout CLI commands."
- The install command did not exactly match Docker's documented script invocation. Updated it to use `sh -s --`.
- The remote image scan example did not explicitly force registry resolution. Updated it to use the documented `registry://` prefix.
- The package type examples used `os`, but Docker Scout documents package types such as `apk`, `deb`, `rpm`, `npm`, `pypi`, and `golang`. Updated the examples to use documented package types.
- The `docker scout cves --format json` examples were invalid against current Docker documentation. Replaced them with documented `gitlab`, `sarif`, `spdx`, and `markdown` output examples.
- The SBOM analysis examples assumed an undocumented JSON shape with `.packages`. Replaced those examples with documented `--format list`, `--only-package-type`, and file-output examples.
- The `docker scout compare --format json` and related `jq` examples were invalid because current `compare` output formats are `text` and `markdown`. Replaced them with documented markdown, `--only-fixed`, and `--ignore-unchanged` examples.
- The `docker scout recommendations --format json` examples were invalid because the current command does not document a `--format` flag. Replaced them with `--output` and `--only-update`.
- The `docker scout policy --env` and `--format json` examples were invalid for current `policy` documentation. Replaced them with `--to-env` and `--output`.
- The quickview sample output mentioned policy status, which is not shown in the official quickview example. Reworded the comment to match Docker's documented summary behavior.
- The repository enable/disable examples were adjusted to the documented repository argument style.
- The cache section said `docker scout cache prune` clears the analysis cache. Current docs say it only removes temporary data by default and requires `--sboms` to prune cached SBOMs. Updated the examples accordingly.
- The Bash scripts used invalid `cves --format json` output and undocumented `jq` paths. Reworked them to use documented text/list/SARIF outputs and `--exit-code` checks.

## Review Notes
The local Docker installation in this workspace does not have the Docker Scout plugin installed, so command behavior was verified against current official Docker documentation rather than local `docker scout --help` output.
