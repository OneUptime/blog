# How to Reprocess Prior Months After Cloudability Business Mapping Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, Data Processing, Automation

Description: Apply Cloudability Business Mapping corrections to historical periods with a planned data reprocess, controlled month usage, and before-and-after allocation checks.

Saving a Business Mapping changes the definition used to categorize costs. It does not mean every previously processed month immediately adopts that definition. If a team was incorrectly assigned for a closed quarter, waiting for a routine billing refresh can leave historical reports unchanged.

Use a historical data reprocess after validating the mapping. Plan the periods and acceptance checks before starting so the operation produces a traceable correction.

## Decide whether you need reprocessing or new source data

A mapping correction and a missing billing file are different problems. IBM distinguishes reprocessing, which reruns post-ingestion transformation on historical data, from refetching, which retrieves vendor data again. Reprocessing is the relevant operation when the existing source data is complete and the business classification changed. [IBM data availability and processing explanation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting)

Use this decision table:

| Situation | First action |
| --- | --- |
| Existing rows assigned to the wrong team | Validate mapping, then reprocess affected periods |
| Billing days absent from the source dataset | Investigate collection and whether refetch is required |
| Current-month mapping change | Check the normal processing cycle |
| Older report still shows a previous result | Check processing status and downstream cache freshness |

Do not use a reprocess as a general cure for unexplained discrepancies. Establish whether the data exists and whether the mapping would produce the desired result on that data.

## Define the historical policy

A retrospective correction can mean one of two things: correcting an error that was always wrong, or presenting history using today's organizational structure. Write down which interpretation is intended.

For example, if Commerce assumed ownership of a service on July 1, applying today's owner to January may be incorrect. If January was misclassified because of a spelling error, correcting it may be appropriate.

Capture the approved effective dates, affected mapping, old and new ownership, and expected redistribution. If the mapping must preserve historical transitions, validate the date-based logic against representative items before reprocessing.

Export the current mapping definition and the proposed definition. Preserve statement order. A backup that sorts statements for neatness can change the semantics of a first-match mapping.

## Check access and the operation's limits

For the documented Cloudability-only workflow, Data Reprocess is an opt-in feature requiring administrator access, available at Organize > Data Reprocess. IBM documents 12 month-units per month and a maximum 12-month lookback. Submitted jobs cannot be canceled, and concurrently running requests cannot overlap months. Current-month data is reprocessed daily. Confirm the allowance displayed in your tenant before submission. [IBM Data Reprocess guide](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess)

Treat a month-unit as processing a month once. A three-month correction followed by another run of those three months consumes additional capacity. Validate the definition first rather than repeatedly spending the allowance on trial-and-error changes.

Do not transfer these limits automatically to a different integration. IBM's newer Cloudability-to-Apptio Costing integration through Automated Data Management describes a separate historical-data workflow with up to 24 months. Follow the interface and documentation for the actual integration you operate. [IBM ADM integration announcement](https://community.ibm.com/community/user/viewdocument/ibm-cloudability-to-ibm-apptio-costing-integration-via-automated-data-management?CommunityKey=2e85ed45-9b8a-486c-bd55-019253d466eb&tab=librarydocuments)

## Establish a baseline

Before saving the final change, export the affected months using a fixed report definition. Include the selected cost metric, currency, payer scope, allocation setting, and ownership dimension.

Keep three controls:

1. Total amount in the complete scope.
2. Amount by old and new owner.
3. Unallocated amount.

For an illustrative correction, Commerce might gain $4,000 while Platform loses $4,000. The full-scope total should remain the same if the only difference is classification. If total cost changes, investigate vendor updates or other processing changes rather than attributing everything to ownership.

Choose sample items from both the expected matches and the exclusions. A total that looks plausible can still conceal two offsetting classification errors.

## Submit a narrow, named request

Save the validated mapping. In Data Reprocess, open New Request and supply a job name, start date, end date, and reason. Review the displayed month-unit usage, then submit. Monitor the request and its individual month statuses in Job Status. [IBM Data Reprocess workflow](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess)

A useful name includes the mapping and period, such as `owner-correction-2026-q2`. The reason should reference the approved correction and its expected effect, not simply say “refresh data.”

Keep other mapping changes controlled while the job runs. Combining unrelated edits makes it harder to explain which definition produced each reporting result.

## Verify the result and refresh downstream copies

After completion, rerun exactly the baseline report. Compare total, owner redistribution, defaults, and the sample items. Record the job identifier, completion time, mapping version, and reconciliation outcome.

For a failed month, inspect its status before resubmitting. The Cloudability-only guide says failed months do not consume the corresponding month-units. Repeated failures or urgent needs beyond the allowance should go to IBM Support with the job details. [IBM Data Reprocess guide](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-data-reprocess)

Finally, reload the same historical partitions in any warehouse, Power BI dataset, or exported finance workbook. A corrected Cloudability report does not automatically replace an external snapshot.

Historical mapping changes are complete when the intended periods show the approved ownership, the total is explained, and downstream consumers use the corrected version. Keep that evidence with the mapping change so future reviews can distinguish a deliberate restatement from unexplained drift.
