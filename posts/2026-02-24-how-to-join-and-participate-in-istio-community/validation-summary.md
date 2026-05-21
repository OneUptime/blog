# Validation Summary: How to Join and Participate in Istio Community

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Service mesh
- Git and GitHub
- Go
- Docker
- kubectl
- kind

## Sources Consulted
- Istio Get involved page: https://istio.io/latest/get-involved/
- Istio Community repository README: https://github.com/istio/community
- Istio Working Groups: https://github.com/istio/community/blob/master/WORKING-GROUPS.md
- Istio Community Roles: https://github.com/istio/community/blob/master/ROLES.md
- Istio Technical Oversight Committee: https://github.com/istio/community/blob/master/TECH-OVERSIGHT-COMMITTEE.md
- Istio Contributing guide: https://github.com/istio/community/blob/master/CONTRIBUTING.md
- Istio security vulnerability reporting: https://istio.io/latest/docs/releases/security-vulnerabilities/
- Istio documentation contribution guide: https://istio.io/latest/docs/releases/contribute/github/
- Istio website local build guide: https://istio.io/latest/docs/releases/contribute/build/
- CNCF Istio project page: https://www.cncf.io/projects/istio/
- Istio repository Makefile and go.mod: https://github.com/istio/istio

## Issues Found
- The community structure described the TOC as handling overall governance and included SIGs. Updated this to include the Steering Committee for governance and advocacy, the TOC for technical direction and planning, and current Istio community roles.
- The community page URL used an older redirected path. Updated it to `istio.io/latest/get-involved/` and referenced the `istio/community` repository.
- The Slack instructions pointed to CNCF Slack and stale channel names. Updated them to `slack.istio.io` and current Istio Slack channels such as `#contributors`, `#networking`, and `#security`.
- The mailing list section listed outdated user/developer mailing lists and an incorrect security reporting address. Updated it to GitHub Discussions, the shared-drive Google Group, and the official `istio-security-vulnerability-reports@googlegroups.com` address.
- The meeting cadence said working groups meet weekly or biweekly. Updated this to reflect the current monthly community meeting and shared weekly working group meeting.
- The development prerequisites referenced a `.go-version` file that is not present in the current Istio repository. Updated the note to use the `go` directive in `go.mod`.
- The working group table listed outdated group names and biweekly cadences. Updated it to current working groups and the shared weekly cadence.
- The answering-questions section still referred to mailing lists. Updated it to GitHub Discussions.
- The community role progression used generic reviewer/member wording. Updated it to match current Istio roles more closely, including organization member, documentation reviewer, and maintainer sponsorship.

## Review Notes
The Make targets `make build`, `make test`, `make lint`, and the docs-site `make serve` target are present in the current repositories. The post is a practical overview and does not pin an Istio release, so development prerequisites should be treated as current-branch guidance rather than version-specific setup instructions.
