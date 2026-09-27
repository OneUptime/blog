# Validation Summary: How to Bring AWS Account-Level Tags into Cloudability Cost Reports

## Status
validated

## Post Type
Technical guide with an AWS CLI diagnostic command and Cloudability integration and reporting instructions.

## Technologies Covered
- AWS Organizations account tags
- AWS CLI and the ListTagsForResource API
- AWS IAM integration permissions and assumed roles
- IBM Cloudability Tags & Labels mapping and cost reporting
- AWS Cost and Usage Reports (CUR)
- FinOps cost allocation and historical chargeback reporting

## Sources Consulted
- AWS Organizations ListTagsForResource API: https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListTagsForResource.html
- AWS CLI list-tags-for-resource command reference: https://docs.aws.amazon.com/cli/latest/reference/organizations/list-tags-for-resource.html
- AWS Organizations tagging guide: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_tagging.html
- IBM Cloudability Tag and Label Mapping: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=spend-cloudability-tag-label-mapping
- IBM Cloudability AWS Tags: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=guide-support-aws-tags
- IBM support guidance on AWS resource/account tag precedence: https://www.ibm.com/support/pages/aws-resource-level-tag-value-not-appearing-reports-when-both-resource-tag-and-account-level-tag-exist-same-key
- IBM Cloudability Cost and Usage Data availability in Reporting: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=reports-cost-usage-data-availability-in-reporting

## Issues Found
No technical issues found.

## Review Notes
- The README was reviewed in full and left unchanged. It contains one shell command, no configuration files, and no version-pinned dependencies.
- The command uses the documented Organizations subcommand, required resource ID option, and valid JSON output option. The illustrative account ID has the required 12-digit format. AWS confirms that the API accepts account IDs and restricts callers to management or delegated administrator accounts. Account, OU, and root tags refer to distinct Organizations resources.
- IBM confirms the additional organizations:ListTagsForResource permission, the cldy:aws:accountLevelTag:<tag key> identifier, and the Cloudability Gov limitation. Its AWS integration guidance also supports checking the deployed Cloudability role and credential verification.
- IBM support confirms ordered evaluation with the first nonempty identifier winning and the invalidity of an invented AWS resource-tag prefix. Selecting the ingested identifier is appropriate because IBM documentation describes different resource-tag formats for legacy CUR and CUR 2.0; the post does not hard-code a potentially incompatible resource identifier.
- Resource tags must be available in billing data, including AWS cost allocation tag activation where applicable. The guide assumes an ingested resource identifier already exists. Its missing/unallocated table entry is illustrative, not a promise of an exact UI label.
- Historical mapping changes can require reprocessing before completed-period reports reflect them. Reprocessing uses stored billing data; refetching retrieves source data again. IBM also documents that refetching hierarchical account tags can apply their current values to the refetched history. The post appropriately asks readers to agree the historical scope before either operation.
- The acceptance scenarios are proposed checks, not claimed test results. No live AWS request or Cloudability tenant test was performed; validation was against official documentation. No deprecated command or API was identified.
- All technical references correspond to the intended official resources. Direct retrieval of the IBM links initially failed with access/cache errors; their substantive content was available through search-indexed versions of those same official pages. The author link also resolved to the expected GitHub profile.
