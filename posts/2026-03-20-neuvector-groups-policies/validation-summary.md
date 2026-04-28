# Validation Summary: How to Configure NeuVector Groups and Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector REST API (`/v1/group`)
- NeuVector CRDs (`NvSecurityRule`)
- Kubernetes
- `kubectl`, `curl`, `jq`, `bash`

## Sources Consulted
- [NeuVector Groups documentation](https://open-docs.neuvector.com/policy/groups/)
- [NeuVector CRD - Custom Resource Definitions](https://open-docs.neuvector.com/policy/usingcrd/)
- [SUSE Rancher - CRD docs (5.4)](https://documentation.suse.com/cloudnative/security/5.4/en/usingcrd.html)
- [NeuVector Helm Chart - CRD definitions](https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml)
- [NeuVector Network Rules](https://open-docs.neuvector.com/policy/networkrules/)
- [NeuVector Security Policy Overview](https://open-docs.neuvector.com/policy/overview/)

## Issues Found

1. **Auto-generated group naming pattern was inaccurate**
   - **Was:** `Pattern: nv.<deployment-name>.<namespace>` with example `nv.ext.ip - External IP addresses`.
   - **Why wrong:** NeuVector auto-creates groups using the service name (not deployment name), and `nv.ext.ip` is not a real reserved group. The actual reserved groups are `external` (all external traffic), `nodes` (all hosts), `containers` (all containers), with `nv.ip.*` reserved as a prefix for IP-based service groups (e.g., `nv.ip.internet`).
   - **Fix:** Updated the pattern to `nv.<service-name>.<namespace>`, replaced `nv.ext.ip` with the real `nv.ip.internet`, and added a section listing the reserved special groups (`external`, `nodes`, `containers`).

2. **`NvSecurityRule` CRD example used Kubernetes-native selector syntax instead of NeuVector's**
   - **Was:** `selector: { matchLabels: { tier: web } }` for `target`, `ingress`, and `egress`.
   - **Why wrong:** The official `NvSecurityRule` schema (verified via the NeuVector Helm CRD definitions and SUSE docs) uses `selector.name` plus `selector.criteria` (an array of `{key, op, value}` objects). It does not support `matchLabels`. Applying the manifest as written would fail schema validation.
   - **Fix:** Rewrote the YAML to use `selector.name` + `selector.criteria` for the target and each ingress/egress rule, with realistic group names (`nv.web.production`, `nv.api.production`, `nv.ingress-nginx.ingress-nginx`).

3. **`ports` field in the CRD used the wrong format**
   - **Was:** An array of `{ protocol: TCP, port: 80 }` objects.
   - **Why wrong:** NeuVector's CRD schema defines `ports` as a single string in the form `tcp/80,tcp/443` (or `udp/N`, `icmp`, `any`).
   - **Fix:** Replaced the structured port arrays with the canonical string format (e.g., `ports: tcp/80,tcp/443`, `ports: tcp/8080`).

4. **Removed an unsupported "deny-all-other" rule using an empty selector**
   - **Was:** `selector: {}` paired with `action: deny` to deny everything else.
   - **Why wrong:** The CRD requires `selector.name` (and the schema marks it as required); an empty selector object is not valid. Implicit deny is handled by NeuVector's policy mode (Protect mode blocks anything not explicitly allowed), so an empty-selector deny rule is unnecessary and would be rejected by the CRD validator.
   - **Fix:** Removed the rule. Added the `applications` field (e.g., `HTTP`, `SSL`) which is the canonical CRD field for layer-7 protocol matching, and added the (commonly required) `file: []` field at the end.

5. **Step 5 example didn't match its surrounding text**
   - **Was:** Section text said "The `nodes` and `fed.nodes` groups allow you to set default policies for all nodes," but the curl example targeted `nv.ip.internet` with the comment "Set default policy for all managed groups."
   - **Why wrong:** `nv.ip.internet` represents the internet IP-address space, not "all managed groups," and isn't related to `nodes`/`fed.nodes`. The example contradicted the text.
   - **Fix:** Renamed the section to "Use Reserved Groups for Cluster-Wide Policies," kept the explanatory text, and changed the example to operate on `nodes` so the code matches the description.

## Review Notes

- The NvSecurityRule example name was changed from `web-tier-policy` to `nv.web.production` to better reflect typical NeuVector CRD conventions where the manifest name often matches the target group name.
- The post discusses the REST API on port 8443 (`https://neuvector-manager:8443/v1/...`) which matches NeuVector's controller REST API. Endpoints `/v1/group`, `PATCH /v1/group/{name}`, and `DELETE /v1/group/{name}` are correct.
- The criteria operators used in the curl examples (`=` and `contains`) are valid per the NeuVector docs (which list `=`, `!=`, `contains`, `prefix`, `regex`, `!regex`).
- Policy modes `Discover`, `Monitor`, and `Protect` are correct; the post only uses `Monitor` and `Protect`, which is fine.
- For future revisions: the post could mention `NvClusterSecurityRule` (cluster-scoped) as a complement to the namespace-scoped `NvSecurityRule`, and could note that CRD-managed groups have configuration precedence (`cfg_type: ground`) over user-defined ones — but these are enhancements, not corrections.
