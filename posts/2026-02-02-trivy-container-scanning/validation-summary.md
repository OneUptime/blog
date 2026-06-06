# Validation Summary: How to Scan Container Images with Trivy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (container vulnerability scanner)
- Docker
- GitHub Actions (aquasecurity/trivy-action, github/codeql-action/upload-sarif)
- GitLab CI
- Jenkins Pipeline (Groovy)
- SARIF output format
- CVSS scoring
- Homebrew / apt package managers

## Sources Consulted
- Trivy official documentation: https://trivy.dev/latest/docs/getting-started/installation/
- Trivy filtering / ignore file documentation: https://trivy.dev/latest/docs/configuration/filtering/
- Aqua Security trivy-repo (deb): https://aquasecurity.github.io/trivy-repo/deb
- aquasecurity/trivy-action GitHub Action README
- CVSS v3 severity rating specification (FIRST.org)

## Issues Found

1. **Deprecated `apt-key` installation method** (Linux with apt section).
   - **What was wrong:** The post used `sudo apt-key add -` and an `lsb_release`-derived suite name. `apt-key` is deprecated on modern Debian/Ubuntu, and Trivy's official repo is now a single `generic` suite that should be referenced via `signed-by=` with a keyring stored in `/usr/share/keyrings/`.
   - **What I changed:** Replaced the apt-key + `$(lsb_release -sc)` commands with the modern approach: `gpg --dearmor` to write the key to `/usr/share/keyrings/trivy.gpg`, and a sources.list entry with `[signed-by=/usr/share/keyrings/trivy.gpg] ... generic main`.
   - **Why:** This matches the current official Trivy installation instructions and works on current Debian/Ubuntu releases where `apt-key` is no longer present.

2. **Wrong field name in `.trivyignore.yaml`** (Ignoring False Positives section).
   - **What was wrong:** The example used `expires: 2024-12-31`. Trivy's ignore-file schema uses `expired_at`, not `expires`. `expires` is silently ignored, so the entry would never expire.
   - **What I changed:** Renamed the field from `expires` to `expired_at`.
   - **Why:** Verified against the official Trivy filtering documentation, which lists `expired_at` as the only supported expiration field.

## Review Notes
- The post uses `aquasecurity/trivy-action@master` and `github/codeql-action/upload-sarif@v2` and `actions/cache@v3`. These still work today but pinning to a tagged release (e.g. `trivy-action@0.x.x`) and bumping to `upload-sarif@v3` / `actions/cache@v4` would be a future-proofing improvement. Not strictly incorrect, so not changed.
- The cache key `trivy-db-${{ github.run_id }}` is unique per run, meaning it will never hit on the primary key; the `restore-keys: trivy-db-` is what actually restores a cached DB. This pattern is intentional (always seed a fresh cache) and works as written.
- CVSS severity ranges in the "Severity Levels" table match the CVSS v3 specification.
- The Trivy template format example (`{{range .Results}}{{range .Vulnerabilities}}{{.VulnerabilityID}}\n{{end}}{{end}}`) matches Trivy's JSON schema field names and is valid.
- The Docker run command mounting `/var/run/docker.sock` is correct for scanning local images via the Docker daemon.
- The example output table is illustrative — the CVE IDs, package versions, and fixed versions are reasonable but not literal Trivy output. Acceptable for a tutorial.
