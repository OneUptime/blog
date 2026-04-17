# Validation Summary: How to Deploy ClickHouse on Crossplane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Kubernetes infrastructure provisioning operator)
- Upbound AWS Provider family (provider-aws-ec2)
- Kubernetes (kubectl, Helm, CRDs)
- AWS EC2 (Instance, SecurityGroup managed resources)
- ClickHouse (installed via apt on Ubuntu/Debian)
- Crossplane Composite Resource Definitions (XRDs) and Claims

## Sources Consulted
- Crossplane official docs: https://docs.crossplane.io/
- Upbound Marketplace — provider-aws-ec2: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2
- ClickHouse install docs (Debian/Ubuntu): https://clickhouse.com/docs/install/debian_ubuntu
- Crossplane API reference for `pkg.crossplane.io/v1` Provider, `apiextensions.crossplane.io/v1` CompositeResourceDefinition
- Upbound AWS family provider API docs: `aws.upbound.io/v1beta1` ProviderConfig, `ec2.aws.upbound.io/v1beta1` SecurityGroup/Instance

## Issues Found
1. **Incorrect ClickHouse install userData.** The original EC2 `userData` ran `apt-get install -y clickhouse-server clickhouse-client` without first adding the ClickHouse APT repository. These packages are not in the default Ubuntu/Debian repos, so the install would fail with `E: Unable to locate package clickhouse-server`. Fixed by adding the steps from the official ClickHouse docs: install `apt-transport-https ca-certificates curl gnupg`, import the ClickHouse GPG key to `/usr/share/keyrings/clickhouse-keyring.gpg`, add the `https://packages.clickhouse.com/deb stable main` apt source, then `apt-get update` before installing.
2. **Non-conventional Crossplane provider tag.** The original `xpkg.upbound.io/upbound/provider-aws-ec2:v1` used a bare `v1` floating tag that is not published on the Upbound Marketplace (only full semver tags like `v1.21.2` are). Replaced with a pinned `v1.21.2` so the package resolves.

## Review Notes
- The section titled "Crossplane Composition for Reuse" defines only a `CompositeResourceDefinition` (XRD) — not a `Composition`. A full example would include a `Composition` that maps the XRD's fields to the underlying `Instance` and `SecurityGroup` managed resources. Left as-is since the user asked not to restructure or add new sections.
- The `SecurityGroup` example references `vpcIdRef: name: my-vpc`, but no VPC managed resource is defined in the post. Readers will need to provision a VPC (or supply a `vpcId` directly) for the example to reconcile.
- The AMI ID `ami-0c55b159cbfafe1f0` is illustrative; the userData assumes a Debian/Ubuntu AMI (uses `apt-get`). Readers should substitute a current Ubuntu AMI ID for their target region.
- `apiextensions.crossplane.io/v1` for XRDs is correct today but is being superseded by `v2` in Crossplane v2.x (which drops claims). For the v1.x control plane assumed in this post, `v1` is the right API.
- The Upbound `provider-aws-ec2` is a "family" provider; installing it also requires `provider-family-aws` (auto-installed as a dependency in current versions, so no manual action needed).
