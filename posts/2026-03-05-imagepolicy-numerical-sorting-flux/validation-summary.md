# Validation Summary: How to Configure ImagePolicy with Numerical Sorting in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Kubernetes custom resources
- ImagePolicy
- ImageRepository
- kubectl
- Flux CLI
- YAML

## Sources Consulted
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image reflector API reference: https://v2-0.docs.fluxcd.io/flux/components/image/reflector-api/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The multi-environment example included the comment `Production: latest build above 500`, but the shown `filterTags` pattern only matches `prod-<number>` tags and does not enforce a numeric threshold above 500. Changed the comment to `Production: latest production build` so the explanation matches the manifest.

## Review Notes
The ImagePolicy API version, `policy.numerical.order` field, `filterTags.pattern`, `filterTags.extract`, and named capture usage match the current Flux documentation. Flux numerical policy selects the last tag after numeric sorting, so `order: asc` selects the highest numeric value and `order: desc` selects the lowest numeric value.
