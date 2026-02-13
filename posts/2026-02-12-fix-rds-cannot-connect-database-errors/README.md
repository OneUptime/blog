# How to Fix RDS 'Cannot Connect to Database' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Database, Networking, Troubleshooting

Description: Troubleshoot and fix RDS connection failures caused by security groups, subnet configuration, parameter groups, and authentication issues.

---

You're trying to connect to your RDS instance and it just hangs or times out. Or maybe you get a flat-out "connection refused" error. Either way, your application can't reach the database and everything is broken.

RDS connection failures are among the most common AWS issues, and they're almost always caused by networking configuration. Let's work through every possible cause.

## Step 1: Is the RDS Instance Running?

Let's start with the obvious. Check if your database is actually available:

```bash
# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port,AZ:AvailabilityZone}'
```

The status should be `available`. If it's `creating`, `modifying`, `rebooting`, or `maintenance`, wait for it to finish.

If the status is `stopped`, start it:

```bash
aws rds start-db-instance --db-instance-identifier my-database
```

## Step 2: Check Security Groups

This is the number one cause of RDS connection failures. The security group attached to your RDS instance must allow inbound traffic on the database port from wherever you're connecting.

```bash
# Get the RDS security group(s)
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].VpcSecurityGroups[*].VpcSecurityGroupId' \
  --output text)

echo "RDS Security Groups: $RDS_SG"

# Check inbound rules
aws ec2 describe-security-groups \
  --group-ids $RDS_SG \
  --query 'SecurityGroups[*].IpPermissions[*].{Port:FromPort,Protocol:IpProtocol,Sources:IpRanges[*].CidrIp,SourceGroups:UserIdGroupPairs[*].GroupId}'
```

You need an inbound rule allowing traffic on the database port:
- MySQL/MariaDB: port 3306
- PostgreSQL: port 5432
- SQL Server: port 1433
- Oracle: port 1521

Add the rule if it's missing:

```bash
# Allow connections from a specific IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 3306 \
  --cidr 203.0.113.45/32

# Or allow connections from an EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 3306 \
  --source-group sg-0def456
```

## Step 3: Check if RDS is Publicly Accessible

If you're connecting from outside the VPC (like from your laptop), the RDS instance must have `PubliclyAccessible` set to `true` AND be in a public subnet (one with a route to an Internet Gateway).

```bash
# Check public accessibility
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].PubliclyAccessible'
```

If it returns `false` and you need to connect from outside the VPC:

```bash
# Make the instance publicly accessible (requires the subnet to be public)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --publicly-accessible \
  --apply-immediately
```

But if your instance is in a private subnet (which is the security best practice), you can't make it publicly accessible. Instead, use one of these alternatives:

- SSH tunnel through a bastion host
- AWS Systems Manager Session Manager port forwarding
- AWS Client VPN

```bash
# Port forwarding through SSM (EC2 in the same VPC)
aws ssm start-session \
  --target i-0abc123def456 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["my-database.abc123.us-east-1.rds.amazonaws.com"],"portNumber":["3306"],"localPortNumber":["3306"]}'
```

## Step 4: Check the Subnet Group

RDS must be in a subnet group that has subnets in the right AZs with proper routing:

```bash
# Check the DB subnet group
aws rds describe-db-subnet-groups \
  --db-subnet-group-name my-subnet-group \
  --query 'DBSubnetGroups[0].{Subnets:Subnets[*].{SubnetId:SubnetIdentifier,AZ:SubnetAvailabilityZone.Name,Status:SubnetStatus}}'
```

All subnets should show `Active` status.

## Step 5: Check NACLs (Network ACLs)

NACLs are stateless firewalls at the subnet level. Even if security groups are correct, NACLs might be blocking traffic:

```bash
# Get the subnet's NACL
SUBNET_ID="subnet-0abc123"
NACL_ID=$(aws ec2 describe-network-acls \
  --filters Name=association.subnet-id,Values=$SUBNET_ID \
  --query 'NetworkAcls[0].NetworkAclId' --output text)

# Check NACL rules
aws ec2 describe-network-acls \
  --network-acl-ids $NACL_ID \
  --query 'NetworkAcls[0].Entries[*].{RuleNumber:RuleNumber,Protocol:Protocol,RuleAction:RuleAction,CidrBlock:CidrBlock,PortRange:PortRange}'
```

NACLs need both inbound AND outbound rules (they're stateless, unlike security groups). Make sure there's an allow rule for the database port in both directions.

## Step 6: Check DNS Resolution

If you're using the RDS endpoint hostname and DNS resolution isn't working, you'll fail to connect:

```bash
# Test DNS resolution (from an EC2 instance in the same VPC)
nslookup my-database.abc123.us-east-1.rds.amazonaws.com

# Or with dig
dig my-database.abc123.us-east-1.rds.amazonaws.com
```

If DNS doesn't resolve, check VPC DNS settings:

```bash
aws ec2 describe-vpc-attribute --vpc-id vpc-0abc123 --attribute enableDnsSupport
aws ec2 describe-vpc-attribute --vpc-id vpc-0abc123 --attribute enableDnsHostnames
```

Both should return `true`.

## Step 7: Check Authentication

If you can reach the instance but authentication fails, you'll see errors like:

```
Access denied for user 'admin'@'10.0.1.45' (using password: YES)
```

For MySQL/MariaDB:

```bash
# Test connection with mysql client
mysql -h my-database.abc123.us-east-1.rds.amazonaws.com \
  -u admin -p -P 3306

# If password is wrong, reset it
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --master-user-password "NewSecurePassword123!" \
  --apply-immediately
```

For PostgreSQL:

```bash
psql -h my-database.abc123.us-east-1.rds.amazonaws.com \
  -U admin -d mydb -p 5432
```

## Step 8: Check Max Connections

If the database has reached its maximum connection limit, new connections will be refused:

```bash
# Check max_connections parameter
aws rds describe-db-parameters \
  --db-parameter-group-name my-parameter-group \
  --query "Parameters[?ParameterName=='max_connections'].{Name:ParameterName,Value:ParameterValue}"
```

The default max_connections varies by instance class. Small instances like `db.t3.micro` might only allow 60-80 connections.

If you're running out of connections, consider:

1. Using RDS Proxy for connection pooling
2. Upgrading to a larger instance class
3. Closing idle connections in your application

## Comprehensive Debugging Script

Here's a script that checks the most common issues:

```bash
DB_IDENTIFIER="my-database"

echo "=== Instance Status ==="
aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].{Status:DBInstanceStatus,PubliclyAccessible:PubliclyAccessible,Endpoint:Endpoint.Address,Port:Endpoint.Port}'

echo "=== Security Groups ==="
SG=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)
aws ec2 describe-security-groups --group-ids $SG \
  --query 'SecurityGroups[0].IpPermissions'

echo "=== Subnet Group ==="
aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].DBSubnetGroup.Subnets[*].{SubnetId:SubnetIdentifier,AZ:SubnetAvailabilityZone.Name}'

echo "=== Parameter Group ==="
aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER \
  --query 'DBInstances[0].DBParameterGroups'
```

## Prevention

Set up connection monitoring so you know about issues before your users do. [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can monitor your RDS connectivity and alert you the moment connections start failing.

Key CloudWatch metrics to watch:
- `DatabaseConnections` - Current connection count
- `FreeableMemory` - Low memory can cause connection issues
- `CPUUtilization` - High CPU can cause timeouts

Database connectivity problems are the kind of issue that cascades quickly. One broken connection turns into a flood of errors across your entire application. Early detection is everything.
