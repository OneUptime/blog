# Validation Summary: How to Configure Sortable Image Tags for Flux Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Kubernetes custom resources
- Flux ImagePolicy
- Container image tagging
- Docker CLI
- Git CLI
- Unix timestamp and date-based tagging

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `flux create image policy` documentation: https://fluxcd.io/flux/cmd/flux_create_image_policy/
- Docker CLI `docker image build` documentation: https://docs.docker.com/reference/cli/docker/image/build/
- Docker CLI `docker image push` documentation: https://docs.docker.com/reference/cli/docker/image/push/
- Git `rev-parse` documentation: https://git-scm.com/docs/git-rev-parse/
- GNU Coreutils `date` documentation: https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html

## Issues Found
- The composite tag example included `main-e4f5g6h-1709740800`, but `g` and `h` are not valid hexadecimal characters and would not match the documented regex `^main-[a-f0-9]+-(?P<ts>[0-9]+)$`. Changed it to `main-e4f5a6b-1709740800`.
- The anti-pattern note for `latest` said Flux cannot detect updates. Current Flux supports digest reflection for mutable tags, including `latest`, when configured appropriately. Updated the wording to clarify that tag-based automation cannot detect changes to `latest` unless digest reflection is configured.

## Review Notes
The ImagePolicy API version, policy field names, sort orders, `filterTags.pattern`, and `filterTags.extract` usage match the current Flux documentation. The examples use `order: asc`, which is consistent with Flux examples for selecting the highest numeric or lexicographic tag. The post intentionally focuses on tag-based selection and only briefly mentions digest reflection in the corrected `latest` caveat.
