# How to Write Terratest Tests for AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terratest, AWS, Testing, Go, Infrastructure as Code

Description: Learn how to write Terratest tests that validate AWS resources like EC2 instances, S3 buckets, RDS databases, and VPCs after Terraform deployment.

---

Terratest includes a rich set of AWS helper modules that let you interact directly with AWS resources after Terraform creates them. Instead of just checking Terraform outputs, you can query the actual AWS API to verify that your infrastructure was created correctly. This guide walks through writing Terratest tests for the most common AWS resources.

## AWS Helper Modules

Terratest provides Go packages for interacting with AWS services. Import the ones you need:

```go
import (
    "context"
    "fmt"
    "testing"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)
```

Install the dependencies:

```bash
cd test
go get github.com/gruntwork-io/terratest/modules/aws \
  github.com/gruntwork-io/terratest/modules/random \
  github.com/gruntwork-io/terratest/modules/terraform \
  github.com/gruntwork-io/terratest/modules/retry \
  github.com/aws/aws-sdk-go-v2/aws \
  github.com/aws/aws-sdk-go-v2/config \
  github.com/aws/aws-sdk-go-v2/service/ec2 \
  github.com/aws/aws-sdk-go-v2/service/iam \
  github.com/aws/aws-sdk-go-v2/service/s3 \
  github.com/lib/pq \
  github.com/stretchr/testify
```

## Testing VPC Resources

Validate that a VPC and its subnets are created correctly:

```go
// test/vpc_test.go
package test

import (
    "context"
    "testing"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPC(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"

    opts := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "vpc_cidr":           "10.0.0.0/16",
            "environment":        "test",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
            "private_subnets":    []string{"10.0.1.0/24", "10.0.2.0/24"},
            "public_subnets":     []string{"10.0.101.0/24", "10.0.102.0/24"},
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Get the VPC ID from Terraform output
    vpcId := terraform.Output(t, opts, "vpc_id")

    // Use the AWS API to verify the VPC exists
    vpc := aws.GetVpcByIDContext(t, ctx, vpcId, awsRegion)
    assert.Equal(t, "10.0.0.0/16", *vpc.CidrBlock)

    // Verify subnets were created in the VPC
    subnets := aws.GetSubnetsForVpcContext(t, ctx, vpcId, awsRegion)
    assert.Equal(t, 4, len(subnets), "Should have 4 subnets (2 private + 2 public)")

    // Check that public subnets are routed as public subnets
    publicSubnetIds := terraform.OutputList(t, opts, "public_subnet_ids")
    for _, subnetId := range publicSubnetIds {
        assert.True(t, aws.IsPublicSubnetContext(t, ctx, subnetId, awsRegion),
            "Public subnets should have a route to an internet gateway")
    }
}
```

## Testing EC2 Instances

Verify that EC2 instances are running with the correct configuration:

```go
// test/ec2_test.go
package test

import (
    "context"
    "fmt"
    "testing"
    "time"

    awsv2 "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/ec2"
    ec2types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
    terratestaws "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestEC2Instance(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/ec2",
        Vars: map[string]interface{}{
            "name":          fmt.Sprintf("test-%s", uniqueId),
            "instance_type": "t3.micro",
            "environment":   "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Get the instance ID
    instanceId := terraform.Output(t, opts, "instance_id")

    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(awsRegion))
    require.NoError(t, err)

    ec2Client := ec2.NewFromConfig(cfg)
    result, err := ec2Client.DescribeInstances(ctx, &ec2.DescribeInstancesInput{
        InstanceIds: []string{instanceId},
    })
    require.NoError(t, err)
    require.Len(t, result.Reservations, 1)
    require.Len(t, result.Reservations[0].Instances, 1)

    instance := result.Reservations[0].Instances[0]

    // Verify instance is running
    assert.Equal(t, ec2types.InstanceStateNameRunning, instance.State.Name)

    // Verify instance type
    assert.Equal(t, ec2types.InstanceTypeT3Micro, instance.InstanceType)

    // Verify tags
    tags := terratestaws.GetTagsForEc2InstanceContext(t, ctx, awsRegion, instanceId)
    assert.Equal(t, fmt.Sprintf("test-%s", uniqueId), tags["Name"])
    assert.Equal(t, "test", tags["Environment"])

    // Verify the instance has a public IP (if expected)
    publicIp := terratestaws.GetPublicIPOfEc2InstanceContext(t, ctx, instanceId, awsRegion)
    assert.NotEmpty(t, publicIp)

    // Wait for the instance to pass health checks
    retry.DoWithRetry(t, "Wait for instance to be healthy", 10, 30*time.Second,
        func() (string, error) {
            statusResult, err := ec2Client.DescribeInstanceStatus(ctx, &ec2.DescribeInstanceStatusInput{
                InstanceIds:         []string{instanceId},
                IncludeAllInstances: awsv2.Bool(true),
            })
            if err != nil {
                return "", err
            }
            if len(statusResult.InstanceStatuses) != 1 {
                return "", fmt.Errorf("expected one instance status, got %d", len(statusResult.InstanceStatuses))
            }

            status := statusResult.InstanceStatuses[0]
            if status.InstanceStatus.Status != ec2types.SummaryStatusOk ||
                status.SystemStatus.Status != ec2types.SummaryStatusOk {
                return "", fmt.Errorf("instance or system status is not ok")
            }
            return "Instance is healthy", nil
        },
    )
}
```

## Testing S3 Buckets

Verify S3 bucket creation with encryption, versioning, and a bucket policy:

```go
// test/s3_test.go
package test

import (
    "context"
    "fmt"
    "testing"

    s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestS3Bucket(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()
    bucketName := fmt.Sprintf("test-bucket-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/s3",
        Vars: map[string]interface{}{
            "bucket_name":       bucketName,
            "enable_versioning": true,
            "enable_encryption": true,
            "environment":       "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify the bucket exists
    aws.AssertS3BucketExistsContext(t, ctx, awsRegion, bucketName)

    // Verify versioning is enabled
    versioning := aws.GetS3BucketVersioningContext(t, ctx, awsRegion, bucketName)
    assert.Equal(t, "Enabled", versioning)

    // Verify server-side encryption is configured
    aws.AssertS3BucketServerSideEncryptionContext(t, ctx, awsRegion, bucketName, s3types.ServerSideEncryptionAwsKms)

    // Verify bucket policy is configured
    policy := aws.GetS3BucketPolicyContext(t, ctx, awsRegion, bucketName)
    assert.NotEmpty(t, policy, "Bucket should have a policy")

    // Verify tags
    tags := aws.GetS3BucketTagsContext(t, ctx, awsRegion, bucketName)
    assert.Equal(t, "test", tags["Environment"])
}
```

## Testing RDS Databases

Verify RDS instance creation and connectivity:

```go
// test/rds_test.go
package test

import (
    "database/sql"
    "fmt"
    "testing"
    "time"

    _ "github.com/lib/pq"  // PostgreSQL driver
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestRDSDatabase(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/rds",
        Vars: map[string]interface{}{
            "identifier":     fmt.Sprintf("test-db-%s", uniqueId),
            "engine":         "postgres",
            "engine_version": "15.4",
            "instance_class": "db.t3.micro",
            "db_name":        "testdb",
            "username":       "testadmin",
            "password":       "TestPassword123!",
            "environment":    "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Get the database address and port
    endpoint := terraform.Output(t, opts, "db_address")
    port := terraform.Output(t, opts, "db_port")

    assert.NotEmpty(t, endpoint, "Database endpoint should not be empty")

    // Try to connect to the database with retries
    // RDS instances can take a few minutes to become available
    connStr := fmt.Sprintf(
        "host=%s port=%s user=testadmin password=TestPassword123! dbname=testdb sslmode=require",
        endpoint, port,
    )

    retry.DoWithRetry(t, "Connect to RDS", 10, 30*time.Second,
        func() (string, error) {
            db, err := sql.Open("postgres", connStr)
            if err != nil {
                return "", err
            }
            defer db.Close()

            // Verify the connection works
            err = db.Ping()
            if err != nil {
                return "", err
            }

            return "Connected successfully", nil
        },
    )
}
```

## Testing IAM Resources

Verify IAM roles and policies:

```go
// test/iam_test.go
package test

import (
    "context"
    "encoding/json"
    "fmt"
    "net/url"
    "testing"

    awsv2 "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/iam"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestIAMRole(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()
    expectedPrincipalService := "ec2.amazonaws.com"

    opts := &terraform.Options{
        TerraformDir: "../modules/iam",
        Vars: map[string]interface{}{
            "role_name":       fmt.Sprintf("test-role-%s", uniqueId),
            "trusted_service": expectedPrincipalService,
            "environment":     "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Get the role ARN
    roleArn := terraform.Output(t, opts, "role_arn")
    roleName := terraform.Output(t, opts, "role_name")

    // Verify the role exists
    assert.NotEmpty(t, roleArn)
    assert.Contains(t, roleArn, "arn:aws:iam")

    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(awsRegion))
    require.NoError(t, err)

    iamClient := iam.NewFromConfig(cfg)
    roleOutput, err := iamClient.GetRole(ctx, &iam.GetRoleInput{
        RoleName: awsv2.String(roleName),
    })
    require.NoError(t, err)
    require.NotNil(t, roleOutput.Role)

    // Verify the assume role policy allows the expected service
    decodedPolicy, err := url.QueryUnescape(awsv2.ToString(roleOutput.Role.AssumeRolePolicyDocument))
    require.NoError(t, err)

    var assumeRolePolicy map[string]interface{}
    err = json.Unmarshal([]byte(decodedPolicy), &assumeRolePolicy)
    assert.NoError(t, err)
    assert.Contains(t, decodedPolicy, expectedPrincipalService)

    // Verify attached policies
    policies, err := iamClient.ListAttachedRolePolicies(ctx, &iam.ListAttachedRolePoliciesInput{
        RoleName: awsv2.String(roleName),
    })
    require.NoError(t, err)
    assert.Greater(t, len(policies.AttachedPolicies), 0, "Role should have at least one policy attached")
}
```

## Testing Security Groups

Verify security group rules:

```go
// test/security_group_test.go
package test

import (
    "context"
    "fmt"
    "testing"

    awsv2 "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/ec2"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestSecurityGroup(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/security-group",
        Vars: map[string]interface{}{
            "name":        fmt.Sprintf("test-sg-%s", uniqueId),
            "vpc_id":      "vpc-existing123",  // Use an existing VPC
            "environment": "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    sgId := terraform.Output(t, opts, "security_group_id")

    // Query the SG directly from AWS
    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(awsRegion))
    require.NoError(t, err)

    ec2Client := ec2.NewFromConfig(cfg)
    result, err := ec2Client.DescribeSecurityGroups(ctx, &ec2.DescribeSecurityGroupsInput{
        GroupIds: []string{sgId},
    })
    require.NoError(t, err)
    require.Len(t, result.SecurityGroups, 1)

    sg := result.SecurityGroups[0]

    // Verify ingress rules allow HTTPS
    hasHttps := false
    for _, rule := range sg.IpPermissions {
        if awsv2.ToString(rule.IpProtocol) == "tcp" &&
            awsv2.ToInt32(rule.FromPort) == 443 &&
            awsv2.ToInt32(rule.ToPort) == 443 {
            hasHttps = true
            break
        }
    }
    assert.True(t, hasHttps, "Security group should allow HTTPS traffic")

    // Verify no rules allow all traffic from 0.0.0.0/0
    for _, rule := range sg.IpPermissions {
        for _, cidr := range rule.IpRanges {
            allProtocols := awsv2.ToString(rule.IpProtocol) == "-1"
            allTcpPorts := awsv2.ToString(rule.IpProtocol) == "tcp" &&
                awsv2.ToInt32(rule.FromPort) == 0 &&
                awsv2.ToInt32(rule.ToPort) == 65535

            if allProtocols || allTcpPorts {
                assert.NotEqual(t, "0.0.0.0/0", awsv2.ToString(cidr.CidrIp),
                    "Should not allow all traffic from 0.0.0.0/0")
            }
        }
    }
}
```

## Testing Lambda Functions

Deploy and invoke a Lambda function to verify it works:

```go
// test/lambda_test.go
package test

import (
    "context"
    "fmt"
    "testing"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestLambdaFunction(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/lambda",
        Vars: map[string]interface{}{
            "function_name": fmt.Sprintf("test-func-%s", uniqueId),
            "runtime":       "python3.12",
            "handler":       "index.handler",
            "environment":   "test",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    functionName := terraform.Output(t, opts, "function_name")

    // Invoke the Lambda function
    payload := []byte(`{"key": "value"}`)
    response := aws.InvokeFunctionContext(t, ctx, awsRegion, functionName, payload)

    // Verify the response
    assert.Contains(t, string(response), "200",
        "Lambda should return a success response")
}
```

## Running Tests Selectively

Use Go's test filtering to run specific tests:

```bash
# Run only VPC tests

go test -v -timeout 30m -run TestVPC

# Run only S3 tests
go test -v -timeout 30m -run TestS3

# Run all tests in parallel with a limit of 4
go test -v -timeout 45m -parallel 4
```

## Summary

Terratest's AWS helper modules let you go beyond checking Terraform outputs. You can query the actual AWS API to verify that VPCs have the right CIDR blocks, S3 buckets have encryption enabled, security groups have the correct rules, and Lambda functions return the expected responses. This level of validation catches issues that configuration-level tests miss.

For testing other cloud providers, see [How to Write Terratest Tests for Azure Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-azure-resources/view) and [How to Write Terratest Tests for GCP Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-gcp-resources/view).
