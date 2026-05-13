# Validation Summary: How to Integrate Flux CD with Humanitec Score Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Score specification
- score-k8s
- Flux CD Kustomization
- Kubernetes manifests and kubectl
- GitHub Actions
- GitHub Container Registry
- Kubesec

## Sources Consulted
- Score specification reference: https://docs.score.dev/docs/score-specification/score-spec-reference/
- score-k8s installation documentation: https://docs.score.dev/docs/score-implementation/score-k8s/installation/
- score-k8s CLI reference: https://docs.score.dev/docs/score-implementation/score-k8s/cli/
- score-k8s resource provisioners documentation: https://docs.score.dev/docs/score-implementation/score-k8s/resources-provisioners/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub Actions publishing Docker images documentation: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- actions/checkout README: https://github.com/actions/checkout
- Kubesec README: https://github.com/controlplaneio/kubesec

## Issues Found
- The score-k8s download URL used a non-existent `latest/download/score-k8s_linux_amd64.tar.gz` asset. Updated the examples to use the current release asset naming for score-k8s `0.13.0`.
- The Score workload used `${IMAGE_TAG}` in the container image and the CI used `--image api=...`. Current `score-k8s generate --image` supplies one image for containers whose image is `.`. Updated the workload image to `.` and the generate command to pass the full image reference.
- The provisioner example used `outputs` as a YAML map and used a Kubernetes Secret object shape directly in outputs. Current template provisioners require `outputs` to be a Go template string that evaluates to a YAML dictionary, and secret references should be encoded with `encodeSecretRef`. Updated the provisioner snippet accordingly.
- The custom provisioner file was placed under `.score-k8s`, which is also the generated score-k8s state directory and can contain sensitive state. Moved the example provisioner path to `score-k8s/provisioners.yaml`.
- The GitHub Actions workflow pushed to GHCR without registry login or `packages: write` permission and committed generated manifests without `contents: write`. Added the required permissions and GHCR login step.
- The render step wrote to `deploy/manifests.yaml` without ensuring the `deploy` directory exists. Added `mkdir -p deploy`.
- The validation step used `kubectl get -f ...`, which requires a live cluster and does not validate a freshly rendered file offline. Replaced it with a local check for a rendered Deployment.
- The best practices section referenced a non-existent `score-k8s validate` command. Updated it to use `score-k8s generate` as the CI validation/rendering gate.

## Review Notes
- Verified the corrected Score workload and provisioner snippet locally with score-k8s `0.13.0`; generation produced both a Service and Deployment manifest.
- The workflow still uses example organization, image, and source paths; teams should adapt those to their repository layout.
