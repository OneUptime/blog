# Validation Summary: How to Contribute to Istio Open Source Project

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Go
- Docker
- Kubernetes
- kubectl
- kind
- GitHub CLI
- Hugo

## Sources Consulted
- Istio main repository README: https://github.com/istio/istio/blob/master/README.md
- Istio contribution guidelines: https://github.com/istio/community/blob/master/CONTRIBUTING.md
- Istio CLA documentation: https://github.com/istio/community/blob/master/CLA.md
- Istio current go.mod: https://github.com/istio/istio/blob/master/go.mod
- Istio release-1.29 go.mod: https://github.com/istio/istio/blob/release-1.29/go.mod
- Istio Makefile.core.mk: https://github.com/istio/istio/blob/master/Makefile.core.mk
- Istio Docker make targets: https://github.com/istio/istio/blob/master/tools/istio-docker.mk
- Istio integration test make targets: https://github.com/istio/istio/blob/master/tests/integration/tests.mk
- Istio developer setup wiki: https://github.com/istio/istio/wiki/Preparing-for-Development
- Istio Prow/local kind testing wiki: https://github.com/istio/istio/wiki/Working-with-Prow
- Istio documentation build guide: https://istio.io/latest/docs/releases/contribute/build/
- Istio documentation contribution guide: https://istio.io/latest/docs/releases/contribute/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post listed Go 1.21+ as sufficient. Current Istio development branches require the Go version declared in `go.mod`, which is currently 1.25.x. Updated the setup note to tell readers to install the Go version required by Istio's `go.mod`.
- The post said `git commit -s` and a Signed-off-by line are required for all Istio contributions under DCO. Official Istio contributor documentation requires the CNCF Contributor License Agreement instead. Removed `-s` from the sample commit and replaced the DCO explanation with a CLA note.
- The post used `make test.integration.local`, which is not a current Istio integration-test make target. Updated the command to `make test.integration.kube`, which is defined in Istio's integration test makefile.
- The local kind workflow used `make docker.tag`, which is not a current Istio make target, and implied `localhost:5000` images would work without setting up a registry. Replaced that snippet with Istio's documented local kind integration-test script, `prow/integ-suite-kind.sh test.integration.pilot.kube`, which handles cluster setup and image loading for the test flow.
- The documentation contribution snippet included `npm install`. Current Istio documentation preview instructions use the provided Docker-based tooling and `make serve`, without a separate `npm install` prerequisite. Removed the outdated command.
- The post described the Istio community meeting as weekly. The official community page says the community meeting happens monthly, so updated the wording.

## Review Notes
The remaining commands and repository descriptions are broadly consistent with current Istio documentation. The exact Go version can change over time, so referencing `go.mod` is safer than pinning a static version in this guide.
