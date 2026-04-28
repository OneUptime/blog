# Validation Summary: NeuVector vs Prisma Cloud: Container Security Comparison

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- NeuVector (CNCF container security platform)
- Prisma Cloud (Palo Alto Networks CNAPP, formerly Twistlock)
- Kubernetes Custom Resource Definitions (CRDs)
- Bridgecrew (IaC scanning, acquired by Palo Alto Networks)
- twistcli (Prisma Cloud Compute CLI)
- NeuVector REST API

## Sources Consulted
- NeuVector CRD documentation: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector Helm CRD definitions: https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml
- SUSE Rancher NeuVector docs: https://documentation.suse.com/cloudnative/security/5.4/en/usingcrd.html
- Palo Alto Prisma Cloud / twistcli documentation
- CNCF NeuVector project page (donation by SUSE in 2022)

## Issues Found
1. **NeuVector CRD `spec.selector` should be `spec.target.selector`** — the `NvClusterSecurityRule` schema requires a `target` wrapper around the `selector` (which can also hold `policymode`). Wrapped the selector in a `target` block.
2. **Criteria key `namespace` is not valid in NeuVector** — NeuVector uses `domain` to refer to a Kubernetes namespace in `criteria.key`. Changed `key: namespace` to `key: domain`.
3. **Ingress rule missing required `name` field** — each ingress/egress rule in a NeuVector security rule requires a unique `name`. Added `name: allow-app-tier` to the ingress entry.

## Review Notes
- Historical attribution is accurate: Twistlock was acquired by Palo Alto Networks in 2019; Bridgecrew was acquired in 2021; NeuVector was open-sourced and donated to the CNCF by SUSE in 2022 under Apache 2.0.
- The default NeuVector controller REST API port `10443` and the `/v1/compliance/asset` endpoint are correct.
- The `twistcli images scan` command and its `--address`, `--user`, `--password`, `--details` flags are valid in current Prisma Cloud Compute.
- Prisma Cloud's Bridgecrew-based IaC features have since been rebranded as Prisma Cloud "Code Security" / "Application Security"; the post's reference to "Bridgecrew" remains technically accurate as the underlying product origin and was left unchanged.
- "Air-gap support" for Prisma Cloud is described as "Limited" — this is a reasonable characterization for the SaaS tier; the Compute (self-hosted) edition does support air-gapped deployments. Left unchanged as the comparison is at platform level.
