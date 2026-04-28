# Validation Summary: How to Migrate NeuVector Policies Between Clusters - Policy Migration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (SUSE / Rancher container security)
- NeuVector REST API (`/v1/auth`, `/v1/policy/rule`, `/v1/group`, `/v1/file/config`)
- Kubernetes (`kubectl`)
- `curl` and `jq`

## Sources Consulted
- NeuVector REST API automation guide: https://open-docs.neuvector.com/automation/automation/
- NeuVector controller `apis.yaml` OpenAPI spec: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- Existing validated NeuVector posts in this repo (e.g., `2026-03-20-neuvector-backup-configuration`, `2026-03-20-neuvector-upgrade`, `2026-03-20-rancher-automate-compliance-reporting`) which establish the canonical NeuVector REST API usage pattern.

## Issues Found
- The authentication endpoint was `/auth` instead of the correct `/v1/auth`. Fixed in the Step 1 token request and the Step 4 target-cluster token request.
- The auth request body used the flat form `{"username":"admin","password":"admin"}`. NeuVector requires the credentials to be wrapped in a `password` object: `{"password":{"username":"admin","password":"admin"}}`. Fixed in both auth calls.
- Step 2 used a fabricated CLI command (`/usr/local/bin/cli export -o /tmp/nv-policy-export.conf`) executed against the `neuvector-manager-pod`. NeuVector's `cli` binary lives in the controller pod (not the manager) and is an interactive shell — it does not expose a documented one-shot `export -o` flag, and `neuvector-ctl` is not a real package. I replaced this section with the documented `GET /v1/file/config?section=all` REST endpoint, which is NeuVector's canonical way to download a complete YAML configuration bundle. The `grep` examples in Step 3 were updated to match the YAML format.
- Step 4 used `PUT /v1/policy/rule` with `-d @network-rules-export.json` to import. The NeuVector API does not support PUT on `/v1/policy/rule` (only GET, PATCH, DELETE), and feeding the raw GET-shaped JSON back via PATCH would not work either. I replaced the import call with `POST /v1/file/config` using a multipart `configuration=@...yaml` upload, which is the documented endpoint that pairs with the new Step 2 export.
- Several `curl` URLs containing `?` query strings were not quoted. Added quotes so the shell does not interpret the query string as a glob.

## Review Notes
- The NeuVector REST API is reachable on port 10443 by default for the controller and 8443 for the manager service; the post uses `https://neuvector.example.com` as a placeholder hostname without a port, which is fine for documentation but readers will need to append the appropriate port (e.g. `:10443` or `:8443`) for their deployment.
- `scope=local` is a valid query parameter on `/v1/policy/rule` and `/v1/group` (used to filter out federated rules in a multi-cluster master/remote setup); it is preserved as in the original.
- The `/v1/file/config` import accepts an optional `scope` form field (`fed` or `local`) to control whether the imported configuration applies federated or local sections; this is not used in the example but readers running federated clusters may want to add it.
- The post's mention of "multi-cluster federation" in the Best Practices section is accurate — NeuVector's federation feature does provide ongoing policy sync between a master and remote clusters, which is the recommended approach for permanent multi-cluster setups.
