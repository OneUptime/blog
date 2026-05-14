# Validation Summary: How to Automate Calico ImageSet Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes ImageSet custom resources
- Private container registries
- crane / go-containerregistry
- GitHub Actions
- Flux Kustomization
- kubectl
- Bash

## Sources Consulted
- Calico documentation: Install images by registry digest: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico documentation: Component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- go-containerregistry crane command reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md
- go-containerregistry crane auth login reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_auth_login.md
- go-containerregistry crane copy reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_copy.md
- go-containerregistry crane digest reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md
- GitHub Actions workflow_dispatch documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The mirror script used `docker.io/calico/*` image sources and treated `quay.io/tigera/operator:${CALICO_VERSION}` as a valid operator image. Current Calico documentation uses `quay.io/calico/*` for Calico images, and the Tigera operator uses a separate `v1.x` image tag, such as `quay.io/tigera/operator:v1.42.0` for Calico v3.32.0. Updated the script to use current source registries and a separate `OPERATOR_IMAGE`.
- The generated ImageSet omitted images that may be deployed by the operator, including `node-windows` and `key-cert-provisioner`. Added these entries so the ImageSet better matches the official ImageSet guidance that all operator-deployed images must be specified.
- The script hardcoded ImageSet image names independently of the mirror list. Updated the digest file to carry the ImageSet image key with each digest, reducing the chance that source image changes produce incorrect ImageSet entries.
- The GitHub Actions workflow used `github.event.inputs.calico_version` directly. On scheduled runs there are no manual dispatch inputs, so the commit message could be empty even though the shell script defaulted internally. Added job-level `CALICO_VERSION` and `OPERATOR_IMAGE` defaults using the `inputs` context.
- The validation command used `kubectl describe installation default | grep -A5 "Image"`, which is not the documented way to verify the selected ImageSet. Replaced it with `kubectl get installation default -o yaml | grep imageSet`, matching Calico's documented verification flow.
- The prerequisites did not state that the operator Installation must already be configured to pull from the private registry or image path. Added that prerequisite because ImageSet supplies digests but does not by itself configure private registry location.

## Review Notes
- The examples now default to Calico v3.32.0 and `quay.io/tigera/operator:v1.42.0`, matching the current Calico documentation reviewed on 2026-05-14. For other Calico releases, the operator image should be set to the matching operator image for that release.
- The image list should still be reviewed against `operator --print-images=list` for non-default installations or clusters using optional components.
