# Validation Summary: Building and Publishing a Custom Devfile Registry with CI Validation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Devfile schema 2.3.0
- Devfile registries and OCI artifacts
- Devfile registry-support build tools
- GitHub Actions
- Go
- Docker and container registries
- Kubernetes, the Devfile Registry Operator, and Helm
- Bash, jq, yq, and curl
- odo v3
- Software supply-chain controls, image digests, SBOMs, signatures, and provenance

## Sources Consulted
- [Understanding a Devfile registry](https://devfile.io/docs/2.3.0/understanding-a-devfile-registry)
- [Building a custom Devfile registry](https://devfile.io/docs/2.3.0/building-a-custom-devfile-registry)
- [Deploying a Devfile registry](https://devfile.io/docs/2.3.0/deploying-a-devfile-registry)
- [Adding a registry schema](https://devfile.io/docs/2.3.0/adding-a-registry-schema)
- [Adding a stack.yaml file](https://devfile.io/docs/2.3.0/adding-a-stack-yaml-file)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3.0 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Referring to a parent Devfile](https://devfile.io/docs/2.3.0/referring-to-a-parent-devfile)
- [Devfile registry-support v1.3.0 build tools](https://github.com/devfile/registry-support/tree/v1.3.0/build-tools), including its build script, Dockerfile, index generator, OpenAPI specification, and server implementation
- [Official registry last-modified metadata generator](https://github.com/devfile/registry/blob/main/.ci/generate_last_mod_file.sh) and [registry build Dockerfile](https://github.com/devfile/registry/blob/main/.ci/Dockerfile)
- [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [actions/setup-go v7.0.0 release](https://github.com/actions/setup-go/releases/tag/v7.0.0)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub-hosted Ubuntu runner software](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
- [Docker create](https://docs.docker.com/reference/cli/docker/container/create/), [Docker cp](https://docs.docker.com/reference/cli/docker/container/cp/), [Docker tag](https://docs.docker.com/reference/cli/docker/image/tag/), and [Docker push](https://docs.docker.com/reference/cli/docker/image/push/) references
- [jq 1.6 manual](https://jqlang.org/manual/v1.6/)
- [yq evaluate command](https://mikefarah.gitbook.io/yq/commands/evaluate)
- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [Archived odo repository](https://github.com/redhat-developer/odo)

## Issues Found
- The original repository layout and CI instructions omitted `last_modified.json`. Registry-support v1.3.0 unconditionally reads this file while generating the index, so `build_image.sh` fails if it is absent. The README now lists the file in the repository tree and explains that it must contain `stacks` and `samples` metadata with RFC 3339 timestamps, using `undefined` as the version key for an unversioned entry. It also notes that the official registry generates the file from Git history before invoking the build tools.

## Review Notes
- The post was reviewed against the version-specific Devfile 2.3.0 documentation and the source of registry-support v1.3.0. The release's documented requirements are Go 1.24.x or newer, Docker 17.05 or newer, Git, and yq 4.x.
- The `build_image.sh` invocation, generated `devfile-index` image name, `/registry/index.json` extraction path, registry API routes, jq expression, yq exit-status check, and Docker publication commands are valid.
- The GitHub Actions examples use the current `actions/checkout@v7` and `actions/setup-go@v7` major releases as of the validation date. The post appropriately recommends immutable commit SHAs for stricter supply-chain policies.
- GitHub's repository metadata confirms that odo was archived on April 1, 2026. The odo documentation identifies Devfile 2.2.0 as its supported reference, and the official deprecation announcement is dated October 23, 2025.
- All external URLs in the post returned successful HTTP responses during validation.
- The registry-support Dockerfile still inherits from the mutable `quay.io/devfile/devfile-index-base:next` tag. The post already calls out the resulting reproducibility risk and recommends recording the resolved digest.
