# How to Write Terratest Tests for Azure Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terratest, Azure, Testing, Go, Infrastructure as Code

Description: Learn how to write Terratest tests that validate Azure resources like VNets, VMs, Storage Accounts, and Azure SQL databases after Terraform deployment.

---

Terratest provides Azure-specific helper modules that let you interact directly with Azure APIs to verify your Terraform-deployed infrastructure. Rather than trusting Terraform outputs alone, you can query Azure Resource Manager to confirm that resources exist, are correctly configured, and are accessible. This guide covers testing patterns for common Azure resources.

## Setting Up Azure Authentication

Terratest uses the same authentication methods as the Azure CLI and Terraform AzureRM provider. The most common approaches:

```bash
# Option 1: Azure CLI authentication
az login

# Option 2: Service principal environment variables
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
```

Install the Azure helper module:

```bash
cd test
go get github.com/gruntwork-io/terratest/modules/azure
```

## Testing Virtual Networks

Verify VNet creation with proper subnets and address spaces:

```go
// test/vnet_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestVirtualNetwork(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-test-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/vnet",
        Vars: map[string]interface{}{
            "resource_group_name": resourceGroupName,
            "location":           "eastus",
            "vnet_name":          fmt.Sprintf("vnet-test-%s", uniqueId),
            "address_space":      []string{"10.0.0.0/16"},
            "subnets": map[string]interface{}{
                "app": map[string]interface{}{
                    "address_prefix": "10.0.1.0/24",
                },
                "data": map[string]interface{}{
                    "address_prefix": "10.0.2.0/24",
                },
            },
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vnetName := terraform.Output(t, opts, "vnet_name")

    // Verify the VNet exists using the Azure API
    vnetExists := azure.VirtualNetworkExists(t, vnetName, resourceGroupName, "")
    assert.True(t, vnetExists, "VNet should exist")

    // Verify the address space
    vnet, err := azure.GetVirtualNetworkE(vnetName, resourceGroupName, "")
    assert.NoError(t, err)
    assert.Contains(t, *vnet.VirtualNetworkPropertiesFormat.AddressSpace.AddressPrefixes,
        "10.0.0.0/16", "VNet should have the correct address space")

    // Verify subnets exist
    subnetExists := azure.SubnetExists(t, "app", vnetName, resourceGroupName, "")
    assert.True(t, subnetExists, "App subnet should exist")

    dataSubnetExists := azure.SubnetExists(t, "data", vnetName, resourceGroupName, "")
    assert.True(t, dataSubnetExists, "Data subnet should exist")

    // Check subnet address prefixes
    appSubnet, err := azure.GetSubnetE("app", vnetName, resourceGroupName, "")
    assert.NoError(t, err)
    assert.Equal(t, "10.0.1.0/24", *appSubnet.SubnetPropertiesFormat.AddressPrefix)
}
```

## Testing Virtual Machines

Verify VM creation, configuration, and connectivity:

```go
// test/vm_test.go
package test

import (
    "testing"
    "fmt"
    "time"

    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/gruntwork-io/terratest/modules/ssh"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVirtualMachine(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-vm-test-%s", uniqueId)

    // Generate an SSH key pair for the test
    keyPair := ssh.GenerateRSAKeyPair(t, 2048)

    opts := &terraform.Options{
        TerraformDir: "../modules/vm",
        Vars: map[string]interface{}{
            "resource_group_name": resourceGroupName,
            "location":           "eastus",
            "vm_name":            fmt.Sprintf("vm-test-%s", uniqueId),
            "vm_size":            "Standard_B1s",
            "admin_username":     "testadmin",
            "ssh_public_key":     keyPair.PublicKey,
            "environment":        "test",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vmName := terraform.Output(t, opts, "vm_name")

    // Verify the VM exists
    vmExists := azure.VirtualMachineExists(t, vmName, resourceGroupName, "")
    assert.True(t, vmExists, "VM should exist")

    // Get VM details and verify configuration
    vm, err := azure.GetVirtualMachineE(vmName, resourceGroupName, "")
    require.NoError(t, err)

    assert.Equal(t, "Standard_B1s",
        string(vm.VirtualMachineProperties.HardwareProfile.VMSize))

    // Verify the VM is running
    instanceView := azure.GetVirtualMachineInstanceView(t, vmName, resourceGroupName, "")
    powerState := ""
    for _, status := range *instanceView.Statuses {
        if *status.Code == "PowerState/running" {
            powerState = "running"
        }
    }
    assert.Equal(t, "running", powerState, "VM should be in running state")

    // Test SSH connectivity
    publicIp := terraform.Output(t, opts, "public_ip")
    host := ssh.Host{
        Hostname:    publicIp,
        SshUserName: "testadmin",
        SshKeyPair:  keyPair,
    }

    // Retry SSH connection since VM might take time to boot
    retry.DoWithRetry(t, "SSH to VM", 10, 30*time.Second,
        func() (string, error) {
            output, err := ssh.CheckSshCommandE(t, host, "echo hello")
            if err != nil {
                return "", err
            }
            return output, nil
        },
    )
}
```

## Testing Storage Accounts

Verify storage account creation with correct configuration:

```go
// test/storage_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestStorageAccount(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-storage-test-%s", uniqueId)
    // Storage account names must be 3-24 chars, lowercase alphanumeric only
    storageAccountName := fmt.Sprintf("sttest%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/storage",
        Vars: map[string]interface{}{
            "resource_group_name":  resourceGroupName,
            "location":            "eastus",
            "storage_account_name": storageAccountName,
            "account_tier":        "Standard",
            "replication_type":    "LRS",
            "enable_https_only":   true,
            "containers":          []string{"data", "logs", "backups"},
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify the storage account exists
    exists := azure.StorageAccountExists(t, storageAccountName, resourceGroupName, "")
    assert.True(t, exists, "Storage account should exist")

    // Get storage account properties
    account, err := azure.GetStorageAccountE(storageAccountName, resourceGroupName, "")
    require.NoError(t, err)

    // Verify account tier
    assert.Equal(t, "Standard",
        string(account.Sku.Tier))

    // Verify HTTPS is enforced
    assert.True(t, *account.AccountProperties.EnableHTTPSTrafficOnly,
        "HTTPS should be enforced")

    // Verify TLS version
    assert.Equal(t, "TLS1_2",
        string(account.AccountProperties.MinimumTLSVersion),
        "Minimum TLS version should be 1.2")

    // Verify blob containers exist
    containerExists := azure.StorageBlobContainerExists(t, "data",
        storageAccountName, resourceGroupName, "")
    assert.True(t, containerExists, "Data container should exist")
}
```

## Testing Azure SQL Database

Verify database creation and connectivity:

```go
// test/sql_test.go
package test

import (
    "testing"
    "fmt"
    "database/sql"
    "time"

    _ "github.com/denisenkom/go-mssqldb"  // SQL Server driver
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestAzureSQLDatabase(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-sql-test-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/azure-sql",
        Vars: map[string]interface{}{
            "resource_group_name": resourceGroupName,
            "location":           "eastus",
            "server_name":        fmt.Sprintf("sql-test-%s", uniqueId),
            "database_name":      "testdb",
            "admin_login":        "sqladmin",
            "admin_password":     "TestP@ssw0rd123!",
            "sku_name":           "S0",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    serverFQDN := terraform.Output(t, opts, "server_fqdn")
    assert.NotEmpty(t, serverFQDN)

    // Build connection string
    connStr := fmt.Sprintf(
        "server=%s;user id=sqladmin;password=TestP@ssw0rd123!;port=1433;database=testdb;",
        serverFQDN,
    )

    // Test database connectivity with retries
    retry.DoWithRetry(t, "Connect to Azure SQL", 10, 30*time.Second,
        func() (string, error) {
            db, err := sql.Open("sqlserver", connStr)
            if err != nil {
                return "", err
            }
            defer db.Close()

            err = db.Ping()
            if err != nil {
                return "", err
            }

            // Run a simple query
            var result int
            err = db.QueryRow("SELECT 1").Scan(&result)
            if err != nil {
                return "", err
            }

            return "Connected and queried successfully", nil
        },
    )
}
```

## Testing Network Security Groups

Verify NSG rules are correctly configured:

```go
// test/nsg_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestNetworkSecurityGroup(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-nsg-test-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/nsg",
        Vars: map[string]interface{}{
            "resource_group_name": resourceGroupName,
            "location":           "eastus",
            "nsg_name":           fmt.Sprintf("nsg-test-%s", uniqueId),
            "rules": []map[string]interface{}{
                {
                    "name":                     "AllowHTTPS",
                    "priority":                 100,
                    "direction":                "Inbound",
                    "access":                   "Allow",
                    "protocol":                 "Tcp",
                    "destination_port_range":   "443",
                    "source_address_prefix":    "*",
                },
                {
                    "name":                     "DenyAll",
                    "priority":                 4096,
                    "direction":                "Inbound",
                    "access":                   "Deny",
                    "protocol":                 "*",
                    "destination_port_range":   "*",
                    "source_address_prefix":    "*",
                },
            },
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    nsgName := terraform.Output(t, opts, "nsg_name")

    // Verify the NSG exists
    exists := azure.NetworkSecurityGroupExists(t, nsgName, resourceGroupName, "")
    assert.True(t, exists)

    // Get NSG rules
    nsg, err := azure.GetNetworkSecurityGroupE(nsgName, resourceGroupName, "")
    require.NoError(t, err)

    rules := *nsg.SecurityRules
    assert.GreaterOrEqual(t, len(rules), 2, "Should have at least 2 rules")

    // Verify HTTPS rule exists
    foundHttps := false
    for _, rule := range rules {
        if *rule.Name == "AllowHTTPS" {
            foundHttps = true
            assert.Equal(t, "Allow", string(rule.SecurityRulePropertiesFormat.Access))
            assert.Equal(t, int32(100), *rule.SecurityRulePropertiesFormat.Priority)
        }
    }
    assert.True(t, foundHttps, "Should have an HTTPS allow rule")
}
```

## Testing Azure Key Vault

Verify Key Vault creation and secret management:

```go
// test/keyvault_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestKeyVault(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    resourceGroupName := fmt.Sprintf("rg-kv-test-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/keyvault",
        Vars: map[string]interface{}{
            "resource_group_name": resourceGroupName,
            "location":           "eastus",
            "vault_name":         fmt.Sprintf("kv-test-%s", uniqueId),
            "sku_name":           "standard",
            "purge_protection":   false,  // Allow easy cleanup in tests
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vaultName := terraform.Output(t, opts, "vault_name")

    // Verify Key Vault exists
    exists := azure.KeyVaultExists(t, vaultName, resourceGroupName, "")
    assert.True(t, exists, "Key Vault should exist")

    // Get Key Vault properties
    kv, err := azure.GetKeyVaultE(t, vaultName, resourceGroupName, "")
    assert.NoError(t, err)

    // Verify soft delete is enabled (required by Azure)
    assert.True(t, *kv.Properties.EnableSoftDelete,
        "Soft delete should be enabled")

    // Verify SKU
    assert.Equal(t, "standard", string(kv.Properties.Sku.Name))
}
```

## Running Azure Tests in CI

```yaml
# .github/workflows/azure-terratest.yml
name: Azure Terratest

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Run Tests
        working-directory: test
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: go test -v -timeout 45m -parallel 4
```

## Summary

Terratest's Azure modules give you direct access to the Azure Resource Manager API from your Go tests. You can verify that VNets have the right address spaces, VMs are running with the correct sizes, storage accounts enforce HTTPS, and databases accept connections. Combined with Terraform's declarative provisioning, this gives you end-to-end confidence that your Azure infrastructure works as expected.

For other cloud providers, see [How to Write Terratest Tests for AWS Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-aws-resources/view) and [How to Write Terratest Tests for GCP Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-gcp-resources/view).
