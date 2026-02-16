# How to Assess On-Premises VMware VMs for Azure Migration Using Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, VMware, Cloud Migration, Azure, On-Premises, Assessment, Virtual Machines

Description: Learn how to assess on-premises VMware virtual machines for Azure migration using Azure Migrate, including discovery, assessment, and right-sizing recommendations.

---

Moving workloads from on-premises VMware environments to Azure is one of the most common migration scenarios enterprises face today. Before you actually move anything, though, you need a solid understanding of what you have, what it depends on, and what it will cost to run in Azure. That is exactly what Azure Migrate is built for.

In this guide, I will walk through how to set up Azure Migrate to discover and assess VMware VMs, interpret the results, and use the data to plan your migration with confidence.

## Why Assessment Comes First

Jumping straight into a migration without assessment is a recipe for surprise bills and performance issues. Assessment gives you:

- A complete inventory of your VMware VMs
- Performance data (CPU, memory, disk, network) collected over time
- Right-sizing recommendations so you pick the correct Azure VM SKU
- Cost estimates based on actual utilization, not just what was provisioned
- Readiness checks that flag compatibility issues before you start migrating

Azure Migrate centralizes all of this into a single dashboard, which makes it much easier than cobbling together scripts and spreadsheets.

## Prerequisites

Before you begin, make sure you have the following in place:

- An Azure subscription with Contributor access
- A VMware vCenter Server (version 5.5 or later)
- A Windows Server (2016 or later) to host the Azure Migrate appliance
- Network connectivity between the appliance, vCenter, and Azure
- vCenter credentials with read-only access at minimum

## Step 1: Create an Azure Migrate Project

Start by creating a project in the Azure portal. This project acts as the central hub for all discovery and assessment data.

1. Open the Azure portal and search for "Azure Migrate"
2. Click "Create project"
3. Select your subscription and resource group
4. Give the project a name and choose the geography closest to your on-premises environment
5. Click "Create"

The geography you choose determines where metadata is stored. It does not restrict which Azure regions you can target for migration.

## Step 2: Deploy the Azure Migrate Appliance

The appliance is a lightweight VM that runs on-premises and handles discovery. Azure Migrate provides an OVA template that you deploy directly into your VMware environment.

1. In the Azure Migrate project, go to "Servers, databases and web apps"
2. Under "Discovery and assessment," click "Discover"
3. Select "Yes, with VMware vSphere" as the virtualization type
4. Choose "OVA file" as the deployment method and download the template
5. Deploy the OVA in vCenter as you would any other VM template
6. Power on the appliance VM and open its configuration portal at `https://<appliance-ip>:44368`

The appliance needs outbound HTTPS (port 443) connectivity to Azure. If you are behind a proxy, configure it during the initial setup wizard.

## Step 3: Configure the Appliance

Once the configuration portal opens, you will walk through several setup steps.

First, the appliance registers itself with your Azure Migrate project using a project key. Copy this key from the portal and paste it into the appliance configuration.

Next, provide vCenter Server credentials. The appliance uses these to connect to vCenter and discover VMs. Here is an example of the minimum permissions needed in PowerCLI:

```powershell
# Create a read-only role in vCenter for Azure Migrate discovery
# This role grants the minimum permissions needed for VM enumeration and performance data collection
New-VIRole -Name "AzureMigrateRole" -Privilege (Get-VIPrivilege -Id @(
    "System.Anonymous",
    "System.Read",
    "System.View",
    "VirtualMachine.Config.AdvancedConfig",
    "VirtualMachine.GuestOperations.Query"
))

# Assign the role to a service account at the vCenter root level
New-VIPermission -Entity (Get-Folder -NoRecursion) `
    -Principal "DOMAIN\azuremigrate-svc" `
    -Role "AzureMigrateRole" `
    -Propagate $true
```

You can also provide guest OS credentials (Windows domain or Linux SSH) if you want the appliance to discover installed applications and dependencies. This is optional but highly recommended for a thorough assessment.

## Step 4: Start Discovery

After configuration, kick off discovery from the appliance portal. The appliance connects to vCenter, enumerates all VMs, and begins collecting performance data.

Initial discovery typically completes within a few minutes for the inventory. Performance data collection, however, takes longer. Azure Migrate recommends collecting at least one day of performance data before running an assessment, though 30 days gives you the most accurate picture.

You can monitor discovery progress in the Azure portal under your Migrate project. Each discovered server shows up with its configuration details: OS type, cores, memory, disks, and network adapters.

## Step 5: Create an Assessment

With discovery data flowing in, you can create an assessment to get Azure readiness and sizing recommendations.

1. In the Azure Migrate project, go to "Servers, databases and web apps"
2. Click "Assess" and select "Azure VM"
3. Give the assessment a name
4. Configure assessment properties

The key assessment settings to pay attention to are:

**Target location** - The Azure region where you plan to host the VMs. This affects pricing and available VM SKUs.

**Pricing tier** - Choose between pay-as-you-go, Reserved Instances (1-year or 3-year), or Azure Savings Plan pricing. Reserved Instances often show 30-60% savings compared to pay-as-you-go.

**Sizing criteria** - This is critical. You have two options:
- **As on-premises**: Sizes based on current VM configuration, ignoring actual utilization
- **Performance-based**: Sizes based on collected CPU, memory, and disk utilization data

Performance-based sizing almost always produces better results because many on-premises VMs are over-provisioned. You end up with smaller, cheaper Azure VMs that still meet performance requirements.

**Comfort factor** - A multiplier applied to performance data. A factor of 1.3 means Azure Migrate recommends a VM that can handle 130% of observed peak utilization. This gives you a buffer for unexpected spikes.

**VM series** - Filter which Azure VM families to consider. For general workloads, the D-series and E-series are common choices. Exclude GPU-series VMs if you do not need them, as this keeps cost estimates realistic.

## Step 6: Review Assessment Results

Once the assessment runs, you get a detailed report with several sections.

### Azure Readiness

Each VM is categorized as:
- **Ready for Azure** - No issues detected
- **Conditionally ready** - Minor issues that need attention
- **Not ready** - Blocking issues that must be resolved
- **Readiness unknown** - Insufficient data

Common issues include unsupported operating systems, boot types (UEFI vs. BIOS compatibility), and disk configurations that exceed Azure limits.

### Cost Estimates

The assessment breaks down estimated monthly costs per VM, including compute and storage. It also shows what you would save by using Reserved Instances. This is the data your finance team will want to see.

### Right-Sizing Recommendations

For each VM, the assessment recommends a specific Azure VM size. You will often find that a 16-core, 64 GB on-premises VM only needs a Standard_D4s_v5 (4 cores, 16 GB) in Azure because actual utilization was low.

## Step 7: Export and Share Results

Assessment results can be exported to Excel for offline analysis and sharing with stakeholders. Click the "Download" button on the assessment overview page. The export includes every VM with its readiness status, recommended size, and estimated cost.

## Common Pitfalls

**Not collecting enough performance data.** Running an assessment after just a few hours of discovery means you are making sizing decisions based on a tiny sample. Wait at least a week, ideally a month, to capture weekly patterns and month-end spikes.

**Ignoring dependencies.** Two VMs that communicate heavily should migrate together. Enable dependency analysis (covered in a separate post) to visualize these relationships.

**Forgetting about licensing.** Azure Hybrid Benefit lets you reuse on-premises Windows Server and SQL Server licenses in Azure. Factor this into your cost projections - it can save up to 40%.

**Assessing everything at once.** Large environments can have thousands of VMs. Group them by application or business unit and assess each group separately. This makes the results more actionable.

## Wrapping Up

Azure Migrate takes the guesswork out of VMware-to-Azure migrations. By deploying the appliance, collecting real performance data, and running assessments with the right parameters, you get a clear picture of what your Azure environment will look like - including accurate sizing and cost projections.

The assessment phase might feel like it slows down the migration, but it consistently prevents costly mistakes. Take the time to do it right, and the actual migration will go much more smoothly.
