# How to Write Terratest Tests for GCP Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terratest, GCP, Google Cloud, Testing, Go, Infrastructure as Code

Description: Learn how to write Terratest tests that validate GCP resources like Compute instances, GCS buckets, Cloud SQL, and VPC networks after Terraform deployment.

---

Terratest includes GCP-specific helper modules that let you query Google Cloud APIs to verify your Terraform infrastructure is correctly deployed. This gives you real validation beyond just checking Terraform outputs - you can confirm that Compute Engine instances are running, GCS buckets have the right settings, and Cloud SQL databases accept connections. This guide covers testing patterns for common GCP resources.

## Setting Up GCP Authentication

Terratest uses the same authentication as the Google Cloud SDK. Set it up with one of these methods:

```bash
# Option 1: Application default credentials (for local development)
gcloud auth application-default login

# Option 2: Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Option 3: Environment variables
export GOOGLE_PROJECT="your-project-id"
export GOOGLE_REGION="us-central1"
```

Install the GCP helper module:

```bash
cd test
go get github.com/gruntwork-io/terratest/modules/gcp
```

## Testing VPC Networks

Verify VPC network creation with subnets and firewall rules:

```go
// test/vpc_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVPCNetwork(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "project_id":   projectId,
            "network_name": fmt.Sprintf("test-vpc-%s", uniqueId),
            "region":       "us-central1",
            "subnets": []map[string]interface{}{
                {
                    "name":          "app-subnet",
                    "ip_cidr_range": "10.0.1.0/24",
                    "region":        "us-central1",
                },
                {
                    "name":          "data-subnet",
                    "ip_cidr_range": "10.0.2.0/24",
                    "region":        "us-central1",
                },
            },
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    networkName := terraform.Output(t, opts, "network_name")

    // Verify the network exists
    network := gcp.GetNetwork(t, projectId, networkName)
    assert.NotNil(t, network)

    // Verify auto-create subnets is disabled (custom mode)
    assert.False(t, network.AutoCreateSubnetworks,
        "VPC should use custom subnet mode")

    // Verify subnets were created
    subnets := gcp.GetSubnets(t, projectId, networkName, "us-central1")
    assert.GreaterOrEqual(t, len(subnets), 2,
        "Should have at least 2 subnets")

    // Check specific subnet CIDR
    appSubnet := gcp.GetSubnet(t, projectId, "us-central1",
        fmt.Sprintf("app-subnet-%s", uniqueId))
    require.NotNil(t, appSubnet)
    assert.Equal(t, "10.0.1.0/24", appSubnet.IpCidrRange)
}
```

## Testing Compute Engine Instances

Verify that GCE instances are created with the correct machine type and configuration:

```go
// test/compute_test.go
package test

import (
    "testing"
    "fmt"
    "strings"
    "time"

    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/gruntwork-io/terratest/modules/ssh"
    "github.com/stretchr/testify/assert"
)

func TestComputeInstance(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()
    zone := "us-central1-a"

    // Generate SSH key pair for testing connectivity
    keyPair := ssh.GenerateRSAKeyPair(t, 2048)

    opts := &terraform.Options{
        TerraformDir: "../modules/compute",
        Vars: map[string]interface{}{
            "project_id":    projectId,
            "instance_name": fmt.Sprintf("test-vm-%s", uniqueId),
            "zone":          zone,
            "machine_type":  "e2-micro",
            "image_family":  "debian-12",
            "image_project": "debian-cloud",
            "ssh_public_key": keyPair.PublicKey,
            "environment":   "test",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    instanceName := terraform.Output(t, opts, "instance_name")

    // Get the instance from GCP
    instance := gcp.FetchInstance(t, projectId, zone, instanceName)

    // Verify machine type
    assert.True(t, strings.HasSuffix(instance.MachineType, "e2-micro"),
        "Instance should use e2-micro machine type")

    // Verify instance is running
    assert.Equal(t, "RUNNING", instance.Status,
        "Instance should be in RUNNING state")

    // Verify labels (GCP equivalent of tags)
    assert.Equal(t, "test", instance.Labels["environment"])

    // Verify disk encryption
    for _, disk := range instance.Disks {
        assert.NotEmpty(t, disk.DiskEncryptionKey,
            "Disks should be encrypted")
    }

    // Test SSH connectivity
    publicIp := terraform.Output(t, opts, "external_ip")
    host := ssh.Host{
        Hostname:    publicIp,
        SshUserName: "testuser",
        SshKeyPair:  keyPair,
    }

    retry.DoWithRetry(t, "SSH to GCE instance", 10, 30*time.Second,
        func() (string, error) {
            output, err := ssh.CheckSshCommandE(t, host, "hostname")
            if err != nil {
                return "", err
            }
            return output, nil
        },
    )
}
```

## Testing Cloud Storage Buckets

Verify GCS bucket creation with lifecycle rules and access controls:

```go
// test/gcs_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGCSBucket(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()
    bucketName := fmt.Sprintf("test-bucket-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/gcs",
        Vars: map[string]interface{}{
            "project_id":          projectId,
            "bucket_name":         bucketName,
            "location":            "US",
            "storage_class":       "STANDARD",
            "enable_versioning":   true,
            "uniform_access":      true,
            "lifecycle_age_days":  30,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify the bucket exists
    bucket := gcp.GetStorageBucket(t, projectId, bucketName)
    require.NotNil(t, bucket)

    // Verify storage class
    assert.Equal(t, "STANDARD", bucket.StorageClass)

    // Verify location
    assert.Equal(t, "US", bucket.Location)

    // Verify versioning is enabled
    assert.True(t, bucket.Versioning.Enabled,
        "Versioning should be enabled")

    // Verify uniform bucket-level access
    assert.True(t, bucket.IamConfiguration.UniformBucketLevelAccess.Enabled,
        "Uniform bucket-level access should be enabled")

    // Verify lifecycle rules exist
    assert.Greater(t, len(bucket.Lifecycle.Rule), 0,
        "Should have at least one lifecycle rule")

    // Check the lifecycle rule details
    found := false
    for _, rule := range bucket.Lifecycle.Rule {
        if rule.Action.Type == "Delete" && rule.Condition.Age == 30 {
            found = true
        }
    }
    assert.True(t, found,
        "Should have a delete lifecycle rule at 30 days")
}
```

## Testing Cloud SQL

Verify Cloud SQL instance creation and connectivity:

```go
// test/cloudsql_test.go
package test

import (
    "testing"
    "fmt"
    "database/sql"
    "time"

    _ "github.com/lib/pq"
    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestCloudSQL(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/cloudsql",
        Vars: map[string]interface{}{
            "project_id":      projectId,
            "instance_name":   fmt.Sprintf("test-sql-%s", uniqueId),
            "region":          "us-central1",
            "database_version": "POSTGRES_15",
            "tier":            "db-f1-micro",
            "database_name":   "testdb",
            "user_name":       "testuser",
            "user_password":   "TestP@ssw0rd123!",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    connectionName := terraform.Output(t, opts, "connection_name")
    publicIp := terraform.Output(t, opts, "public_ip_address")

    assert.NotEmpty(t, connectionName)
    assert.NotEmpty(t, publicIp)

    // Test database connectivity
    connStr := fmt.Sprintf(
        "host=%s port=5432 user=testuser password=TestP@ssw0rd123! dbname=testdb sslmode=require",
        publicIp,
    )

    retry.DoWithRetry(t, "Connect to Cloud SQL", 15, 30*time.Second,
        func() (string, error) {
            db, err := sql.Open("postgres", connStr)
            if err != nil {
                return "", err
            }
            defer db.Close()

            err = db.Ping()
            if err != nil {
                return "", err
            }

            // Run a test query
            var version string
            err = db.QueryRow("SELECT version()").Scan(&version)
            if err != nil {
                return "", err
            }

            return fmt.Sprintf("Connected: %s", version), nil
        },
    )
}
```

## Testing GKE Clusters

Verify GKE cluster creation and node pool configuration:

```go
// test/gke_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGKECluster(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()
    region := "us-central1"

    opts := &terraform.Options{
        TerraformDir: "../modules/gke",
        Vars: map[string]interface{}{
            "project_id":    projectId,
            "cluster_name":  fmt.Sprintf("test-gke-%s", uniqueId),
            "region":        region,
            "node_count":    1,
            "machine_type":  "e2-medium",
            "min_node_count": 1,
            "max_node_count": 3,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    clusterName := terraform.Output(t, opts, "cluster_name")
    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")

    // Verify the cluster exists
    cluster := gcp.GetGKECluster(t, projectId, region, clusterName)
    require.NotNil(t, cluster)

    // Verify cluster is running
    assert.Equal(t, "RUNNING", cluster.Status,
        "Cluster should be in RUNNING state")

    // Verify node pool configuration
    assert.Greater(t, len(cluster.NodePools), 0,
        "Cluster should have at least one node pool")

    nodePool := cluster.NodePools[0]
    assert.Equal(t, int64(1), nodePool.InitialNodeCount)

    // Verify autoscaling is configured
    assert.True(t, nodePool.Autoscaling.Enabled)
    assert.Equal(t, int64(1), nodePool.Autoscaling.MinNodeCount)
    assert.Equal(t, int64(3), nodePool.Autoscaling.MaxNodeCount)

    // Test Kubernetes API connectivity
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, "default")
    nodes := k8s.GetNodes(t, k8sOptions)
    assert.GreaterOrEqual(t, len(nodes), 1,
        "Cluster should have at least 1 node")
}
```

## Testing Firewall Rules

Verify that GCP firewall rules are correctly configured:

```go
// test/firewall_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/gcp"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestFirewallRules(t *testing.T) {
    t.Parallel()

    projectId := gcp.GetGoogleProjectIDFromEnvVar(t)
    uniqueId := random.UniqueId()

    opts := &terraform.Options{
        TerraformDir: "../modules/firewall",
        Vars: map[string]interface{}{
            "project_id":   projectId,
            "network_name": fmt.Sprintf("test-net-%s", uniqueId),
            "rules": []map[string]interface{}{
                {
                    "name":        "allow-https",
                    "protocol":    "tcp",
                    "ports":       []string{"443"},
                    "source_ranges": []string{"0.0.0.0/0"},
                },
                {
                    "name":        "allow-internal",
                    "protocol":    "tcp",
                    "ports":       []string{"0-65535"},
                    "source_ranges": []string{"10.0.0.0/8"},
                },
            },
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify HTTPS firewall rule
    httpsRule := gcp.GetFirewallRule(t, projectId,
        fmt.Sprintf("allow-https-%s", uniqueId))
    assert.Equal(t, "INGRESS", httpsRule.Direction)
    assert.Contains(t, httpsRule.SourceRanges, "0.0.0.0/0")

    // Verify internal rule restricts source
    internalRule := gcp.GetFirewallRule(t, projectId,
        fmt.Sprintf("allow-internal-%s", uniqueId))
    assert.Contains(t, internalRule.SourceRanges, "10.0.0.0/8")
    assert.NotContains(t, internalRule.SourceRanges, "0.0.0.0/0",
        "Internal rule should not be open to the internet")
}
```

## CI Pipeline for GCP Tests

```yaml
# .github/workflows/gcp-terratest.yml
name: GCP Terratest

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Run Tests
        working-directory: test
        env:
          GOOGLE_PROJECT: ${{ secrets.GCP_PROJECT_ID }}
        run: go test -v -timeout 45m -parallel 4
```

## Summary

Terratest's GCP modules let you validate infrastructure directly against the Google Cloud API. You can verify that VPC networks have custom subnets, Compute instances are running with the right machine types, GCS buckets enforce versioning and uniform access, and GKE clusters have properly configured autoscaling. This goes well beyond checking Terraform outputs and gives you real confidence in your GCP infrastructure.

For other cloud providers, see [How to Write Terratest Tests for AWS Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-aws-resources/view) and [How to Write Terratest Tests for Azure Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-azure-resources/view).
