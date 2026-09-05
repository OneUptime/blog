# Validation Summary: How to Tag ko Images for Releases While Keeping Digest-Pinned Deployments

## Status
validated

## Post Type
Technical guide with release workflow commands and a Kubernetes YAML fragment.

## Technologies Covered
- ko 0.19.1 and Go container builds
- Git release tags and commit identifiers
- OCI image manifests, indexes, tags, and digests
- Kubernetes and kubectl
- Registry immutability, promotion, retention, and container signing
- Bash

## Sources Consulted
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko resolve CLI reference: https://ko.build/reference/ko_resolve/
- ko Kubernetes integration: https://ko.build/features/k8s/
- ko configuration and build metadata: https://ko.build/configuration/
- ko multi-platform images: https://ko.build/features/multi-platform/
- ko releases: https://github.com/ko-build/ko/releases
- ko 0.19.1 publisher implementation (tag selection and tag-only validation): https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- ko 0.19.1 image-reference recorder: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- ko 0.19.1 build command (standard-output references): https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- ko 0.19.1 publication flags: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/publish.go
- Git revision parsing and reference disambiguation: https://git-scm.com/docs/git-rev-parse
- Git porcelain status: https://git-scm.com/docs/git-status
- Kubernetes image names, digests, and pull policies: https://kubernetes.io/docs/concepts/containers/images/#image-names
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl set image: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Deployment rollback and revisions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment
- OCI image manifest specification: https://github.com/opencontainers/image-spec/blob/main/manifest.md
- OCI image index specification: https://github.com/opencontainers/image-spec/blob/main/image-index.md
- OCI distribution specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- crane image copying: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_copy.md
- Amazon ECR immutable tags: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html
- Sigstore container signing: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Installed Bash builtin documentation, consulted with `bash -c 'help set'`. The GNU manual URLs could not be retrieved.

## Issues Found
1. **Release checks did not stop execution on failure.** Added `set -euo pipefail` and specified a Bash script context. A failed standalone `test` otherwise permits subsequent release commands to run; a failed command substitution in the later index assignment could also be followed by writing an empty artifact.
2. **The purported Git tag check also accepted a branch.** Changed the revision expression to `git rev-parse --verify "refs/tags/$version^{commit}"`. This explicitly requires a tag and still peels annotated and lightweight tags to their commit.
3. **The resolve example could be mistaken for reuse of the earlier build.** Clarified that `ko resolve` builds and publishes again, is an alternative to the standalone build, and requires testing its emitted digest. Deploying an already tested image instead requires inserting its recorded digest into the manifests. This avoids contradicting the post's artifact-promotion guidance.
4. **The verification checklist assumed binary and OCI metadata existed.** Clarified that version/commit checks apply when metadata is configured and that `--tags` does not populate it. Application build settings and `--image-label` configure those separate values.

## Review Notes
- Confirmed the 0.19.1 publisher returns a digest-only reference for multiple tags, a tag-plus-digest reference for one non-latest tag, and rejects tag-only publication with multiple tags or latest.
- Confirmed the recorder traverses a multi-platform index and its children, while the build command prints the returned top-level reference. Choosing the last recorded line is therefore unsafe.
- Reviewed the Kubernetes YAML as a Pod-spec fragment, not a complete deployable object. The package import path, registry, deployment, namespace, and abbreviated digest examples are placeholders requiring real project values.
- All seven Bash blocks passed `bash -n`. An isolated temporary Git repository verified that the corrected release checks accept a matching lightweight tag and reject a branch-only release name and an untracked dirty file.
- No application build, registry push, signing, or cluster deployment was executed: the post supplies illustrative infrastructure and no application source or target credentials. Validation is based on official documentation, version-pinned source inspection, shell syntax checks, and the isolated Git checks.
- Server-side dry-run validates an API request without persisting it; it does not prove image availability or successful startup. A moved tag can select different content depending on pull policy and node cache state, consistent with the post's qualified wording.
- The listed official documentation links resolve to the intended resources. The release page identified 0.19.1 as latest when consulted; exact behavior was checked against that version's source.
