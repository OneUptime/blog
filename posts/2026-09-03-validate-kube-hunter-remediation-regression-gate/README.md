# How to Validate kube-hunter Remediation with a Targeted Rescan and Regression Gate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Regression Testing, CI/CD, DevSecOps

Description: Recreate the original kube-hunter observation, prove the intended control changed, preserve target coverage, and install a context-aware regression gate.

---

A finding disappearing is meaningful only if the rescan repeated the original observation successfully. A changed DNS answer, blocked scanner, missing target, different kube-hunter revision, or parser failure can all produce an empty result. Validation needs three proofs: the target was covered, the vulnerable behavior is gone, and legitimate behavior still works.

## Freeze the Original Evidence

From the finding record, recover:

- cluster and durable target identity;
- scanner vantage and observed source address;
- target hostname/IP and port;
- kube-hunter image digest or source commit;
- exact arguments and passive/active mode;
- VID, hunter, location, severity, and redacted evidence;
- UTC time, DNS answers, route, and firewall revision.

If those fields are missing, reconstruct them before claiming a like-for-like test. Do not change scanner version during remediation validation; test upgrades separately.

## Define Expected Before/After Behavior

Write an assertion at the control level. Examples:

- unauthenticated kubelet `/pods`: `200` with data becomes `401`;
- kubelet reachable from an application Pod: TCP success becomes timeout/deny;
- etcd reachable externally: TLS connection becomes blocked while approved control-plane clients remain healthy;
- anonymous API resource access: `200` becomes `401` or `403`, while deliberately public health paths retain their approved behavior.

This prevents “VID absent” from being the only success criterion.

## Verify the Changed Control First

Inspect version-controlled infrastructure and effective runtime state. Confirm the firewall rule, kubelet configuration, RBAC binding, API authentication configuration, or etcd TLS setting on every affected pool/member. A committed change that has not rolled out is not remediation.

Use a benign protocol-level check from the original source. Validate TLS with the proper CA and never add credentials to an anonymous test. Keep the status and small redacted response as evidence.

## Run a Targeted Passive Rescan

Prefer the original full passive hunter set against a single explicit target. It preserves discovery dependencies and avoids mistakes mapping display names to raw custom hunter classes:

~~~bash
IMAGE='aquasec/kube-hunter@sha256:<original-approved-digest>'
TARGET='192.0.2.40'
EXPECTED_PORT=10250

set +e
docker run --rm --read-only --cap-drop ALL \
  "$IMAGE" \
  --remote "$TARGET" \
  --report json \
  --log DEBUG \
  --num-worker-threads 50 \
  > after.raw.json \
  2> after.scan.log
scan_rc=$?
set -e

if [ "$scan_rc" -ne 0 ]; then
  echo "rescan failed" >&2
  exit 2
fi

if ! grep -Fq \
  "Scanning ${TARGET}:${EXPECTED_PORT}" after.scan.log; then
  echo "expected target and port were not attempted" >&2
  exit 2
fi
~~~

Do not add `--active`; production remediation should normally be proven through configuration, passive requests, and a lab. If the original finding required active behavior, recreate it in the isolated lab and keep production verification non-destructive.

Validate the JSON top level and confirm the target appeared in expected service or coverage evidence. Depending on the remediation, a service may intentionally disappear because the path is blocked. The source-specific debug marker above proves that current port discovery began the expected attempt; corroborate its outcome with firewall flow logs rather than requiring a service row. Protect the debug log and re-review the marker whenever the pinned scanner changes.

## Compare by Identity, Not Text Order

For a targeted VID check:

~~~bash
VID='KHV036'
TARGET_FRAGMENT='192.0.2.40'

if jq -e \
  --arg vid "$VID" \
  --arg target "$TARGET_FRAGMENT" '
    any(.vulnerabilities[]?;
      .vid == $vid and
      (.location | contains($target)))
  ' after.raw.json >/dev/null; then
  echo "remediation finding still present" >&2
  exit 1
fi
~~~

Match against a canonical target identity in your orchestration layer when IPs are ephemeral. Do not suppress solely by vulnerability display name or evidence text. Preserve the raw report and produce a normalized comparison copy.

An absent VID with absent coverage exits `2`, not `0`. Build that condition from the expected target manifest, scanner logs, DNS/route evidence, and—where applicable—the `services` array.

## Test Legitimate Operations

Security controls can break the control plane. After kubelet changes, schedule a canary Pod and verify approved API-server-mediated logs, exec, metrics, and node readiness. After etcd changes, use supported cluster health and API operations from approved clients. After API endpoint restrictions, verify administrators and automation from allowed networks.

Watch audit, component, CNI, and flow logs during the validation window. Document any cached authorization behavior and wait for documented cache TTLs before final decisions.

## Turn It into a Regression Gate

The recurring gate should pin the reviewed scanner, target manifest, and vantage. Use distinct outcomes:

- `0`: complete scan, expected schema, prohibited fingerprint absent;
- `1`: prohibited VID/location or service exposure present;
- `2`: scanner, path, target coverage, or schema failure.

Attach cluster ID, vantage ID, VID, and canonical target to the fingerprint. Store exceptions with owner, justification, and expiration. Always upload protected raw output and a redacted summary.

Run after node-image, CNI, firewall, RBAC, control-plane, or scanner changes and on a schedule. Add a small known-reachable canary endpoint so a total loss of scanner egress cannot appear green. Review `kube-hunter --list` and reporter source before accepting a new digest.

## Close with Evidence

The closure record should contain before/after requests, effective configuration, rollout coverage, raw report hashes, scanner digest, target list, network vantage, logs confirming enforcement, legitimate-operation tests, and the regression policy link. If only some node pools are updated, keep unaffected instances open.

## Conclusion

Validate remediation by repeating the original passive observation from the same vantage with the same scanner, then proving both target coverage and the changed control. Test allowed operations, classify execution failures separately, and install a VID-plus-context regression gate. “Not found” is success only after “definitely tested.”

## Official References

- [kube-hunter scanning and active-mode documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter base report structure](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter port discovery and attempt logging](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubernetes auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
