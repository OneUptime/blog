# Validation Summary: How to Plan K8s Cluster Migration with Canary Traffic Shifting Between Old and

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubernetes Ingress
- ingress-nginx
- Argo CD ApplicationSet
- Flux
- Terraform
- AWS Route 53
- AWS RDS
- Prometheus
- Grafana
- PostgreSQL logical replication
- Python
- boto3
- Velero

## Sources Consulted
- AWS Route 53 weighted alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html
- AWS Route 53 ChangeResourceRecordSets API: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- Terraform AWS provider `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS CLI `rds create-db-instance-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Argo CD ApplicationSet generators: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Prometheus federation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.0/querying/api/
- PostgreSQL logical replication: https://www.postgresql.org/docs/current/logical-replication.html
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- ingress-nginx sticky sessions: https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Velero resource filtering: https://velero.io/docs/v1.10/resource-filtering/

## Issues Found
- The Route 53 pseudo-YAML used `ResourceRecords` with ELB DNS names under `Type: A`. Route 53 A records that target ELB DNS names should use alias records, or a CNAME for non-apex names. Changed the example to use `AliasTarget` fields with hosted zone IDs and target health evaluation.
- The AWS RDS cross-region read replica command used a plain source DB identifier while creating the replica in another region. AWS CLI documentation requires cross-region handling such as a source ARN and `--source-region`. Updated the example to use an ARN and `--source-region us-east-1`.
- The Python rollback script's Route 53 `UPSERT` examples omitted the alias target details required for the weighted alias A records described earlier. Added `AliasTarget` blocks for both old and new cluster records.
- The Python Prometheus query placed the raw PromQL expression directly in the URL. Updated the request to use `params={'query': query}`, a timeout, and `raise_for_status()` so the query is encoded and failures are surfaced.
- The session affinity section implied an ingress-nginx cookie would keep users on the same cluster. ingress-nginx affinity applies within the cluster after traffic reaches that ingress controller. Updated the wording to require global-load-balancer affinity for cluster stickiness and describe the ingress cookie as within-cluster backend affinity.

## Review Notes
- The Route 53 traffic shifting examples are DNS-weighted routing. DNS caching and client resolver behavior can make observed traffic percentages approximate rather than exact.
- The database examples are illustrative. A read replica is appropriate for read traffic or pre-cutover replication, but write traffic during a canary migration needs a deliberately designed writable/shared data strategy.
