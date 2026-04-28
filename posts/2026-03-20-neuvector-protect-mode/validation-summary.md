# Validation Summary: How to Configure NeuVector Protect Mode

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (runtime container security)
- Kubernetes (CRDs, namespaces, kubectl)
- NeuVector REST API (v1)
- NeuVector NvSecurityRule CRD (`neuvector.com/v1`)
- Bash scripting (curl, jq)

## Sources Consulted
- [NeuVector Policy Modes documentation](https://open-docs.neuvector.com/policy/modes)
- [NeuVector CRD - Custom Resource Definitions](https://open-docs.neuvector.com/policy/usingcrd/)
- [NeuVector Security Policy Overview](https://open-docs.neuvector.com/policy/overview/)
- [NeuVector Groups documentation](https://open-docs.neuvector.com/policy/groups/)
- [neuvector-helm CRD templates](https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml)

## Issues Found

1. **Incorrect `NvSecurityRule` CRD selector format (Step 4).** The original YAML used Kubernetes-style `selector.matchLabels` (e.g. `matchLabels: { app: webapp }`). NeuVector's `NvSecurityRule` CRD does not accept `matchLabels`; it uses its own `selector` schema with a `name` field and a `criteria` array of `{ key, op, value }` entries (operators include `=`, `!=`, `contains`, `prefix`, `regex`, `!regex`). Updated the target selector and all ingress/egress selectors to use the `name` + `criteria` format. As-written, `kubectl apply -f` would have failed schema validation.

2. **Incorrect ports format in CRD (Step 4).** The original used a structured list (`ports: - protocol: TCP, port: 3000`). NeuVector's CRD specifies ports as a string in `protocol/port` notation (e.g. `tcp/3000`, `udp/53`, `tcp/any`). Updated each rule to use the string format expected by the CRD schema.

3. **Contradictory comment in Step 7.** The comment said "New services automatically start in Protect mode (advanced configuration)" but the request body sets `new_service_policy_mode` to `"Monitor"`. Rewrote the comment to accurately describe the configuration ("Set the default mode for newly discovered services"), which is consistent with the immediately-following note that setting new services directly to Protect is not recommended.

## Review Notes

- The NeuVector REST API endpoints used (`/v1/process/profile/group/{group}`, `/v1/policy/rule`, `/v1/event`, `/v1/group/{name}`, `/v1/system/config`) and the `X-Auth-Token` header are consistent with NeuVector's controller API.
- Mode values `Discover`, `Monitor`, `Protect` are correct, as is the Discover → Monitor → Protect workflow described in the introduction.
- The `mode` field in the PATCH request body and the `policy_mode` field in the GET response are correct field names.
- The `nv.<service>.<namespace>` group naming convention used in examples reflects NeuVector's auto-generated group names.
- The CRD example replaces `matchLabels` with NeuVector's `criteria` format using illustrative `service`/`domain` keys; readers should adapt the `key`/`value` pairs to their actual workload labels (NeuVector exposes labels and computed identifiers like `service`, `domain`, `image`, `node`, `host`).
- The Step 5 `watch -n 5` polling loop is heavy; in production, consider using NeuVector's syslog/webhook integrations for streaming events instead of polling the REST API.
