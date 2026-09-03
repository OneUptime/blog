# How to Export kube-hunter JSON Results and Fail CI Only on Actionable Findings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, JSON, CI/CD, DevSecOps

Description: Capture kube-hunter JSON as an immutable artifact, validate its pinned schema, and apply a transparent VID-based policy without treating service discovery as CI failure.

---

kube-hunter supports `--report json` and sends reports to standard output by default. Its current reporter emits top-level `nodes`, `services`, and `vulnerabilities` arrays. Each vulnerability currently includes fields such as `location`, `vid`, `category`, `severity`, `vulnerability`, `description`, `evidence`, `avd_reference`, and `hunter`.

That source-defined structure is useful, but it is not a promise that every future release will keep the same schema. Pin the scanner revision, validate the document before policy evaluation, and keep collection failure separate from security-policy failure.

## Capture a Clean Raw Artifact

Use a digest-pinned image or fixed source commit. The digest placeholder must be resolved by your release process:

~~~bash
set -u

IMAGE='aquasec/kube-hunter@sha256:<approved-digest>'
TARGET='192.0.2.40'

set +e
docker run --rm --read-only --cap-drop ALL \
  "$IMAGE" \
  --remote "$TARGET" \
  --report json \
  --log DEBUG \
  --num-worker-threads 50 \
  > kube-hunter.raw.json \
  2> kube-hunter.scan.log
scanner_rc=$?
set -e

if [ "$scanner_rc" -ne 0 ]; then
  echo "kube-hunter execution failed: $scanner_rc" >&2
  exit 2
fi
~~~

Do not assume kube-hunter's process exit code encodes vulnerability severity. Treat nonzero as scanner failure unless the pinned version's documented behavior says otherwise, but do not treat zero as proof that every worker completed: current worker code catches per-hunter exceptions. Standard-error redirection keeps logs out of the JSON artifact. Protect the debug log like the report, and never enable `--active` in a routine production CI gate.

## Validate Before Filtering

Reject missing or mistyped fields instead of silently treating a schema change as “no findings”:

~~~bash
jq -e '
  type == "object" and
  (.nodes | type == "array") and
  (.services | type == "array") and
  (.vulnerabilities | type == "array") and
  all(.vulnerabilities[]?;
    (.vid | type == "string") and
    (.severity | type == "string") and
    (.location | type == "string") and
    (.hunter | type == "string"))
' kube-hunter.raw.json >/dev/null || {
  echo "Unexpected kube-hunter JSON schema" >&2
  exit 2
}
~~~

Archive the untouched raw report before creating a summary. It may contain sensitive internal addresses and evidence, so use encrypted CI artifacts, narrow read permissions, and short retention.

The current JSON schema has no attempted-target list or scan-error array. Validate coverage separately before policy evaluation. For the pinned current source, port discovery logs a `Scanning host:port` marker before each fixed-port attempt; this implementation-specific check ensures the requested target reached that stage:

~~~bash
for port in 8001 8080 10250 10255 30000 443 6443 2379; do
  if ! grep -Fq "Scanning ${TARGET}:${port}" kube-hunter.scan.log; then
    echo "Missing scan attempt for ${TARGET}:${port}" >&2
    exit 2
  fi
done
~~~

Re-review this marker and port list whenever the scanner digest changes. For larger target sets, generate an expected-target manifest and require one complete set of attempts per target, corroborated with runner or firewall telemetry where feasible.

## Define “Actionable” as Policy

Severity alone is rarely enough. An actionable item normally combines:

- a stable vulnerability ID (VID);
- affected cluster and network vantage point;
- severity or organizational priority;
- whether the location is in scope;
- an approved, expiring exception;
- evidence quality and asset ownership.

Prefer an allowlist of VIDs that your team has reviewed against the pinned source. The example below is intentionally illustrative; replace the IDs with your policy, review their meaning for your scanner revision, and keep the list in version control:

~~~bash
jq -e '
  def policy_vid:
    . == "KHV031" or
    . == "KHV032" or
    . == "KHV036" or
    . == "KHV039";

  [
    .vulnerabilities[]?
    | select(.vid | policy_vid)
    | select(
        .severity == "critical" or
        .severity == "high" or
        .severity == "medium")
  ] as $actionable
  | if ($actionable | length) == 0 then
      true
    else
      ($actionable[]
       | "ACTIONABLE \(.vid) \(.severity) \(.location) \(.vulnerability)")
      | halt_error(1)
    end
' kube-hunter.raw.json
~~~

A simpler and more portable pipeline can write the actionable array to a second file, test its length, and exit `1`. Avoid logging `.evidence` to a public CI console.

Do not fail merely because `.services` is nonempty. Service rows mean kube-hunter discovered endpoints; they need separate exposure policy. For example, a kubelet reachable only from an approved control-plane runner is different from the same service reachable from the internet. Create a deliberate service-exposure gate if that distinction is important.

## Handle Baselines and Exceptions Safely

Do not suppress by mutable display text. Use VID plus cluster ID, target/vantage class, and—only when stable—location. Exceptions should include owner, reason, ticket, creation time, and expiry. Expired exceptions fail closed.

Keep “known” separate from “accepted.” A baseline prevents duplicate paging; it must not turn an unresolved vulnerability into a permanent pass. Report new, changed, persistent, and resolved findings to different channels.

Normalize volatile evidence only in the comparison copy. Preserve the raw value for investigation. Sort arrays before diffing because report order can change with concurrent discovery.

## Make CI Outcomes Unambiguous

Use distinct statuses:

- `0`: scan ran, schema was valid, policy found no unexcepted actionable items;
- `1`: scan ran and actionable findings exist;
- `2`: infrastructure, scanner, JSON, or policy evaluation failed.

Always upload the raw report and a redacted summary, even on `1` or `2`. Include scanner digest, target inventory, source network, passive/active mode, and UTC time. A timeout should not become a passing security result.

Review policy after scanner upgrades. Diff `--list`, parser flags, reporter source, VID documentation, and severity mappings before changing the pinned digest.

## Test the Gate Itself

Keep sanitized fixtures for four cases: no findings, an actionable VID, a non-actionable service-only report, and malformed or incomplete JSON. Run the policy against them on every change and assert the three distinct exit classes. Add a fixture with an unknown severity or extra field so forward-compatible additions do not bypass required validation. Fixtures test your wrapper, not kube-hunter; refresh them only after reviewing the pinned reporter source, and never derive them by copying live secrets or internal evidence into the repository.

## Conclusion

A reliable gate first proves that kube-hunter ran and produced the expected JSON, then applies an explicit VID-and-context policy. Preserve raw evidence, reject schema drift, distinguish discovered services from vulnerabilities, expire exceptions, and reserve a separate exit status for scanner failure. That makes CI strict about real risk without being noisy or falsely green.

## Official References

- [kube-hunter reporting and dispatch documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter JSON reporter](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/json.py)
- [kube-hunter base report schema](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter vulnerability severity mapping](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/core/events/types.py)
- [kube-hunter port discovery and attempt logging](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [jq manual: exit status and `-e`](https://jqlang.github.io/jq/manual/)
