# Validation Summary: How to Configure Redshift Concurrency Scaling

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Amazon Redshift provisioned clusters
- Redshift workload management (WLM)
- Redshift concurrency scaling
- AWS CLI
- Amazon CloudWatch metrics and alarms
- AWS CloudFormation
- Redshift Serverless
- Python `redshift_connector`

## Sources Consulted
- Amazon Redshift concurrency scaling: https://docs.aws.amazon.com/redshift/latest/dg/concurrency-scaling.html
- Amazon Redshift WLM configuration: https://docs.aws.amazon.com/redshift/latest/mgmt/workload-mgmt-config.html
- Amazon Redshift WLM dynamic/static properties: https://docs.aws.amazon.com/redshift/latest/dg/cm-c-wlm-dynamic-properties.html
- Amazon Redshift `max_concurrency_scaling_clusters` parameter: https://docs.aws.amazon.com/redshift/latest/dg/r_max_concurrency_scaling_clusters.html
- AWS CLI `modify-cluster-parameter-group`: https://docs.aws.amazon.com/cli/latest/reference/redshift/modify-cluster-parameter-group.html
- AWS CLI `modify-cluster`: https://docs.aws.amazon.com/cli/latest/reference/redshift/modify-cluster.html
- Amazon Redshift `STL_QUERY`: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_QUERY.html
- Amazon Redshift `SVCS_CONCURRENCY_SCALING_USAGE`: https://docs.aws.amazon.com/redshift/latest/dg/r_SVCS_CONCURRENCY_SCALING_USAGE.html
- Amazon Redshift CloudWatch metrics: https://docs.aws.amazon.com/redshift/latest/mgmt/metrics-listing.html
- Redshift Serverless capacity: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-capacity.html
- Redshift Serverless `UpdateWorkgroup` API: https://docs.aws.amazon.com/redshift-serverless/latest/APIReference/API_UpdateWorkgroup.html
- AWS CloudFormation `AWS::Redshift::ClusterParameterGroup`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-redshift-clusterparametergroup.html
- Amazon Redshift pricing for concurrency scaling credits: https://aws.amazon.com/redshift/pricing/

## Issues Found
- The post said write queries such as `INSERT`, `UPDATE`, and `DELETE` only run on the main cluster. Current Redshift documentation supports several write operations on concurrency scaling clusters, including `COPY`, `INSERT`, `DELETE`, `UPDATE`, `CTAS`, `VACUUM`, and materialized view refreshes, with limitations. Updated the explanation, ETL guidance, routing comments, and best-practice wording.
- The post described scaling clusters as full copies of the main cluster's data. Updated this to the documented behavior that users see current data whether queries run on the main cluster or a concurrency-scaling cluster.
- The post used `aws redshift modify-cluster --max-concurrency-scaling-clusters`, but `max_concurrency_scaling_clusters` is a Redshift parameter configured through the cluster parameter group. Replaced the command with `modify-cluster-parameter-group`.
- The multi-queue WLM apply command used fragile inline shell escaping. Replaced it with the official AWS CLI `file://` parameter-file pattern and included an escaped `modify-wlm.json` example.
- The post unconditionally rebooted after enabling concurrency scaling. Redshift documents concurrency scaling mode as a dynamic WLM property, although some WLM or parameter-group changes can still be pending reboot. Updated the reboot instruction to be conditional.
- The monitoring query used `concurrency_scaling_status > 0`, but Redshift documents only `1` as a concurrency-scaling cluster; values greater than `1` mean the main cluster. Changed the filter to `= 1` and grouped the summary by the displayed location.
- The cost usage SQL summed individual query durations from `STL_QUERY`, which can misrepresent billable concurrency-scaling usage. Replaced it with `SVCS_CONCURRENCY_SCALING_USAGE`, the Redshift system view that records concurrency-scaling usage periods and seconds.
- The Serverless section said there are no WLM queues to configure. Redshift Serverless has its own WLM/config-parameter controls, but not provisioned-cluster concurrency scaling queues. Updated the wording accordingly.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI reference instead of local `--help` output.
- The post remains a high-level operational guide; it now notes that write-operation concurrency scaling has eligibility limits without expanding into every limitation.
