# How to Migrate from DigitalOcean to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DigitalOcean, Cloud Migration, EC2, RDS, S3, Migration

Description: A step-by-step guide for migrating workloads from DigitalOcean to AWS covering Droplets, managed databases, Spaces, and Kubernetes clusters.

---

DigitalOcean is a solid platform for small to medium workloads, but as your application grows, you might need the broader service ecosystem, global footprint, or enterprise features that AWS provides. The migration is straightforward since both are standard cloud platforms, but it requires methodical planning to avoid downtime.

This guide covers migrating DigitalOcean Droplets, Managed Databases, Spaces, and Kubernetes clusters to their AWS equivalents.

## Service Mapping

| DigitalOcean | AWS Equivalent | Notes |
|---|---|---|
| Droplets | EC2 instances | Similar concept, more instance types on AWS |
| Managed Databases | Amazon RDS | Direct migration possible |
| Spaces | Amazon S3 | S3-compatible API makes this easy |
| App Platform | ECS Fargate / Elastic Beanstalk | Managed container hosting |
| DOKS (Kubernetes) | Amazon EKS | Both run standard Kubernetes |
| Load Balancers | Application/Network Load Balancer | More features on AWS |
| Volumes | EBS volumes | Block storage |
| VPC | VPC | Similar networking concepts |
| DigitalOcean Functions | AWS Lambda | Serverless functions |
| Monitoring | CloudWatch | More comprehensive on AWS |

## Phase 1: Set Up AWS Infrastructure

### Create Your VPC

```python
# Create a VPC matching your DigitalOcean VPC layout
import boto3

ec2 = boto3.client('ec2')

# Create VPC
vpc = ec2.create_vpc(
    CidrBlock='10.0.0.0/16',
    TagSpecifications=[{
        'ResourceType': 'vpc',
        'Tags': [{'Key': 'Name', 'Value': 'migrated-from-do'}]
    }]
)
vpc_id = vpc['Vpc']['VpcId']

# Enable DNS
ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={'Value': True})

# Create public and private subnets
subnets = [
    ('10.0.1.0/24', 'us-east-1a', 'public-1'),
    ('10.0.2.0/24', 'us-east-1b', 'public-2'),
    ('10.0.3.0/24', 'us-east-1a', 'private-1'),
    ('10.0.4.0/24', 'us-east-1b', 'private-2'),
]

for cidr, az, name in subnets:
    ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock=cidr,
        AvailabilityZone=az,
        TagSpecifications=[{
            'ResourceType': 'subnet',
            'Tags': [{'Key': 'Name', 'Value': name}]
        }]
    )
```

## Phase 2: Migrate Droplets to EC2

### Option A: Image Export and Import

DigitalOcean allows you to create snapshots and export them. However, the format may not be directly importable to AWS. The most reliable approach is to use a fresh EC2 instance and migrate the application.

### Option B: Application-Level Migration (Recommended)

For most applications, recreating the server on AWS is cleaner than trying to import a disk image:

```bash
# On your DigitalOcean Droplet, create a list of installed packages
dpkg --get-selections > packages.txt
pip freeze > python-requirements.txt

# Archive application files
tar czf app-backup.tar.gz /var/www/myapp /etc/nginx /etc/systemd/system/myapp.service

# Copy to the new EC2 instance
scp app-backup.tar.gz packages.txt ec2-user@new-ec2-ip:/tmp/
```

On the new EC2 instance:

```bash
# Restore application
cd /tmp
tar xzf app-backup.tar.gz -C /

# Install the same packages
sudo dpkg --set-selections < packages.txt
sudo apt-get dselect-upgrade -y

# Restart services
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```

### Option C: Containerize and Deploy to ECS

If you are migrating anyway, this is a good time to containerize:

```dockerfile
# Containerize your application during migration
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    nginx \
    python3 \
    python3-pip

COPY requirements.txt /app/
RUN pip3 install -r /app/requirements.txt

COPY . /app/
COPY nginx.conf /etc/nginx/sites-available/default

EXPOSE 80
CMD ["bash", "-c", "service nginx start && python3 /app/main.py"]
```

## Phase 3: Migrate Managed Databases

### PostgreSQL/MySQL Migration

```bash
# Export from DigitalOcean Managed Database
pg_dump -h your-do-db-host.db.ondigitalocean.com \
  -p 25060 -U doadmin -d your_database \
  --format=custom --no-acl --no-owner \
  -f do_database_backup.dump
```

Create the RDS instance:

```python
# Create RDS instance matching your DO database specs
import boto3

rds = boto3.client('rds')

rds.create_db_instance(
    DBInstanceIdentifier='migrated-from-do',
    DBInstanceClass='db.t3.medium',  # Map from DO db size
    Engine='postgres',
    EngineVersion='15.4',
    MasterUsername='admin',
    MasterUserPassword='SecurePassword123!',
    AllocatedStorage=50,
    StorageType='gp3',
    VpcSecurityGroupIds=['sg-database'],
    DBSubnetGroupName='private-subnets',
    MultiAZ=True,
    StorageEncrypted=True,
    PubliclyAccessible=False
)
```

Restore the data:

```bash
# Restore to RDS
pg_restore --verbose --clean --no-acl --no-owner \
  -h migrated-from-do.abc123.us-east-1.rds.amazonaws.com \
  -U admin -d your_database \
  do_database_backup.dump
```

For zero-downtime migration, use [AWS DMS](https://oneuptime.com/blog/post/migrate-databases-to-aws-with-dms/view) for continuous replication from DigitalOcean to RDS.

## Phase 4: Migrate Spaces to S3

DigitalOcean Spaces is S3-compatible, which makes this migration particularly smooth. You can use standard S3 tools with custom endpoints.

### Using rclone (Recommended)

```bash
# Configure rclone for both providers
# In ~/.config/rclone/rclone.conf add:
# [do-spaces]
# type = s3
# provider = DigitalOcean
# env_auth = false
# access_key_id = YOUR_DO_KEY
# secret_access_key = YOUR_DO_SECRET
# endpoint = nyc3.digitaloceanspaces.com
#
# [aws-s3]
# type = s3
# provider = AWS
# access_key_id = YOUR_AWS_KEY
# secret_access_key = YOUR_AWS_SECRET
# region = us-east-1

# Sync from Spaces to S3
rclone sync do-spaces:my-bucket aws-s3:my-aws-bucket \
  --transfers 32 \
  --checkers 16 \
  --progress \
  --log-file sync.log
```

### Using AWS CLI with S3-Compatible Endpoint

```bash
# List objects in DO Spaces using AWS CLI
aws s3 ls s3://my-bucket/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com

# Copy from Spaces to S3 via a local intermediary
aws s3 sync s3://my-bucket/ /tmp/spaces-data/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com

aws s3 sync /tmp/spaces-data/ s3://my-aws-bucket/
```

For large datasets, use direct server-to-server transfer by running the sync from an EC2 instance for better bandwidth.

## Phase 5: Migrate Kubernetes (DOKS to EKS)

If you are running Kubernetes on DigitalOcean, the migration to EKS is relatively smooth since both run standard Kubernetes.

### Export Your Manifests

```bash
# Export all Kubernetes resources from DOKS
kubectl get all --all-namespaces -o yaml > all-resources.yaml

# Export specific resources
kubectl get deployments -o yaml > deployments.yaml
kubectl get services -o yaml > services.yaml
kubectl get configmaps -o yaml > configmaps.yaml
kubectl get secrets -o yaml > secrets.yaml
kubectl get ingress -o yaml > ingress.yaml
```

### Create EKS Cluster

```bash
# Create EKS cluster using eksctl
eksctl create cluster \
  --name migrated-from-do \
  --region us-east-1 \
  --nodegroup-name standard \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed
```

### Apply Manifests to EKS

Before applying, update cloud-specific references:
- Replace DigitalOcean load balancer annotations with AWS ALB annotations
- Replace DigitalOcean Spaces storage class with EBS or EFS storage class
- Update container registry references from DO Container Registry to ECR

```bash
# Update kubectl context to EKS
aws eks update-kubeconfig --name migrated-from-do --region us-east-1

# Apply the modified manifests
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml
kubectl apply -f configmaps.yaml
```

## Phase 6: Migrate DNS

Move DNS from DigitalOcean DNS to Route 53:

```bash
# Export DNS records from DigitalOcean
doctl compute domain records list your-domain.com --output json > dns-records.json
```

```python
# Import DNS records to Route 53
import boto3
import json

route53 = boto3.client('route53')

# Create hosted zone
zone = route53.create_hosted_zone(
    Name='your-domain.com',
    CallerReference='migration-from-do'
)
zone_id = zone['HostedZone']['Id']

# Read DO DNS records
with open('dns-records.json', 'r') as f:
    do_records = json.load(f)

# Map and create records
changes = []
for record in do_records:
    record_type = record['type']
    if record_type in ['A', 'AAAA', 'CNAME', 'MX', 'TXT']:
        changes.append({
            'Action': 'CREATE',
            'ResourceRecordSet': {
                'Name': f"{record['name']}.your-domain.com" if record['name'] != '@' else 'your-domain.com',
                'Type': record_type,
                'TTL': record['ttl'],
                'ResourceRecords': [
                    {'Value': record['data']}
                ]
            }
        })

if changes:
    route53.change_resource_record_sets(
        HostedZoneId=zone_id,
        ChangeBatch={'Changes': changes}
    )
```

## Phase 7: Update Application Configuration

Update all DigitalOcean-specific references in your application:

- Database connection strings pointing to DO managed databases
- Spaces URLs (replace `*.digitaloceanspaces.com` with `*.s3.amazonaws.com`)
- API keys and credentials
- Monitoring and logging endpoints

## Monitoring After Migration

Replace DigitalOcean Monitoring with CloudWatch, or use a third-party monitoring solution like [OneUptime](https://oneuptime.com) that works across both platforms during the transition period.

## Wrapping Up

Migrating from DigitalOcean to AWS is one of the more straightforward cloud-to-cloud migrations because the fundamental concepts (VMs, managed databases, object storage, Kubernetes) map closely between the two platforms. The S3-compatible API in Spaces makes storage migration especially easy. Take it service by service, run both environments in parallel during the transition, and cut over DNS only after thorough validation on the AWS side. The extra time spent validating saves you from emergency rollbacks.
