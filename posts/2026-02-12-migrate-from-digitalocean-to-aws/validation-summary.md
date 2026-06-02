# Validation Summary: How to Migrate from DigitalOcean to AWS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- Amazon RDS for PostgreSQL
- Amazon S3
- Amazon EKS
- Amazon Route 53
- AWS CLI
- boto3
- DigitalOcean Droplets
- DigitalOcean Managed Databases
- DigitalOcean Spaces
- DigitalOcean Kubernetes
- doctl
- rclone
- kubectl
- PostgreSQL pg_dump and pg_restore

## Sources Consulted
- AWS boto3 EC2 create_vpc documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/create_vpc.html
- AWS boto3 RDS create_db_instance documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/create_db_instance.html
- Amazon RDS for PostgreSQL version documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- DigitalOcean snapshots support documentation: https://docs.digitalocean.com/products/snapshots/support/
- DigitalOcean Spaces S3 compatibility documentation: https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/
- rclone S3 backend documentation for DigitalOcean Spaces: https://rclone.org/s3/
- AWS CLI s3 sync documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI endpoint documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-endpoints.html
- eksctl managed node group documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Kubernetes kubectl get documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get
- Amazon Route 53 ChangeResourceRecordSets API documentation: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- DigitalOcean Domain Records API documentation: https://docs.digitalocean.com/products/networking/dns/reference/api/domain-records/
- doctl domain command documentation: https://docs.digitalocean.com/reference/doctl/reference/compute/domain/list/

## Issues Found
- DigitalOcean snapshot export was described as available. DigitalOcean documentation says Droplet backups and snapshots cannot currently be downloaded directly, so the text now states that snapshots can be created but not downloaded/exported for direct AWS import.
- The EC2 application migration example mixed Ubuntu package commands with the Amazon Linux default `ec2-user` username and did not copy or restore the generated Python requirements file. The example now targets an Ubuntu EC2 instance with the `ubuntu` user, copies `python-requirements.txt`, and installs it with `pip3`.
- The database section was labeled PostgreSQL/MySQL, but the commands only covered PostgreSQL tooling. The heading now says PostgreSQL Migration.
- The RDS example pinned PostgreSQL `15.4`, which has reached the end of standard support on Amazon RDS. The code now uses `EngineVersion='15'` so RDS selects a currently available minor version for that major release.
- The RDS restore example used `your_database` without creating it. The `create_db_instance` example now includes `DBName='your_database'`.
- The RDS security group placeholder used an invalid-looking value. It now uses an `sg-...` shaped placeholder.
- The DMS statement promised zero downtime. It now says near-zero downtime, which is more accurate for migrations that still require a cutover.
- The AWS CLI Spaces-to-S3 example used one implicit credential set for both DigitalOcean Spaces and AWS S3. It now uses separate AWS CLI profiles.
- The Kubernetes export text claimed `kubectl get all` exported all resources. It now says common workload resources, and the specific export commands include `--all-namespaces`.
- The EKS manifest notes implied annotation and storage class replacements were enough. They now also mention installing the AWS Load Balancer Controller and the relevant EBS or EFS CSI driver.
- The Route 53 import example did not format MX record values with priority, did not quote TXT values, and could attempt an invalid apex CNAME. The script now formats MX and TXT records correctly and skips apex CNAME records.
- The S3 URL replacement guidance used a generic `*.s3.amazonaws.com` pattern. It now uses a region-aware virtual-hosted S3 URL example or CloudFront/custom domain.

## Review Notes
The post is technically relevant and contains substantial implementation details. The examples remain illustrative and still require users to substitute real VPC subnet groups, security groups, credentials, DNS profiles, Kubernetes add-ons, and region-specific values before running them in production.
