# Why Cloudability Cost Ingestion Stops When You Archive an AWS Payer Account—and How to Recover It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, FinOps, Cost Management, Troubleshooting

Description: Recover Cloudability ingestion after an AWS payer credential is archived, distinguish historical reporting from new collection, and verify missing periods.

An AWS payer account can look like an administrative entry in Cloudability, but its credential is the connection to the organization's consolidated billing export. Archiving that connection can leave yesterday's charts intact while today's cost data stops arriving.

The recovery starts by separating three things: data already processed, access to AWS source files, and the Cloudability credential that connects them. Recreating the connection is only one part of proving that reporting is complete again.

## Understand which connection was archived

IBM describes archiving as removing the vendor link while retaining historical data. An archived credential cannot simply be restored; the documented recovery is to credential the account again. Archiving a child account has different consequences: its costs can still arrive through the parent, while advanced data such as utilization and commitments stops being collected through that child connection. [Manage vendor credentials](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=credentials-manage-vendor-in-cloudability)

From that design, a payer archive removes the access path used for that payer's billing ingestion. A linked-account archive does not necessarily remove that path. This distinction explains why two similar administrative changes can produce very different dashboard symptoms.

Build a small incident record:

| Field | Example evidence |
| --- | --- |
| Archived account | Twelve-digit AWS account ID |
| Account role | Payer or linked account |
| Last known complete period | Date and report export |
| Archive time | Administrative change record |
| Expected source | CUR bucket, report name, prefix |
| Missing outputs | Daily costs, utilization, commitment inventory |

Use IDs throughout the investigation. Display names can change or be reused.

## Find the account before adding duplicates

Check Settings > Vendor Credentials with the AWS datasource selected. Current Cloudability release notes describe archived accounts as hidden by default, with a toggle to show them. A missing row is therefore not sufficient evidence that the account was deleted from the configuration. [Archived-account visibility release note](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=cloudability-whats-new-in)

Capture the archived entry and its existing identifiers. If there is also an active payer credential, stop and compare the two connections before recreating anything. An apparent archive incident can coincide with a migration to a new export or billing arrangement.

Also confirm that the AWS account itself still exists and is operational. Archiving a credential in Cloudability is not an AWS account closure operation, and it does not repair an AWS account that was independently closed or suspended.

## Verify the source export is still being delivered

Open the configured billing bucket and inspect the relevant billing periods. Confirm that the expected manifest and report objects exist and that recent object timestamps continue to advance.

Cloudability's AWS FAQ recommends checking the bucket, billing report, and manifest when cost data is absent. It also notes that an initial AWS Cost and Usage Report can take up to 24 hours to be generated. That initial-report timing should not be used as an explanation for an established export that stopped days ago. [AWS connection FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=guide-frequently-asked-questions-connecting-aws)

If the export was also disabled, restore its delivery before troubleshooting Cloudability processing. If old report objects were removed by a retention rule, document the missing periods. Reestablishing a credential cannot recreate source objects that no longer exist.

Do not change the bucket, prefix, report format, and credential simultaneously unless that migration is necessary. Keeping the original export stable makes it easier to isolate the recovery result.

## Credential the same payer again

Use the AWS onboarding workflow for the payer account. Enter its account ID and the verified bucket, report name, and prefix. Generate the current template from this connection, compare it with the role already in AWS, and deploy the reviewed configuration through the role's existing management process.

The current IBM onboarding guide covers payer credential creation, template generation, and linked-account automation. Follow the workflow available in your edition rather than assuming that a previously saved role remains compatible with a newly generated connection. [Simplified AWS credentialing workflow](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=guide-simplified-credentialing-workflow-aws)

In particular, compare the role name and external ID. A role can still exist while its trust relationship no longer matches what the new credential expects. After verification succeeds, capture the result and timestamp.

Treat that green result as an access milestone. The next milestone is a fresh, complete reporting period.

## Reconcile the gap explicitly

Create a daily control report for the affected payer covering several days before the archive through the recovery date. Include all linked accounts and use the same cost metric and filters as the pre-incident report.

For each missing day, distinguish:

1. Source files absent in AWS.
2. Source files present but not collected.
3. Collected data still processing.
4. Processed data hidden by a view or report filter.

Ask IBM Support about the appropriate refetch or processing action for unresolved periods, providing the payer ID, report location, dates, and verification evidence. Do not assume that every historical gap is automatically backfilled after recredentialing.

For Cloudability MSP and Commercial Billing, check downstream reports particularly carefully. IBM documents that reprocessing historical periods while a billing account is archived can exclude that billing account's data from management and end-consumer reporting. [MSP administration FAQ](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-msp/saas?topic=administration-faq)

## Make future archives intentional

Before archiving a payer, record the final complete billing period, retained export location, downstream consumers, and person responsible for any future reprocessing. Include an explicit check that the organization no longer needs new data through that connection.

Monitor data freshness separately from whether a dashboard renders. A chart containing old values can remain visually convincing for days. The useful recovery signal is that expected periods and account totals reconcile, not simply that the archived account has been replaced by a new credential row.
