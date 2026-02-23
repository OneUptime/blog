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
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)
```

Install the dependencies:

```bash
cd test
go get github.com/gruntwork-io/terratest/modules/aws
```

## Testing VPC Resources

Validate that a VPC and its subnets are created correctly:

```go
// test/vpc_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVPC(t *testing.T) {
    t.Parallel()

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
    vpc := aws.GetVpcById(t, vpcId, awsRegion)
    assert.Equal(t, "10.0.0.0/16", *vpc.CidrBlock)

    // Verify subnets were created in the VPC
    subnets := aws.GetSubnetsForVpc(t, vpcId, awsRegion)
    assert.Equal(t, 4, len(subnets), "Should have 4 subnets (2 private + 2 public)")

    // Check that public subnets have public IP mapping
    publicSubnetIds := terraform.OutputList(t, opts, "public_subnet_ids")
    for _, subnetId := range publicSubnetIds {
        subnet := aws.GetSubnetById(t, subnetId, awsRegion)
        assert.True(t, *subnet.MapPublicIpOnLaunch,
            "Public subnets should map public IPs on launch")
    }
}
```

## Testing EC2 Instances

Verify that EC2 instances are running with the correct configuration:

```go
// test/ec2_test.go
package test

import (
    "testing"
    "fmt"
    "time"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestEC2Instance(t *testing.T) {
    t.Parallel()

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

    // Verify instance is running
    instance := aws.GetInstanceById(t, instanceId, awsRegion)
    assert.Equal(t, "running", instance.State)

    // Verify instance type
    assert.Equal(t, "t3.micro", instance.InstanceType)

    // Verify tags
    tags := aws.GetTagsForEc2Instance(t, awsRegion, instanceId)
    assert.Equal(t, fmt.Sprintf("test-%s", uniqueId), tags["Name"])
    assert.Equal(t, "test", tags["Environment"])

    // Verify the instance has a public IP (if expected)
    publicIp := terraform.Output(t, opts, "public_ip")
    assert.NotEmpty(t, publicIp)

    // Wait for the instance to pass health checks
    retry.DoWithRetry(t, "Wait for instance to be healthy", 10, 30*time.Second,
        func() (string, error) {
            status := aws.GetInstanceStatus(t, instanceId, awsRegion)
            if status != "ok" {
                return "", fmt.Errorf("instance status is %s, not ok", status)
            }
            return "Instance is healthy", nil
        },
    )
}
```

## Testing S3 Buckets

Verify S3 bucket creation with encryption, versioning, and lifecycle policies:

```go
// test/s3_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestS3Bucket(t *testing.T) {
    t.Parallel()

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
    aws.AssertS3BucketExists(t, awsRegion, bucketName)

    // Verify versioning is enabled
    versioning := aws.GetS3BucketVersioning(t, awsRegion, bucketName)
    assert.Equal(t, "Enabled", versioning)

    // Verify server-side encryption is configured
    encryption := aws.GetS3BucketEncryption(t, awsRegion, bucketName)
    assert.Equal(t, "aws:kms", encryption)

    // Verify bucket policy blocks public access
    policy := aws.GetS3BucketPolicy(t, awsRegion, bucketName)
    assert.NotEmpty(t, policy, "Bucket should have a policy")

    // Verify tags
    tags := aws.GetS3BucketTags(t, awsRegion, bucketName)
    assert.Equal(t, "test", tags["Environment"])
}
```

## Testing RDS Databases

Verify RDS instance creation and connectivity:

```go
// test/rds_test.go
package test

import (
    "testing"
    "fmt"
    "database/sql"
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

    // Get the database endpoint
    endpoint := terraform.Output(t, opts, "db_endpoint")
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
    "testing"
    "fmt"
    "encoding/json"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestIAMRole(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/iam",
        Vars: map[string]interface{}{
            "role_name":   fmt.Sprintf("test-role-%s", uniqueId),
            "environment": "test",
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

    // Get the role's policy document
    role := aws.GetIamRole(t, awsRegion, roleName)
    assert.NotNil(t, role)

    // Verify the assume role policy allows the expected service
    var assumeRolePolicy map[string]interface{}
    err := json.Unmarshal([]byte(*role.AssumeRolePolicyDocument), &assumeRolePolicy)
    assert.NoError(t, err)

    // Verify attached policies
    policies := aws.GetIamPoliciesForRole(t, awsRegion, roleName)
    assert.Greater(t, len(policies), 0, "Role should have at least one policy attached")
}
```

## Testing Security Groups

Verify security group rules:

```go
// test/security_group_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/ec2"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestSecurityGroup(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/security-group",
        Vars: map[string]interface{}{
            "name":        fmt.Sprintf("test-sg-%s", uniqueId),
            "vpc_id":      "vpc-existing123",  // Use an existing VPC
            "environment": "test",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    sgId := terraform.Output(t, opts, "security_group_id")

    // Query the SG directly from AWS
    sess, err := session.NewSession(&aws.Config{
        Region: aws.String(awsRegion),
    })
    require.NoError(t, err)

    ec2Client := ec2.New(sess)
    result, err := ec2Client.DescribeSecurityGroups(&ec2.DescribeSecurityGroupsInput{
        GroupIds: []*string{aws.String(sgId)},
    })
    require.NoError(t, err)
    require.Len(t, result.SecurityGroups, 1)

    sg := result.SecurityGroups[0]

    // Verify ingress rules allow HTTPS
    hasHttps := false
    for _, rule := range sg.IpPermissions {
        if *rule.FromPort == 443 && *rule.ToPort == 443 {
            hasHttps = true
            break
        }
    }
    assert.True(t, hasHttps, "Security group should allow HTTPS traffic")

    // Verify no rules allow all traffic from 0.0.0.0/0
    for _, rule := range sg.IpPermissions {
        for _, cidr := range rule.IpRanges {
            if *rule.FromPort == 0 && *rule.ToPort == 65535 {
                assert.NotEqual(t, "0.0.0.0/0", *cidr.CidrIp,
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
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestLambdaFunction(t *testing.T) {
    t.Parallel()

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
    response := aws.InvokeFunction(t, awsRegion, functionName, payload)

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
