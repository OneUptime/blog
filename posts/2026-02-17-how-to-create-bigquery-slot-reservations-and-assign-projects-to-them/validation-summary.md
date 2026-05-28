# Validation Summary: How to Create BigQuery Slot Reservations and Assign Projects to Them

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Reservations
- BigQuery capacity commitments
- BigQuery `bq` command-line tool
- BigQuery Reservation API Python client
- BigQuery INFORMATION_SCHEMA views

## Sources Consulted
- BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Manage workload commitments: https://docs.cloud.google.com/bigquery/docs/reservations-commitments
- Manage workload reservations: https://docs.cloud.google.com/bigquery/docs/reservations-tasks
- Manage workload assignments: https://docs.cloud.google.com/bigquery/docs/reservations-assignments
- Understand BigQuery editions: https://docs.cloud.google.com/bigquery/docs/editions-intro
- BigQuery slots and autoscaling: https://docs.cloud.google.com/bigquery/docs/slots
- BigQuery JOBS_TIMELINE INFORMATION_SCHEMA view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs-timeline
- BigQuery Reservation assignments REST reference: https://docs.cloud.google.com/bigquery/docs/reference/reservations/rest/v1/projects.locations.reservations.assignments

## Issues Found
- The post used `gcloud bq reservations ...` commands, but the official BigQuery reservation examples and current CLI reference use the `bq` command-line tool for capacity commitments, reservations, assignments, updates, listing, and deletion. Replaced the command examples with `bq mk`, `bq ls`, `bq update`, and `bq rm` forms using the documented flags.
- The post used `--commitment-plan=MONTHLY` for Enterprise capacity commitments. Current BigQuery editions commitments support `ANNUAL` and `THREE_YEAR` plans; monthly applies only to legacy flat-rate commitments. Reworded the sizing guidance and changed the examples to annual commitments with `--renewal_plan=NONE`.
- The post stated that autoscaling goes beyond committed slots "at flex rates." Current docs describe autoscaled slots as charged at capacity compute pricing for the associated edition. Updated the wording.
- The post used dashed flag names such as `--autoscale-max-slots`, `--ignore-idle-slots`, and `--job-type` that do not match the documented `bq` flags. Replaced them with `--autoscale_max_slots`, `--ignore_idle_slots`, and `--job_type`.
- The assignment examples passed full resource strings to a non-existent `--assignee` flag. Updated them to use `--assignee_id` plus `--assignee_type`, as documented for `bq mk --reservation_assignment`.
- The slot utilization query averaged `period_slot_ms / 1000` across rows, which does not correctly aggregate concurrent jobs in `JOBS_TIMELINE`. Updated it to sum slot milliseconds over each hour and divide by the hour duration, and added the documented script-parent filter to avoid double counting script jobs.
- The cleanup commands used the invalid `gcloud bq reservations assignments delete` and `gcloud bq reservations delete` forms. Replaced them with `bq rm --reservation_assignment=true` and `bq rm --reservation=true`.
- The post said annual commitments give the best per-slot pricing. Current editions documentation lists three-year commitments as a larger discount than one-year commitments, so the wording now reflects that.

## Review Notes
The Python client example follows the documented ReservationServiceClient flow conceptually, but the local environment did not have `google-cloud-bigquery-reservation` installed, so it was checked against official documentation rather than executed locally.
