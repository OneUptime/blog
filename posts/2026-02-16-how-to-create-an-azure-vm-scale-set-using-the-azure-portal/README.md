# How to Create an Azure VM Scale Set Using the Azure Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Azure Portal, Auto Scaling, Cloud Infrastructure, Load Balancing

Description: A complete walkthrough for creating an Azure VM Scale Set through the Azure Portal with load balancing and autoscale configuration.

---

Azure Virtual Machine Scale Sets let you deploy and manage a group of identical VMs that can automatically scale based on demand. Instead of manually creating individual VMs and load balancing them, a scale set handles the orchestration for you. You define the VM configuration once, specify how many instances you want, set scaling rules, and Azure takes care of the rest.

While many teams use Terraform or ARM templates for scale sets in production, the Azure Portal is the quickest way to get started, understand the configuration options, and prototype before writing infrastructure-as-code. This walkthrough covers every step of creating a scale set through the portal.

## Step 1: Navigate to VM Scale Sets

Log into the Azure portal at portal.azure.com. In the search bar at the top, type "Virtual machine scale sets" and click on the service. Then click "Create" to start a new scale set.

## Step 2: Basics Configuration

The Basics tab is where you set the foundational parameters.

**Subscription and Resource Group**: Choose your subscription and either select an existing resource group or create a new one. I recommend a dedicated resource group for the scale set and its associated resources (load balancer, public IP, VNet) to keep things organized.

**Scale set name**: Give it a meaningful name. I typically use a pattern like `appname-env-vmss` (for example, `webserver-prod-vmss`). This name becomes part of each instance's hostname.

**Region**: Select the Azure region closest to your users or other dependent resources. The scale set instances will all be created in this region.

**Availability zone**: You can spread instances across multiple availability zones for higher availability. Select zones 1, 2, and 3 for the best fault tolerance. If you do not need zone redundancy, you can leave this unchecked.

**Orchestration mode**: Choose between Uniform and Flexible.

- **Uniform**: All instances are identical and managed as a group. This is the traditional mode and works best for stateless, homogeneous workloads.
- **Flexible**: Instances can have different VM sizes and configurations. This mode gives you more control but is more complex.

For most use cases, Uniform mode is the right choice.

**Image**: Select the OS image for your instances. Click "See all images" to browse the marketplace. Common choices include Ubuntu Server 22.04 LTS, Windows Server 2022 Datacenter, or a custom image from your Shared Image Gallery.

**VM size**: Choose the VM size based on your workload requirements. You can change this later, but it requires reimaging all instances. Start with a size like Standard_D2s_v5 (2 vCPUs, 8 GB RAM) for web servers or Standard_D4s_v5 for heavier workloads.

**Authentication**: For Linux, you can choose SSH public key (recommended) or password. For Windows, provide an admin username and password.

## Step 3: Disks Configuration

The Disks tab controls the OS disk and data disk configuration for each instance.

**OS disk type**: Choose between Premium SSD, Standard SSD, or Standard HDD. Premium SSD gives the best performance. For stateless workloads, consider enabling ephemeral OS disks - this uses local host storage for the OS disk, which gives faster boot times and eliminates OS disk storage costs.

**Data disks**: If your application needs additional storage, you can add data disks here. Each instance in the scale set will get the same data disk configuration. Click "Create and attach a new disk" to add one.

For stateless web servers and most scale-out workloads, you typically do not need data disks since application state should live in external services (databases, blob storage, etc.).

## Step 4: Networking Configuration

This is where you configure how instances connect to the network and how traffic reaches them.

**Virtual network**: Select an existing VNet or create a new one. The portal will create a default VNet if you do not have one.

**Network interface**: Configure the NIC settings including the subnet, NSG, and public IP. For scale set instances behind a load balancer, individual instances usually do not need public IPs.

**Load balancer**: This is critical for most scale set deployments. You have two choices.

**Azure Load Balancer**: A Layer 4 (TCP/UDP) load balancer. Choose this for simple traffic distribution without HTTP-level features.

**Azure Application Gateway**: A Layer 7 (HTTP/HTTPS) load balancer with features like URL routing, SSL termination, and Web Application Firewall. Choose this for web applications.

If you select Azure Load Balancer, the portal will create one for you. Configure it like this:

- **Load balancer name**: Something descriptive like `webserver-prod-lb`
- **Backend pool**: The portal automatically creates a backend pool that includes all scale set instances
- **Load balancing rules**: Define the port mappings (for example, port 80 incoming mapped to port 80 on the instances)
- **Health probe**: Configure how the load balancer checks instance health (typically an HTTP probe on your application's health endpoint)

## Step 5: Scaling Configuration

The Scaling tab is where you configure how many instances to run and how the scale set scales.

**Initial instance count**: How many instances to create immediately. Start with 2 or 3 for production workloads to ensure availability.

**Scaling policy**: Choose between Manual and Custom autoscale.

For **Custom autoscale**, you configure rules that automatically add or remove instances:

- **Minimum instances**: The floor. Even during low traffic, maintain at least this many instances. For production, I recommend at least 2.
- **Maximum instances**: The ceiling. This prevents runaway scaling from blowing up your bill.
- **Default instance count**: The count to use when no metrics are available.

**Scale-out rule** (add instances):
- Metric: CPU Percentage
- Operator: Greater than
- Threshold: 70%
- Duration: 10 minutes (average over this window)
- Action: Increase count by 1
- Cool down: 5 minutes

**Scale-in rule** (remove instances):
- Metric: CPU Percentage
- Operator: Less than
- Threshold: 30%
- Duration: 10 minutes (average over this window)
- Action: Decrease count by 1
- Cool down: 5 minutes

The cool down period prevents the scale set from thrashing - adding and immediately removing instances in rapid succession.

## Step 6: Management Configuration

The Management tab has several important settings:

**Upgrade policy**: Controls how instances are updated when you change the scale set model (image, size, extensions, etc.).

- **Manual**: You control when instances are updated. Safe but requires manual work.
- **Automatic**: Instances are updated immediately when the model changes. Fast but can be disruptive if the new configuration has issues.
- **Rolling**: Instances are updated in batches with health checks between batches. Best for production.

**Boot diagnostics**: Enable this. It helps with troubleshooting boot failures on individual instances.

**OS image upgrade**: If enabled, Azure automatically applies new OS image versions to your instances using the rolling upgrade policy.

## Step 7: Health Configuration

Configure health monitoring for your instances:

**Application health monitoring**: Enable this and configure a health probe. The probe can be an HTTP endpoint (like `/health`) that returns 200 when the application is healthy.

**Automatic repair policy**: When enabled, unhealthy instances are automatically deleted and replaced with new ones. Set a grace period (for example, 30 minutes) to give instances time to start up before the health check kicks in.

## Step 8: Advanced Configuration

A few settings worth noting on the Advanced tab:

**Custom data**: You can provide a cloud-init script or custom data that runs on each instance at first boot. This is useful for installing packages or configuring the application.

For example, a cloud-init script to install and start nginx:

```yaml
#cloud-config
package_upgrade: true
packages:
  - nginx
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
```

**Proximity placement group**: If your scale set instances need to be physically close to other resources (like a database VM) for low latency, assign them to a proximity placement group.

## Step 9: Tags

Add tags to organize your resources. At minimum, add:

- Environment: production/staging/development
- Team: the team that owns this resource
- Application: the application this supports

## Step 10: Review and Create

Review all the settings. The portal runs a validation check and shows you estimated monthly costs. Click "Create" to deploy the scale set.

Deployment typically takes 3 to 5 minutes for a small scale set. You can watch the progress in the Notifications panel.

## Verifying the Deployment

Once deployed, verify everything is working:

```bash
# List scale set instances
az vmss list-instances \
  --resource-group myResourceGroup \
  --name webserver-prod-vmss \
  --query "[].{InstanceId:instanceId, ProvisioningState:provisioningState}" \
  -o table

# Check the load balancer's public IP
az network public-ip show \
  --resource-group myResourceGroup \
  --name webserver-prod-lb-ip \
  --query ipAddress -o tsv

# Test the health endpoint through the load balancer
curl http://<load-balancer-ip>/health
```

## Post-Deployment Configuration

After the scale set is running, there are a few things to set up:

**Monitoring**: Azure Monitor collects metrics from scale set instances automatically. Set up alerts for CPU, memory, and disk usage so you know when the scale set is under pressure or when instances are unhealthy.

**Diagnostics**: Enable Azure Diagnostics extension on the scale set to collect detailed logs from each instance.

```bash
# Enable diagnostics on the scale set
az vmss diagnostics set \
  --resource-group myResourceGroup \
  --vmss-name webserver-prod-vmss \
  --settings diagnostics-config.json
```

**Update management**: Configure a plan for applying OS patches and application updates. Azure Update Management can handle OS patches, while your CI/CD pipeline should handle application updates.

## Integrating with Monitoring

Connect your scale set to OneUptime for end-to-end monitoring. Track the health of the load balancer endpoint, individual instance metrics, and autoscale events. When a scale-out event happens, you want to see whether it was triggered by legitimate traffic growth or by an issue causing elevated CPU usage.

## Wrapping Up

Creating a VM Scale Set through the Azure Portal gives you a visual, guided experience that covers all the configuration options. Once you have a working scale set, I recommend exporting the configuration as an ARM template or recreating it in Terraform for reproducibility. The portal is great for learning and prototyping, but infrastructure-as-code is where you want to end up for production deployments.
