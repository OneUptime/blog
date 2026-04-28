# Validation Summary: How to Configure NeuVector for Multi-Cluster Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (multi-cluster federation)
- Kubernetes (kubectl, services, LoadBalancer)
- NeuVector REST API (`/v1/fed/*`, `/v1/policy/rule`, `/v1/group`)
- curl + jq

## Sources Consulted
- NeuVector Enterprise Multi-Cluster Management docs: https://open-docs.neuvector.com/navigation/multicluster/
- NeuVector REST API & Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector controller route table (source of truth for endpoints/methods): https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/rest.go
- NeuVector federation API request/response structs: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/fed_apis.go
- NeuVector core API structs (RESTPolicyRule, RESTPolicyRuleInsert, RESTGroupConfig, RESTCriteriaEntry, cfg_type constants): https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.go
- NeuVector internal cluster types (CLUSRestServerInfo, CLUSFedMembership): https://raw.githubusercontent.com/neuvector/neuvector/main/share/clus_apis.go
- NeuVector Helm chart (authoritative service names + ports): https://raw.githubusercontent.com/neuvector/neuvector-helm/master/charts/core/templates/controller-service.yaml

## Issues Found

1. **Wrong Kubernetes Service name in Step 1.** The post used `neuvector-service-federation-master`, but the Helm chart actually creates `neuvector-svc-controller-fed-master` (the `controller.federation.mastersvc` service). Both `kubectl patch` and `kubectl get` invocations were updated to the correct name. Port 11443 was already correct.

2. **Promote API request body in Step 1.** Two problems: (a) the `RESTFedPromoteReqData` struct types `use_proxy` as a `*string` with valid values `""` or `"https"`, not a boolean — `false` would fail JSON unmarshal; (b) the request also expects `name`, `ping_interval`, and `poll_interval`. Replaced `"use_proxy": false` with `"use_proxy": ""` and added the `name`, `ping_interval`, and `poll_interval` fields.

3. **Join API request body in Step 3.** The post wrapped the master server/port in a `master_rest_info` object and used `cluster_name` and `local_rest_info` — none of these match `RESTFedJoinReq`. The actual struct expects flat top-level `server` and `port` fields, `name` (not `cluster_name`), and `joint_rest_info` (not `local_rest_info`). Also fixed the joint cluster's REST port to `10443` (the worker/managed port from the Helm chart's `fed-worker` service) and changed `use_proxy` from boolean to string per the same struct definition.

4. **Wrong endpoint and HTTP method for federated policy rules in Step 4.** The post used `POST /v1/fed/policy/rule`, which does not exist in the NeuVector controller router. The actual route for inserting federated network rules is `PATCH /v1/policy/rule?scope=fed` (handled by `handlerPolicyRuleAction`, with `RESTPolicyRuleActionData.Insert` carrying the `after` and `rules` payload). Updated method, URL, and query parameter.

5. **Wrong endpoint for federated groups in Step 5.** The post used `POST /v1/fed/group`, which does not exist. Federated groups are created via `POST /v1/group` (the standard `handlerGroupCreate`) with `cfg_type: "federal"` and a `fed.` name prefix in the body. The body shape was already correct; only the URL was changed.

6. **Wrong endpoint and response field names in Step 7.** The post used `GET /v1/fed/cluster` and parsed `.fed_clusters[]` with `.connection_status` and `.api_server` fields. The actual federation membership endpoint is `GET /v1/fed/member`, returning `RESTFedMembereshipData` with a `joint_clusters` array; each entry exposes `name`, `id`, `status`, and `rest_info` (and there is no `connection_status`, `api_server`, or `disconnected_at` field). Updated both `jq` queries accordingly. The valid `status` values include `synced`, `connected`, `disconnected`, `out_of_sync`, etc., per `FedStatus*` constants.

7. **Step 8 verified.** `DELETE /v1/fed/cluster/:id` does exist in the router (`handlerRemoveJointCluster`) and is left unchanged.

## Review Notes
- The blog still uses the term "Master / Member" cluster, while NeuVector's UI and recent docs increasingly use "Primary / Remote (Managed)". Internally, the Go code and REST status strings still use `master` and `joint`, so the narrative is technically defensible, but a future revision could align terminology with current docs.
- The federation join token is documented to be valid for ~1 hour. The post does not mention this expiry, which can confuse readers who try to onboard remote clusters later. Worth adding in a future pass.
- The fed-worker service (`neuvector-svc-controller-fed-worker`, port 10443) is what remote clusters expose if they need to be reachable for `joint_rest_info`. The post does not describe how to expose it, which could trip up readers; I left this out of scope for this validation.
- Header `X-Auth-Token` and the auth payload shape (`{"password":{"username":..., "password":...}}` returning `.token.token`) were verified against the controller's `auth.go` and `/v1/auth` route.
