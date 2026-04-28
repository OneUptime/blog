# Validation Summary: How to Set Up Runtime Container Security with NeuVector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (runtime container security platform)
- Kubernetes (DaemonSet, kubectl)
- NeuVector REST API (v1)
- NeuVector NvSecurityRule CRD (apiVersion: neuvector.com/v1)
- eBPF (kernel-level observability)
- YAML and shell/curl tooling

## Sources Consulted
- NeuVector official documentation: https://open-docs.neuvector.com/
- NeuVector REST API spec (Swagger): https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- NeuVector CRD docs (Security Policy as Code): https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector Modes (Discover / Monitor / Protect): https://open-docs.neuvector.com/policy/modes/
- NeuVector Process Profile Rules: https://open-docs.neuvector.com/policy/processrules/
- NeuVector Network Rules: https://open-docs.neuvector.com/policy/networkrules/
- NeuVector REST API & Automation: https://open-docs.neuvector.com/automation/automation/
- SUSE blog: How NeuVector Leverages eBPF (https://www.suse.com/c/rancher_blog/how-neuvector-leverages-ebpf-to-improve-observability-and-security/)

## Issues Found

1. **Wrong process profile API path**: The post used `/v1/process/profile/group/{name}` (slashes and a `/group/` segment). The actual REST API path is `/v1/process_profile/{name}` (single underscore-delimited segment). Fixed in Step 2 and Step 3.

2. **Wrong PATCH body for process profile**: The post used a non-existent `process_profile` wrapper with `mode` and `process_list`. The actual schema is `RESTProcessProfileConfigData` which wraps in `process_profile_config` and uses `process_change_list` / `process_delete_list` (each entry must include `group`). Mode is not set on the process profile config. Fixed in Step 3.

3. **Wrong endpoint for setting mode**: The post used `PATCH /v1/group/{name}` with `{"config": {"mode": "Monitor"}}`. The `RESTGroupConfig` schema does not contain a mode field. Modes are set via `PATCH /v1/service/config` (schema `RESTServiceBatchConfigData`) using `services` (array) and `policy_mode` ("Discover" | "Monitor" | "Protect"). Fixed in Step 5.

4. **Wrong endpoint for security events**: The post used `/v1/event?type=security`. There is no `/v1/event` endpoint. The correct path is `GET /v1/log/security`, which returns `RESTSecurityData` with `threats`, `incidents`, and `violations` arrays. Updated the curl URL and the jq filter (using `.threats[]` and the actual `Threat` schema field names: `name`, `severity`, `target`, `action`, `reported_at`). Fixed in Step 6.

5. **Wrong port**: The post used `https://neuvector-manager:8443/...` for API calls. 8443 is the manager UI port. The controller REST API listens on 10443, which is what is documented and what NeuVector’s own automation examples use. Fixed across all curl examples.

6. **Invalid NvSecurityRule CRD format**: The post used Kubernetes-style `matchLabels` selectors and structured `protocol/port` ports. NeuVector's CRD uses `criteria` selectors (each entry is `{key, op, value}`) and the `ports` field is a single string in `protocol/port` format (e.g., `"tcp/80"`). The mode is set via `policymode` on `target`. The `- action: deny` "deny all other egress" pseudo-rule is not valid NvSecurityRule syntax. Rewrote the YAML using the correct schema and added a note that Protect mode implicitly denies traffic that does not match an allow rule. Fixed in Step 4.

7. **Fabricated `auto_profile_collect` field**: The post called `PATCH /v1/system/config` with `auto_profile_collect: true` claiming this enables automatic quarantine. This field does not exist in `RESTSystemConfigConfig`. Quarantine is performed per workload via `PATCH /v1/workload/{id}` with `quarantine: true`, and event-driven quarantine is configured via Response Rules in the UI. `monitor_service_mesh` is a real field and was retained. Fixed in Step 7.

## Review Notes

- The Discover / Monitor / Protect mode framing, the eBPF observation about the Enforcer, the DaemonSet name (`neuvector-enforcer-pod`), and the pod label selector (`app=neuvector-enforcer-pod`) are accurate.
- The 24-48 hour Discover-mode soak window is a reasonable rule of thumb but is a recommendation rather than a hard requirement; that wording was left intact.
- The `nv.<service>.<namespace>` group-naming convention used throughout (e.g., `nv.nginx.default`) matches NeuVector’s default service-group naming.
- The example "Test Your Runtime Protection" step (`kubectl exec ... /bin/bash`) is illustrative; whether `bash` is blocked depends on whether it is in the allowed process list and whether the group is in Protect mode. The step was kept as-is because the underlying expectation (NeuVector emits a security event) is correct.
- This tutorial targets NeuVector 5.x. If readers are on an older version (pre-5.0) they should consult the v1 vs v2 system-config endpoints; v2 (`/v2/system/config`) is the recommended endpoint per the API doc, though v1 still works.
