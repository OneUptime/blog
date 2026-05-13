# Validation Summary: How to Configure ImagePolicy to Ignore Specific Tags in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImagePolicy
- Kubernetes custom resources
- Go/RE2 regular expressions
- kubectl

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image Reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Go regexp package documentation: https://go.dev/pkg/regexp/
- RE2 syntax reference: https://github.com/google/re2/wiki/Syntax

## Issues Found
- The post used negative lookahead expressions such as `(?!debug-)`, `(?!latest$)`, and `(?!.*-dirty$)` in `filterTags.pattern`. Flux tag filters use Go/RE2 regular expression syntax, and RE2 does not support lookahead assertions. I replaced those examples with positive allow-list patterns that achieve the same practical exclusion behavior.
- The post recommended checking `.status.latestImage`. In the current Flux v1 ImagePolicy API, the selected image is reported in `.status.latestRef`; `latestImage` is deprecated in older API references. I updated the command to read `.status.latestRef.image` and `.status.latestRef.tag`.
- The conclusion suggested negative lookaheads as a valid option for Flux ImagePolicy filtering. I removed that recommendation because it is not compatible with Flux's regex engine.

## Review Notes
The corrected examples use strict positive patterns, which are the most reliable way to ignore unwanted tags in Flux. Arbitrary "exclude only these strings" matching is not generally expressible with a single RE2 lookahead-style regex; users should define the allowed tag formats instead.
