# Validation Summary: How to Implement Active-Active Configuration

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- Active-active and active-passive high availability architecture
- AWS Route 53 and Terraform
- Kubernetes Deployments, topology spread constraints, and Pod Disruption Budgets
- CAP theorem and conflict resolution
- PostgreSQL BDR / EDB Postgres Distributed
- CockroachDB Operator and multi-region SQL
- Apache Cassandra and the DataStax Python driver
- Redis Enterprise Active-Active databases and go-redis
- Prometheus federation and alerting rules
- Chaos Mesh NetworkChaos and workflows

## Sources Consulted
- HashiCorp Terraform AWS provider Route 53 health check resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Kubernetes Pod Disruption Budget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- AWS EKS guidance for spreading workloads across nodes and Availability Zones: https://docs.aws.amazon.com/prescriptive-guidance/latest/ha-resiliency-amazon-eks-apps/spread-workloads.html
- EDB Postgres Distributed node creation and joining documentation: https://www.enterprisedb.com/docs/pgd/latest/node_management/creating_and_joining/
- EDB Postgres Distributed conflict functions reference: https://www.enterprisedb.com/docs/pgd/latest/reference/tables-views-functions/conflict_functions/
- CockroachDB Operator deployment documentation: https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-cockroachdb-operator
- CockroachDB Operator CrdbCluster CRD: https://github.com/cockroachdb/cockroach-operator/blob/master/config/crd/bases/crdb.cockroachlabs.com_crdbclusters.yaml
- CockroachDB release overview: https://www.cockroachlabs.com/docs/releases/
- Redis Enterprise Active-Active database API reference: https://redis.io/docs/latest/operate/kubernetes/reference/api/redis_enterprise_active_active_database_api/
- Redis Enterprise database API reference: https://redis.io/docs/latest/operate/kubernetes/reference/api/redis_enterprise_database_api/
- go-redis package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- DataStax Python driver policy documentation: https://docs.datastax.com/en/developer/python-driver/3.19/api/cassandra/policies/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/

## Issues Found
- The Route 53 Terraform comment said the example created weighted routing, but the records use `latency_routing_policy`. Updated the comment to say latency-based routing.
- The CAP theorem examples were too broad for PostgreSQL and MySQL. Clarified that CP behavior applies when they are configured with synchronous replication, and softened the Cassandra/DynamoDB AP claim to reflect tunable or eventual consistency.
- The BDR conflict detection calls used unsupported parameters (`detect_cid` and `column_list`). Updated them to the documented `bdr.alter_table_conflict_detection(relation, method, column_name)` form.
- The CockroachDB Operator example used non-existent `topology.localities` and `topology.nodeLocality` fields. Replaced them with the supported `topologySpreadConstraints` field and node-label locality guidance.
- The CockroachDB image tag was outdated. Updated it from `v23.2.0` to the current release example `v26.2.2`.
- The Cassandra `EACH_QUORUM` explanation said data is replicated everywhere. Changed it to say the write requires a quorum in every datacenter, which is the precise consistency guarantee.
- The Redis Enterprise Active-Active CRD used incorrect fields (`apiEndpoint`, `globalDatabaseSpec`, `activeActive`, `causalConsistency`, `aofPolicy`). Updated the snippet to use documented `participatingClusters`, `globalConfigurations`, `ossCluster`, `shardingEnabled`, and `persistence: aofEverySecond`.
- The go-redis comment implied replica reads were universally safe because of Redis Enterprise CRDB consistency. Changed it to state the actual `RouteByLatency` behavior.
- The Chaos Mesh example used `externalTargets` with `direction: both`, but Chaos Mesh documents `externalTargets` as working only with `direction: to`. Updated that scheduled experiment to use `direction: to`.
- The best-practice section said perfect synchronization is impossible across WAN links. Reworded it to describe the actual trade-off: strong WAN synchronization increases latency and can reduce availability during partitions.

## Review Notes
- Python snippets were extracted and compiled successfully with `python3`.
- `go`, `gofmt`, `terraform`, and `kubectl` were not installed in the review environment, so local CLI validation for those snippets could not be run.
- The Kubernetes examples contain placeholder values such as `${SITE_NAME}` and illustrative internal hostnames; these require templating or replacement before direct application.
