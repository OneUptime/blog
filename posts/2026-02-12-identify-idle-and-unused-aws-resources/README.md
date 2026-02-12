# How to Identify Idle and Unused AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Optimization, Resource Management, CloudWatch

Description: Find and clean up idle EC2 instances, unused EBS volumes, stale load balancers, and other AWS resources that are costing you money for no reason.

---

Every AWS account accumulates waste over time. Developers spin up instances for testing and forget to terminate them. Teams create load balancers for services that got decommissioned months ago. Snapshots pile up from automated backup jobs that nobody remembered to configure with retention policies.

The numbers are staggering. Studies consistently show that 30-35% of cloud spending is wasted on idle or unused resources. For a company spending $100K/month on AWS, that's $30K going nowhere.

Let's find and fix this waste systematically.

## Idle EC2 Instances

An idle EC2 instance is one that's running but doing no useful work. The most reliable indicator is low CPU utilization over an extended period.

```bash
# Find EC2 instances with average CPU below 5% over the past 14 days
for instance_id in $(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text); do

  avg_cpu=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=$instance_id \
    --start-time $(date -v-14d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d "14 days ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date +%Y-%m-%dT%H:%M:%S) \
    --period 1209600 \
    --statistics Average \
    --query "Datapoints[0].Average" \
    --output text 2>/dev/null)

  if [ "$avg_cpu" != "None" ] && [ "$avg_cpu" != "" ]; then
    is_idle=$(python3 -c "print('IDLE' if float('$avg_cpu') < 5 else 'OK')" 2>/dev/null)
    if [ "$is_idle" = "IDLE" ]; then
      echo "$instance_id: avg CPU ${avg_cpu}%"
    fi
  fi
done
```

For a more comprehensive analysis, use this Python script:

```python
import boto3
from datetime import datetime, timedelta

ec2 = boto3.client('ec2')
cw = boto3.client('cloudwatch')

def find_idle_instances(cpu_threshold=5, network_threshold=1000000, days=14):
    """Find instances that are idle based on CPU and network metrics"""
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    idle_instances = []

    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_type = instance['InstanceType']
            tags = {t['Key']: t['Value'] for t in instance.get('Tags', [])}
            name = tags.get('Name', 'unnamed')

            # Check CPU utilization
            cpu_stats = cw.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=days * 86400,
                Statistics=['Average', 'Maximum']
            )

            # Check network traffic
            net_stats = cw.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='NetworkIn',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=days * 86400,
                Statistics=['Sum']
            )

            avg_cpu = cpu_stats['Datapoints'][0]['Average'] if cpu_stats['Datapoints'] else 0
            max_cpu = cpu_stats['Datapoints'][0]['Maximum'] if cpu_stats['Datapoints'] else 0
            net_in = net_stats['Datapoints'][0]['Sum'] if net_stats['Datapoints'] else 0

            if avg_cpu < cpu_threshold and net_in < network_threshold:
                idle_instances.append({
                    'id': instance_id,
                    'name': name,
                    'type': instance_type,
                    'avg_cpu': round(avg_cpu, 2),
                    'max_cpu': round(max_cpu, 2),
                    'net_in_mb': round(net_in / 1048576, 2)
                })

    # Print results
    print(f"\n{'Instance ID':<22} {'Name':<25} {'Type':<15} {'Avg CPU%':<10} {'Max CPU%':<10} {'Net In MB'}")
    print("-" * 100)
    for i in idle_instances:
        print(f"{i['id']:<22} {i['name']:<25} {i['type']:<15} {i['avg_cpu']:<10} {i['max_cpu']:<10} {i['net_in_mb']}")

    return idle_instances

find_idle_instances()
```

## Unattached EBS Volumes

Volumes in "available" state aren't attached to any instance. They're almost always safe to delete (after snapshotting as a precaution).

```bash
# Find unattached volumes with their size and estimated monthly cost
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[].{
    VolumeId: VolumeId,
    SizeGB: Size,
    Type: VolumeType,
    Created: CreateTime,
    AZ: AvailabilityZone
  }" \
  --output table
```

For a deeper dive on cleaning these up, see our guide on [reducing EBS costs by deleting unused volumes and snapshots](https://oneuptime.com/blog/post/reduce-ebs-costs-by-deleting-unused-volumes-and-snapshots/view).

## Unused Elastic Load Balancers

Load balancers cost $16-$22/month just for existing, plus per-hour charges. Ones with no targets or no traffic are pure waste.

```python
import boto3

elbv2 = boto3.client('elbv2')
cw = boto3.client('cloudwatch')
from datetime import datetime, timedelta

def find_unused_load_balancers():
    """Find ALBs and NLBs with no healthy targets or zero traffic"""
    lbs = elbv2.describe_load_balancers()['LoadBalancers']

    unused = []

    for lb in lbs:
        lb_arn = lb['LoadBalancerArn']
        lb_name = lb['LoadBalancerName']
        lb_type = lb['Type']

        # Check target groups
        target_groups = elbv2.describe_target_groups(
            LoadBalancerArn=lb_arn
        )['TargetGroups']

        has_healthy_targets = False
        for tg in target_groups:
            health = elbv2.describe_target_health(
                TargetGroupArn=tg['TargetGroupArn']
            )
            healthy = [t for t in health['TargetHealthDescriptions']
                      if t['TargetHealth']['State'] == 'healthy']
            if healthy:
                has_healthy_targets = True
                break

        # Check request count (for ALBs)
        metric_name = 'RequestCount' if lb_type == 'application' else 'ActiveFlowCount'
        dimension_name = 'LoadBalancer'
        dimension_value = '/'.join(lb_arn.split('/')[-3:])

        traffic = cw.get_metric_statistics(
            Namespace='AWS/ApplicationELB' if lb_type == 'application' else 'AWS/NetworkELB',
            MetricName=metric_name,
            Dimensions=[{'Name': dimension_name, 'Value': dimension_value}],
            StartTime=datetime.utcnow() - timedelta(days=7),
            EndTime=datetime.utcnow(),
            Period=604800,
            Statistics=['Sum']
        )

        total_traffic = traffic['Datapoints'][0]['Sum'] if traffic['Datapoints'] else 0

        if not has_healthy_targets or total_traffic == 0:
            reason = []
            if not has_healthy_targets:
                reason.append("no healthy targets")
            if total_traffic == 0:
                reason.append("zero traffic in 7 days")

            unused.append({
                'name': lb_name,
                'type': lb_type,
                'reason': ', '.join(reason)
            })

    for u in unused:
        print(f"UNUSED: {u['name']} ({u['type']}) - {u['reason']}")

    return unused

find_unused_load_balancers()
```

## Unused Elastic IPs

Unattached Elastic IPs cost $3.60/month each:

```bash
# Find all unattached Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null].{
    IP: PublicIp,
    AllocationId: AllocationId
  }" \
  --output table
```

## Idle RDS Instances

Look for RDS instances with near-zero connections:

```python
import boto3
from datetime import datetime, timedelta

rds = boto3.client('rds')
cw = boto3.client('cloudwatch')

def find_idle_rds():
    """Find RDS instances with zero or near-zero connections"""
    instances = rds.describe_db_instances()['DBInstances']

    for db in instances:
        db_id = db['DBInstanceIdentifier']

        connections = cw.get_metric_statistics(
            Namespace='AWS/RDS',
            MetricName='DatabaseConnections',
            Dimensions=[{'Name': 'DBInstanceIdentifier', 'Value': db_id}],
            StartTime=datetime.utcnow() - timedelta(days=7),
            EndTime=datetime.utcnow(),
            Period=604800,
            Statistics=['Maximum']
        )

        max_connections = connections['Datapoints'][0]['Maximum'] if connections['Datapoints'] else 0

        if max_connections < 1:
            monthly_cost = estimate_rds_cost(db['DBInstanceClass'], db.get('MultiAZ', False))
            print(f"IDLE: {db_id} ({db['DBInstanceClass']}) - max connections: {max_connections} "
                  f"- est. ${monthly_cost}/mo")

def estimate_rds_cost(instance_class, multi_az):
    """Rough monthly cost estimate for common RDS instance types"""
    base_costs = {
        'db.t3.micro': 12, 'db.t3.small': 24, 'db.t3.medium': 49,
        'db.r5.large': 175, 'db.r5.xlarge': 350, 'db.r6g.large': 158,
        'db.r6g.xlarge': 316
    }
    cost = base_costs.get(instance_class, 100)
    return cost * 2 if multi_az else cost

find_idle_rds()
```

## Unused NAT Gateways

NAT Gateways with no traffic are costing $32/month each:

```bash
# Check NAT Gateway traffic over the past 7 days
for nat_id in $(aws ec2 describe-nat-gateways \
  --filter "Name=state,Values=available" \
  --query "NatGateways[].NatGatewayId" \
  --output text); do

  bytes=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/NATGateway \
    --metric-name BytesOutToDestination \
    --dimensions Name=NatGatewayId,Value=$nat_id \
    --start-time $(date -v-7d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d "7 days ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date +%Y-%m-%dT%H:%M:%S) \
    --period 604800 \
    --statistics Sum \
    --query "Datapoints[0].Sum" \
    --output text)

  if [ "$bytes" = "None" ] || [ "$bytes" = "0.0" ]; then
    echo "UNUSED NAT Gateway: $nat_id - zero traffic in 7 days (\$32/mo)"
  fi
done
```

## Stale Snapshots

Snapshots that are older than your retention requirement and not associated with any AMI:

```python
import boto3
from datetime import datetime, timedelta, timezone

ec2 = boto3.client('ec2')

def find_stale_snapshots(retention_days=90):
    """Find snapshots older than retention period not used by any AMI"""
    # Get all AMIs owned by this account
    images = ec2.describe_images(Owners=['self'])
    ami_snapshot_ids = set()
    for image in images['Images']:
        for bdm in image.get('BlockDeviceMappings', []):
            if 'Ebs' in bdm:
                ami_snapshot_ids.add(bdm['Ebs']['SnapshotId'])

    # Find old snapshots not used by AMIs
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])['Snapshots']

    stale = []
    total_size = 0

    for snap in snapshots:
        if snap['StartTime'] < cutoff and snap['SnapshotId'] not in ami_snapshot_ids:
            stale.append(snap)
            total_size += snap['VolumeSize']

    print(f"Found {len(stale)} stale snapshots ({total_size}GB)")
    print(f"Estimated monthly cost: ${total_size * 0.05:.2f}")

    return stale

find_stale_snapshots()
```

## All-in-One Audit Script

Here's a comprehensive script that checks everything:

```python
import boto3
from datetime import datetime, timedelta

def full_idle_resource_audit():
    """Comprehensive audit of all idle/unused AWS resources"""
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    elbv2 = boto3.client('elbv2')

    total_monthly_waste = 0

    print("=" * 60)
    print("AWS Idle Resource Audit Report")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    # Unattached EBS volumes
    volumes = ec2.describe_volumes(Filters=[{'Name': 'status', 'Values': ['available']}])
    vol_cost = sum(v['Size'] * 0.08 for v in volumes['Volumes'])
    print(f"\nUnattached EBS Volumes: {len(volumes['Volumes'])} (est. ${vol_cost:.2f}/mo)")
    total_monthly_waste += vol_cost

    # Unattached Elastic IPs
    addresses = ec2.describe_addresses()
    unattached_eips = [a for a in addresses['Addresses'] if 'AssociationId' not in a]
    eip_cost = len(unattached_eips) * 3.60
    print(f"Unattached Elastic IPs: {len(unattached_eips)} (est. ${eip_cost:.2f}/mo)")
    total_monthly_waste += eip_cost

    # Old snapshots (over 90 days)
    cutoff = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])['Snapshots']
    old_snaps = [s for s in snapshots
                 if s['StartTime'].replace(tzinfo=None) < datetime.utcnow() - timedelta(days=90)]
    snap_size = sum(s['VolumeSize'] for s in old_snaps)
    snap_cost = snap_size * 0.05
    print(f"Snapshots older than 90 days: {len(old_snaps)} ({snap_size}GB, est. ${snap_cost:.2f}/mo)")
    total_monthly_waste += snap_cost

    print(f"\n{'='*60}")
    print(f"TOTAL ESTIMATED MONTHLY WASTE: ${total_monthly_waste:.2f}")
    print(f"ANNUAL SAVINGS POTENTIAL: ${total_monthly_waste * 12:.2f}")

full_idle_resource_audit()
```

## Next Steps

Finding idle resources is just the beginning. For automated cleanup, see our post on [automating cost optimization with Lambda and CloudWatch](https://oneuptime.com/blog/post/automate-cost-optimization-with-lambda-and-cloudwatch/view). For AWS's built-in recommendations, check out [using Trusted Advisor for cost optimization](https://oneuptime.com/blog/post/use-trusted-advisor-for-cost-optimization-recommendations/view).

The most important habit is running these audits regularly - weekly or monthly. The waste accumulates slowly, and without consistent checks, it just keeps growing.
