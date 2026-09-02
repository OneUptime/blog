# How to Measure Actual RTO and RPO During a Recovery Exercise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, RTO, RPO, Monitoring, Site Reliability Engineering

Description: Measure recovery time and data loss from explicit timeline events and durable business watermarks during a recovery exercise.

---

An exercise result such as “recovery took 22 minutes” is not reproducible unless everyone agrees when the clock started and what qualified as recovered. An RPO result based only on replication lag is similarly weak: lag is an input signal, not proof of which acknowledged business writes survived.

Measure RTO from explicit events. Measure RPO from durable data boundaries.

## Define the Clocks Before the Exercise

For each business capability, define these events:

| Event | Meaning |
| --- | --- |
| T-failure | The scenario first prevents or invalidates eligible service |
| T-detected | Monitoring produces an actionable signal |
| T-declared | An authorized person or policy declares recovery |
| T-contained | Old writers are fenced and the failure cannot spread |
| T-data | Restored or promoted data is available |
| T-service | Critical service is reachable |
| T-accepted | A synthetic business transaction is durable and reconciled |

The most useful end-to-end measurement is:

~~~text
actual RTO = T-accepted - T-failure
~~~

Also report its components:

~~~text
detection time       = T-detected - T-failure
decision time        = T-declared - T-detected
containment time     = T-contained - T-declared
technical recovery   = T-service - T-contained
business validation  = T-accepted - T-service
~~~

Some organizations start a contractual clock at declaration rather than first impact. If so, report both. Changing the origin after a slow detection phase makes exercises incomparable and conceals risk.

Do not stop at process start, VM boot, database promotion, a successful health endpoint, or traffic shift. Stop when the critical capability meets its documented acceptance condition.

## Instrument a Common Event Timeline

Use synchronized clocks and a machine-readable event collector. Every event should include:

- exercise and scenario IDs;
- UTC timestamp with sub-second precision where available;
- monotonic duration from exercise start;
- source component and actor;
- event type and object identifier;
- evidence link;
- whether the event was automatic or manual.

~~~json
{
  "exercise_id": "dr-2026-09-02-01",
  "scenario": "region-loss",
  "event": "business_acceptance_passed",
  "at_utc": "2026-09-02T01:22:14.602Z",
  "elapsed_ms": 1334602,
  "capability": "accept-paid-order",
  "evidence": "receipt/order-dr-2026-09-02-01.json"
}
~~~

Prefer events emitted by systems over timestamps copied into a document. Preserve incident chat and operator commands as supporting context, but make the measurement ledger authoritative.

## Measure RPO from Recovery Points and Business Watermarks

RPO is an objective, not a counter emitted by the database. Capture three boundaries:

- **failure or isolation time:** the contract's interruption point;
- **source cutoff:** newest acknowledged durable write before that point;
- **recovered cutoff:** newest continuous valid write from the same pre-failure history in the recovered system.

These support two different measurements:

~~~text
recovery point age = T-failure - recovered_cutoff.commit_time
acknowledged-write loss span =
  max(0, source_cutoff.commit_time - recovered_cutoff.commit_time)
~~~

Recovery-point age is the direct comparison with the conventional time-based RPO definition: the interval between interruption and the last recovered point. The acknowledged-write loss span answers a separate business question: how much time separates the recovered cutoff from the newest acknowledged write. Report both and state which one the recovery contract uses; do not label the second value alone as “actual RPO.”

You may calculate `source_cutoff.sequence - recovered_cutoff.sequence` as a lost-write count only when both values belong to the same gap-free monotonic sequence and loss is a suffix. Otherwise, compare explicit business IDs. A 30-second window might contain no writes overnight or thousands at peak.

Use application-level commit identifiers, database log positions, transaction IDs, queue offsets, or immutable event sequence numbers. Wall-clock timestamps alone can misorder concurrent writes or suffer clock skew. If the source system cannot expose a durable watermark, add one before claiming a measured RPO.

### A practical marker stream

During a controlled exercise, write uniquely numbered markers through the real application path:

~~~text
dr_marker(run_id, sequence, submitted_at, committed_at, payload_hash)
~~~

After recovery, find the highest continuous valid sequence. A gap below the maximum is an integrity failure, not merely an RPO result. Confirm that the application acknowledged only markers whose commits were durable according to the database contract.

## Account for Multiple Stores

A business transaction may span a database, queue, object store, and external provider. Measure each component and then validate the business invariant.

Example:

- order row recovered through sequence 9102;
- payment ledger recovered through sequence 9102;
- fulfillment queue recovered only through 9099;
- object receipts recovered through 9102.

The service-level recovery point is not 9102 if orders 9100–9102 can never reach fulfillment. Either replay them from a durable outbox or classify the cross-store inconsistency as a failed acceptance test.

For asynchronously derived stores such as search, record a separate freshness objective if they can be rebuilt and the critical capability can run without them.

## Avoid Common Measurement Errors

- **Using configured backup frequency as a measured recovery point:** configuration does not prove the last usable point.
- **Using current replica lag after promotion:** it may not describe writes lost at failure time.
- **Ignoring detection and declaration:** this inflates apparent architecture performance.
- **Stopping on a shallow health check:** process health is not business recovery.
- **Averaging exercises:** an objective is a maximum; publish each run and a distribution, including failures.
- **Discarding retries:** the customer experienced the entire duration.
- **Testing tiny data:** restore and reconciliation time often changes with volume.
- **Ignoring clock uncertainty:** report synchronization status and uncertainty when timestamp precision matters.

## Produce an Evidence-Backed Scorecard

~~~yaml
exercise: dr-2026-09-02-01
capability: accept-paid-order
scenario: region-loss
rto:
  objective_seconds: 1800
  actual_seconds: 1334.602
  margin_seconds: 465.398
rpo:
  objective_seconds: 60
  clock_basis: failure_to_recovered_commit
  recovery_point_age_seconds: 41.208
  acknowledged_write_loss_span_seconds: 35.100
  lost_business_writes: 7
integrity:
  contiguous_marker_sequence: true
  cross_store_reconciliation: pass
degraded_features:
  recommendations: unavailable
manual_interventions: 2
result: pass
~~~

Keep raw timeline events, queries, watermarks, logs, tool versions, and acceptance receipts behind the scorecard. NIST SP 800-184 emphasizes informative recovery metrics and continuous improvement; a summary without its evidence cannot support either.

## Acceptance Criteria

The measurement process is credible when:

- start and stop events are declared before execution;
- end-to-end RTO includes detection through business acceptance, or clearly reports any contractual alternative alongside it;
- RPO compliance uses the declared failure time and recovered durable point, with source and recovered watermarks also quantifying acknowledged-write loss;
- lost-write count and cross-store consistency are reported;
- clocks are synchronized and event collection is immutable enough for review;
- failed attempts, retries, and manual pauses remain in the duration;
- raw evidence can reproduce the scorecard;
- the result identifies both objective margin and uncertainty.

Architecture choices should respond to the slowest measured stage and oldest recovered dependency. Precise measurements turn a drill from theater into an engineering feedback loop.

## Official References

- [Google Cloud: Disaster recovery planning guide](https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide)
- [Google Cloud Well-Architected Framework: Test recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [AWS Well-Architected Framework: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_recovery_objectives.html)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
