# Validation Summary: How to Use the -exclude Flag Introduced in OpenTofu 1.9

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu 1.9
- OpenTofu CLI
- Infrastructure as Code

## Sources Consulted
- OpenTofu 1.9 `tofu plan` documentation: https://opentofu.org/docs/v1.9/cli/commands/plan/
- OpenTofu 1.9 `tofu apply` documentation: https://opentofu.org/docs/v1.9/cli/commands/apply/
- OpenTofu 1.9 release notes / what's new: https://opentofu.org/docs/v1.9/intro/whats-new/
- OpenTofu resource addressing documentation: https://opentofu.org/docs/cli/state/resource-addressing/

## Issues Found
- The post described `-exclude` as processing "everything except" the named resource. The official `tofu plan` documentation is more specific: OpenTofu excludes the named resource or module and anything that depends on it. I updated the introduction, examples, comparison table, and summary to reflect that documented behavior.
- The post incorrectly stated that `-exclude` and `-target` can be used together. OpenTofu documents these targeting modes as mutually exclusive, so I replaced that section with correct guidance and valid separate examples.
- One example comment said a later `-target` run would apply the resource "in isolation." I corrected that wording because `-target` includes dependencies, not just the named address alone.
- The original post did not mention the official caution that resource targeting is intended for exceptional circumstances. I added that caveat to the introduction and summary to align the guidance with the OpenTofu documentation.

## Review Notes
- OpenTofu 1.9 did introduce the `-exclude` flag, as confirmed in the official 1.9 release notes.
- The OpenTofu documentation recommends using `-exclude` only in exceptional circumstances rather than routine workflows, because resource targeting can lead to drift or operational confusion.
