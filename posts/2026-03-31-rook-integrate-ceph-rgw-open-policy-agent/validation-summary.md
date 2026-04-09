# Validation Summary: How to Integrate Ceph RGW with Open Policy Agent

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Open Policy Agent (OPA)
- Rego policy language
- S3-compatible object storage
- AWS CLI (for testing)

## Sources Consulted
- OPA official documentation: https://www.openpolicyagent.org/docs/latest/
- OPA REST API reference: https://www.openpolicyagent.org/docs/latest/rest-api/
- OPA policy language reference (built-in functions, time): https://www.openpolicyagent.org/docs/latest/policy-reference/
- OPA downloads page: https://www.openpolicyagent.org/docs/latest/#running-opa
- Ceph RGW OPA integration documentation: https://docs.ceph.com/en/latest/radosgw/opa/
- Ceph RGW source code (`rgw_opa.cc`) for actual OPA input payload format

## Issues Found

### 1. Fabricated config option `rgw_opa_package`
**What was wrong:** The post included `ceph config set client.rgw rgw_opa_package "rgw/authz/allow"` but `rgw_opa_package` does not exist as a Ceph configuration option. The OPA policy path is encoded directly in the `rgw_opa_url` value.
**What was changed:** Removed the `rgw_opa_package` line entirely.

### 2. Missing `rgw_use_opa_authz` toggle
**What was wrong:** The critical configuration option `rgw_use_opa_authz` was not included. Without setting this to `true`, RGW will never call OPA for authorization.
**What was changed:** Added `ceph config set client.rgw rgw_use_opa_authz true` to the configuration section.

### 3. Incomplete `rgw_opa_url` value
**What was wrong:** The URL was set to just `http://opa-host:8181` but RGW requires the full OPA data API path including the policy decision endpoint (e.g., `/v1/data/rgw/authz/allow`).
**What was changed:** Updated the URL to `http://opa-host:8181/v1/data/rgw/authz/allow`.

### 4. Incorrect field names in Rego policies
**What was wrong:** The Rego policies referenced `input.bucket`, `input.user.roles`, and `input.user.department`, but the actual RGW-to-OPA input payload uses `input.bucket_info.bucket.name`, `input.user_info.user_id`, `input.user_info.display_name`, and `input.bucket_info.owner`. The fields `roles` and `department` are not sent by RGW at all.
**What was changed:** Rewrote the Rego policy rules to use the correct RGW input field names. Replaced the role-based rule with an owner-based access rule (since RGW provides owner info). Adjusted the business hours rule to remove the non-existent department field.

### 5. Incorrect curl test input payload
**What was wrong:** The curl test example used the same incorrect field names (`bucket`, `user` with `roles`).
**What was changed:** Updated the test payload to use the actual RGW input format with `bucket_info`, `user_info`, and their correct sub-fields.

### 6. Advanced policy used non-existent input fields
**What was wrong:** The advanced ABAC policy referenced `input.bucket` and `input.user.clearance_level`, neither of which exists in the RGW input. Since `clearance_level` is not provided by RGW, looking it up from the input is impossible.
**What was changed:** Updated to use `input.bucket_info.bucket.name` for the bucket lookup, and changed the user clearance to be looked up from OPA's data store (`data.user_clearances`) rather than the input, since RGW does not provide this field. Updated the data loading command to include `user_clearances.json`.

## Review Notes
- The `import future.keywords.if` and `import future.keywords.in` syntax works but is the older style. OPA v0.59+ supports `import rego.v1` as a consolidated replacement, and OPA v1.0+ includes these keywords by default. The current syntax remains functional.
- The post does not mention `rgw_opa_token`, an optional config option for authenticating RGW to OPA with a bearer token. This is not an error (the option is optional) but could be useful for production deployments.
- The systemd unit name `ceph-radosgw@rgw.default` uses a non-standard instance name. The actual instance name depends on the deployment (commonly `rgw.<hostname>`). In cephadm-managed clusters, `ceph orch restart rgw.<service>` is the preferred approach. This is noted but not changed as the blog acknowledges this is an example.
- The OPA download URL correctly uses `https://openpolicyagent.org/downloads/latest/opa_linux_amd64` which redirects to the latest GitHub release.
