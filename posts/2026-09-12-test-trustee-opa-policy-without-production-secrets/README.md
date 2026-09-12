# Test Trustee OPA Policies Without Releasing Production Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, OPA, Security, Kubernetes, Troubleshooting

Description: Test Trustee appraisal and secret-release rules with offline fixtures, negative cases, and an isolated KBS containing only canary resources.

---

A policy test can succeed for the wrong reason: the request reached a permissive KBS, the fixture skipped a missing claim, or the test evaluated a rule that the server never uses. Testing against a production secret makes that mistake consequential.

Use three separate checks: offline policy logic, the exact Trustee policy engine, and an isolated hardware attestation flow with nonproduction resources. Each answers a different question, and only the last exercises the whole trust chain.

## Know Which Policy You Are Testing

Trustee has two policy boundaries. The Attestation Service turns verified TCB claims into an EAR appraisal. Its policy exposes `data.policy.trust_claims`. KBS evaluates the resulting token and requested resource, using the boolean rule `data.policy.allow`. The [AS policy contract](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md) and [KBS request handler](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/src/api_server.rs) define these interfaces.

That distinction prevents a common mistake: an AS token can exist even when its appraisal is contraindicated. KBS must enforce the required appraisal and workload restrictions before returning a resource. A valid token by itself is insufficient.

Record the deployed Trustee image digest, policy engine version, policy source hash, and configured policy identifiers. A workstation OPA binary is useful for pure Rego logic but may not implement Trustee-specific built-ins or exactly match its embedded engine.

## Start with a Narrow Resource Rule

Save this illustrative staging rule as `resource.rego`. Its Init-Data value is deliberately a fixture identifier, not a production measurement:

```rego
package policy
import rego.v1

default allow := false

allow if {
    data.plugin == "resource"
    data["resource-path"] == ["test", "canary", "v1"]
    cpu := input.submods.cpu0
    cpu["ear.status"] == "affirming"
    cpu["ear.veraison.annotated-evidence"].init_data == "fixture-approved"
}
```

The resource path is `data`, while token claims are `input`. Matching the complete array avoids accidentally authorizing every resource in a repository. Current KBS source queries `allow`; naming a rule `allowed` will not implement this contract.

For production, replace the fixture identifier with the approved measured Init-Data digest and include whatever platform and device requirements your application needs. The example demonstrates testing structure rather than a complete security policy.

## Exercise Positive and Negative Inputs

Save these tests as `resource_test.rego`:

```rego
package policy_test
import rego.v1
import data.policy

request := {
    "plugin": "resource",
    "resource-path": ["test", "canary", "v1"]
}

claims(status, digest) := {"submods": {"cpu0": {
    "ear.status": status,
    "ear.veraison.annotated-evidence": {"init_data": digest}
}}}

test_approved_canary if {
    policy.allow with input as claims("affirming", "fixture-approved")
        with data.plugin as request.plugin
        with data["resource-path"] as request["resource-path"]
}

test_wrong_workload if {
    not policy.allow with input as claims("affirming", "another-workload")
        with data.plugin as request.plugin
        with data["resource-path"] as request["resource-path"]
}

test_contraindicated if {
    not policy.allow with input as claims("contraindicated", "fixture-approved")
        with data.plugin as request.plugin
        with data["resource-path"] as request["resource-path"]
}

test_missing_claims if {
    not policy.allow with input as {}
        with data.plugin as request.plugin
        with data["resource-path"] as request["resource-path"]
}

test_wrong_resource if {
    not policy.allow with input as claims("affirming", "fixture-approved")
        with data.plugin as request.plugin
        with data["resource-path"] as ["production", "database", "password"]
}
```

Run the checks in the directory containing only these example files:

```bash
opa check --strict resource.rego resource_test.rego
opa test resource.rego resource_test.rego --fail-on-empty -v
```

OPA's [testing documentation](https://www.openpolicyagent.org/docs/policy-testing) describes test discovery and the `with` overrides. Add cases for wrong plugin, short paths, wrong claim types, extra devices, and missing GPU appraisal when those matter. Treat an undefined or nonboolean production result as denial, and assert denial explicitly.

## Test Attestation Appraisal Separately

AS fixtures must resemble verifier-produced TCB claims, not the EAR token used above. Keep a sanitized successful fixture and change one field per negative case: measurement, security version, debug allowance, or mandatory configuration.

The current AS policy uses `query_reference_value`, a Trustee extension that retrieves RVPS data. Stock OPA cannot validate that integration by loading the policy alone. Exercise it through the matching Trustee test harness or staging AS with a dedicated RVPS. Record the expected trust vector, not merely that evaluation returned JSON.

Also test missing reference values and type mismatches. Otherwise a successful fixture can hide a broken reference-value deployment. If the policy identifier selects a device-specific policy, confirm the CPU and GPU policies used by the deployed release.

## Build an Isolated End-to-End Test

Create a separate KBS deployment, administration identity, signing configuration, resource backend, and reference-value store. Network access should not permit its resource plugin to retrieve production KMS objects. A separate namespace alone does not guarantee this isolation.

Provision a canary with no privileges outside the test. Use a confidential workload with the approved staging Init-Data and verify that it can obtain this canary. Then deliberately request the wrong resource and boot a workload with a changed policy. Both should fail.

Do not use an allow-all policy to diagnose a production denial. In a sample-attester lab, any intentionally permissive rule belongs only to that isolated instance. Sample attestation tests protocol plumbing, not hardware isolation.

## Conclusion

Safe Trustee policy testing combines precise rule contracts, denial fixtures, the deployed policy engine, and isolated canary secrets. Promote the reviewed policy and reference data only after each layer passes. Offline success proves policy logic; hardware-backed staging establishes the integration evidence needed for release.

## Official Documentation

- [OPA policy testing](https://www.openpolicyagent.org/docs/policy-testing)
- [Trustee policy overview](https://confidentialcontainers.org/docs/attestation/policies/)
- [Pinned AS policy interface](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md)
- [Pinned KBS policy contract](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/sample_policies/default.rego)
- [Pinned KBS request handler](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/src/api_server.rs)
