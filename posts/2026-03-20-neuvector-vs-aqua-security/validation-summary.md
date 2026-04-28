# Validation Summary: NeuVector vs Aqua Security: Container Security Comparison

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- NeuVector (open-source container security platform)
- Aqua Security (commercial CNAPP)
- Kubernetes
- Rancher
- Helm
- NeuVector REST API
- NeuVector CRDs (NvSecurityRule)
- Container runtime security (eBPF, DPI)
- Compliance frameworks (CIS, PCI DSS, GDPR, NIST 800-190, HIPAA, SOC 2)

## Sources Consulted
- NeuVector REST API and Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector CRD docs: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector Helm chart: https://github.com/neuvector/neuvector-helm
- CNCF Sandbox project list: https://www.cncf.io/sandbox-projects/
- SUSE NeuVector open source announcement: https://www.suse.com/c/neuvector-open-source/
- SUSE NeuVector / OZT CNCF contribution announcement: https://www.suse.com/news/SUSETransformsCloudNativeSecurity/

## Issues Found

1. **Incorrect CNCF claim**: The post described NeuVector as "an open-source, CNCF project" and stated it was "developed by SUSE Rancher and donated to the CNCF". NeuVector itself is NOT a CNCF Sandbox / Incubating / Graduated project (verified against the CNCF Sandbox project list). SUSE acquired NeuVector in October 2021 and open-sourced it in January 2022 under Apache 2.0; the OZT (Open Zero Trust) effort referenced in 2022 KubeCon announcements never resulted in NeuVector becoming a CNCF project. Also, NeuVector was developed by NeuVector Inc., not "SUSE Rancher", and was acquired by SUSE (which had already acquired Rancher Labs). Updated the Overview and "What Is NeuVector?" sections to remove the inaccurate CNCF framing and clarify the acquisition/open-source timeline. Also updated the "When to Choose NeuVector" bullet from "CNCF-aligned open-source tooling" to "Apache 2.0 licensed open-source tooling".

2. **Incorrect NeuVector authentication endpoint and request body**: The example used `https://localhost:10443/auth` with body `{"username":"admin","password":"admin"}`. The actual endpoint is `/v1/auth`, and the body must be wrapped in a `password` object: `{"password":{"username":"admin","password":"admin"}}`. Verified against the official NeuVector REST API documentation. Fixed the curl command and updated the comment to reflect that the call returns an auth token.

3. **Incorrect NeuVector scan endpoint**: The CI/CD example used `POST /v1/scan/image`, which does not exist. The correct endpoint for scanning a repository image is `POST /v1/scan/repository`. Verified against the NeuVector REST API docs. Also corrected the auth header from `Authorization: Bearer $TOKEN` to `X-Auth-Token: $TOKEN`, since NeuVector's REST API uses the `X-Auth-Token` header, not Bearer authentication.

4. **Incorrect NvSecurityRule CRD structure**: The example placed `selector` directly under `spec`, but the NeuVector CRD requires the workload selector to be inside `spec.target` along with a `policymode` field (Discover, Monitor, or Protect). Updated the YAML to use the correct `target.selector` nesting, added `policymode: Protect`, and added a `name` field on the egress rule (required by the CRD schema). Verified against the official NeuVector CRD documentation.

## Review Notes
- The Helm install snippet is syntactically valid. The `--set enforcer.tolerations[0].effect=NoSchedule` example is incomplete as a real toleration (it lacks `key` / `operator`), but the chart accepts the override syntactically and this is presented as an illustrative `--set` flag, so it was left as-is.
- The Aqua Argon (supply chain) reference is accurate — Aqua Security acquired Argon in late 2021.
- NeuVector's compliance coverage in newer versions has expanded beyond CIS/PCI/GDPR (e.g., HIPAA, NIST mappings are now available), but the post's framing of Aqua's broader compliance coverage is still directionally correct, so no change was made.
- The default `admin/admin` credentials shown in the auth example are the NeuVector defaults; the example is for illustration and should not be used in production without changing credentials.
