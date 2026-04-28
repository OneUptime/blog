# OpenTofu Community and Governance Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Community, Governance, Linux Foundation, Open Source, Infrastructure as Code

Description: Learn how OpenTofu is governed - the Linux Foundation stewardship, steering committee, RFC process, and how the community contributes to the project's direction and development.

## Introduction

OpenTofu is a community-driven project under the Linux Foundation. Unlike Terraform, which is controlled by a single company (HashiCorp/IBM), OpenTofu has a multi-stakeholder governance model designed to prevent any single organization from controlling the project's direction.

## Project Structure

```hcl
OpenTofu Project
├── Linux Foundation (legal/fiscal home)
│   └── OpenTofu Steering Committee (governance)
│       ├── Core Maintainers (code review, releases)
│       ├── RFC Process (new features)
│       └── Community Contributors (PRs, issues, docs)
```

## The Steering Committee

The OpenTofu Steering Committee governs the project:

- Composed of representatives from companies and individual contributors
- Makes decisions about project direction, releases, and governance changes
- Meets regularly and publishes meeting notes publicly
- Cannot be controlled by any single company (Linux Foundation ensures neutrality)

Current steering committee members represent organizations including Gruntwork, Spacelift, env0, Harness, Scalr, and the broader community.

## RFC Process: How Features Are Added

New features go through a public RFC (Request for Comments) process:

```hcl
1. Community member identifies a need
   └── Discusses in GitHub issues or OpenTofu Slack

2. RFC author drafts a proposal
   └── Folder: github.com/opentofu/opentofu/tree/main/rfc/
       (RFC files use date-based naming: YYYYMMDD-feature-name.md)

3. Community review period (2+ weeks)
   └── Comments, suggestions, alternative approaches

4. Core maintainers evaluate and decide
   └── Accept / Request changes / Decline

5. Implementation begins
   └── PR submitted against main branch

6. Code review by core maintainers
   └── Testing, security review, documentation

7. Feature released in next minor/major version
```

Example RFCs that became features:
- Client-side state encryption (became OpenTofu 1.7)
- `for_each` in provider configuration blocks (became OpenTofu 1.9)
- Ephemeral resources and write-only attributes (became OpenTofu 1.11)

## Contributing to OpenTofu

```bash
# Set up development environment

git clone https://github.com/opentofu/opentofu.git
cd opentofu

# Install Go (see go.mod for the current required version, e.g. 1.26+)
go version

# Build OpenTofu from source
go build ./cmd/tofu/

# Run the test suite
go test ./...

# Run a specific package's tests
go test ./internal/command/... -v
```

## Community Channels

```text
GitHub:  github.com/opentofu/opentofu
         - Issues: bug reports and feature requests
         - Discussions: design discussions
         - PRs: code contributions

Slack:   #opentofu channel on the CNCF Slack workspace
         - Invite: opentofu.org/slack
         - Used for community support, dev discussion, and announcements

Website: opentofu.org
         - Docs, registry, blog

Public meetings:
         - Community Meeting: weekly, Wednesdays at 12:30 UTC
         - Technical Steering Committee: every other Tuesday at 4pm UTC
         - Agendas and notes: github.com/opentofu/org/tree/main/TSC
```

## Release Cadence

```text
Major versions (x.0.0): Breaking changes, every 12-18 months
Minor versions (1.x.0):  New features, every 3-4 months
Patch versions (1.x.x):  Bug fixes, as needed

Support policy:
  - Latest minor version: Active development
  - Previous minor version: Security fixes for 6 months
```

## OpenTofu Registry Governance

The OpenTofu Registry (`registry.opentofu.org`) is separately governed:

```text
Policy:
- Mirrors all providers from registry.terraform.io
- Accepts community-submitted providers directly
- Providers verified via GPG signing
- Source code must be publicly accessible

Registry repository:
github.com/opentofu/registry
```

## Security Disclosure

```text
Security vulnerabilities in OpenTofu:
  Report via GitHub Private Vulnerability Reporting:
  https://github.com/opentofu/opentofu/security/advisories/new

  Full policy: https://github.com/opentofu/opentofu/security/policy

Response process (handled by the Product Security Team):
  - Acknowledgment email after report is received
  - Triage, fix, and coordinated disclosure
  - CVE coordination handled by the PST

Bug bounty:
  - No formal bug bounty program (community project)
  - Security researchers credited in release notes
```

## How to Get Involved

```bash
# 1. Start with "good first issue" labels
# https://github.com/opentofu/opentofu/labels/good%20first%20issue

# 2. Review open RFCs and comment
# https://github.com/opentofu/opentofu/tree/main/rfc

# 3. Improve documentation
# https://github.com/opentofu/opentofu.org

# 4. Help with community support
# Answer questions in GitHub Discussions and Slack

# 5. Test pre-release versions
# Download alpha/beta/rc builds from the GitHub releases page:
# https://github.com/opentofu/opentofu/releases
# Or try nightly builds: https://nightlies.opentofu.org/nightlies
# Report issues at github.com/opentofu/opentofu/issues
```

## Conclusion

OpenTofu's governance under the Linux Foundation ensures the project remains truly open source and community-driven. The steering committee's multi-stakeholder composition prevents any single company from controlling the project. The public RFC process for new features gives the community visibility and input into the project's direction. For organizations concerned about vendor lock-in or licensing risk, OpenTofu's governance model provides stronger guarantees than a single-company controlled project.
