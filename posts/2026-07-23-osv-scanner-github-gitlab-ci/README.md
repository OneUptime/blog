# How to Run OSV-Scanner in GitHub Actions and GitLab CI with Useful Exit Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, GitHub Actions, GitLab CI, DevSecOps, SARIF

Description: Add OSV-Scanner v2 to pull requests and scheduled pipelines without confusing findings, execution failures, and empty inventories.

---

OSV-Scanner's exit codes distinguish a vulnerability match from a broken scan. A good CI integration preserves that distinction, stores machine-readable results, and runs both change-time and scheduled scans.

The documented codes are:

| Code | Meaning |
|---|---|
| `0` | Packages found; no known vulnerabilities or findings matched |
| `1` | Packages found; vulnerabilities or findings matched |
| `1-126` | Reserved for result-related outcomes |
| `127` | General error |
| `128` | No packages found |
| `129-255` | Reserved for non-result errors |

Never configure a job as “pass unless the code is 1.” Code `128` would then turn an empty inventory into a green security check.

## Use the official GitHub reusable workflow

OSV-Scanner provides an official pull-request workflow that compares the target and feature branches and reports newly introduced vulnerabilities.

Create `.github/workflows/osv-scanner-pr.yml`:

```yaml
name: OSV-Scanner PR Scan

on:
  pull_request:
    branches: [main]
  merge_group:
    branches: [main]

permissions:
  actions: read
  contents: read
  security-events: write

jobs:
  scan-pr:
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable-pr.yml@v2.3.8
```

Pin the version intentionally and update it through normal dependency review. The official documentation currently uses `v2.3.8` in its examples.

The PR workflow is a regression gate: it focuses on vulnerabilities introduced by the branch. It does not replace a complete recurring scan because new advisories can be published for unchanged dependencies.

## Add a scheduled full scan

Create `.github/workflows/osv-scanner-scheduled.yml`:

```yaml
name: OSV-Scanner Full Scan

on:
  schedule:
    - cron: "30 12 * * 1"
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  actions: read
  contents: read
  security-events: write

jobs:
  scan:
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.3.8
    with:
      scan-args: |-
        --recursive
        ./
```

The reusable workflow uploads SARIF to GitHub code scanning by default and fails on vulnerabilities by default. Its inputs include `fail-on-vuln`, `upload-sarif`, `results-file-name`, and `scan-args`.

Do not put `--format` or output flags in `scan-args`; the reusable workflow already controls them. Grant the minimum documented permissions, including `security-events: write` when uploading SARIF.

## Use explicit files when scope matters

For a release job, avoid scanning unrelated examples or fixtures:

```yaml
jobs:
  release-scan:
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.3.8
    with:
      scan-args: |-
        --lockfile=./web/package-lock.json
        --lockfile=./worker/Cargo.lock
```

If preprocessing creates dependency data, the workflow supports downloading an artifact and scanning a custom `osv-scanner` JSON lockfile. Use the documented artifact input rather than relying on files from another job being present automatically.

## Run the official container in GitLab CI

OSV-Scanner documents that it does not currently provide prebuilt workflows for platforms other than GitHub. In GitLab, invoke the same CLI. The official image's entrypoint is the scanner binary, so clear it to run a shell script and call the binary explicitly:

```yaml
osv_scan:
  stage: test
  image:
    name: ghcr.io/google/osv-scanner:v2.3.8
    entrypoint: [""]
  script:
    - set +e
    - /osv-scanner scan source --recursive --format=json --output-file=osv-results.json .
    - scan_status=$?
    - set -e
    - |
      case "$scan_status" in
        0)
          echo "OSV scan completed with no known matches"
          ;;
        1)
          echo "OSV scan found vulnerabilities or findings"
          exit 1
          ;;
        127)
          echo "OSV-Scanner execution failed"
          exit 127
          ;;
        128)
          echo "OSV-Scanner found no packages; check the scan inputs"
          exit 128
          ;;
        *)
          echo "OSV-Scanner returned unexpected status $scan_status"
          exit "$scan_status"
          ;;
      esac
  artifacts:
    when: always
    paths:
      - osv-results.json
```

Adapt the binary path only after checking the pinned image. Preserve stderr in the job log because JSON output goes to stdout while diagnostics go to stderr.

## Design useful policy around the codes

The shell exit status is not a severity policy. Code `1` can represent one low-context match or many critical findings. Parse JSON or SARIF for routing and reporting, but preserve the original code as the scanner outcome.

Use separate messages and ownership:

- finding: security or dependency owner triages the package and advisory;
- `127`: platform owner repairs scanner execution, credentials, or I/O;
- `128`: build owner fixes missing, ignored, or unsupported inventory inputs;
- unexpected reserved code: fail closed and inspect the pinned release documentation.

Finally, require the check in branch or merge policy only after testing it against a known-safe branch, a deliberate vulnerable fixture, and an empty directory. Those three cases prove the pipeline can distinguish clean, finding, and no-inventory states.

## Official Documentation

- [OSV-Scanner GitHub Action](https://google.github.io/osv-scanner/github-action/)
- [Official OSV-Scanner Action repository](https://github.com/google/osv-scanner-action)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner usage and container image](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner v2.3.8 release container Dockerfile](https://github.com/google/osv-scanner/blob/v2.3.8/goreleaser.dockerfile)
