# How to Set Up Agentless Dependency Analysis in Azure Migrate for Server Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, Dependency Analysis, Server Discovery, Cloud Migration, VMware, Agentless, Network Mapping

Description: Step-by-step guide to setting up agentless dependency analysis in Azure Migrate to visualize server dependencies and plan migration groups.

---

When you are planning a cloud migration, one of the trickiest parts is figuring out which servers talk to each other. Move a web server without its database, and the application breaks. Migrate a database without the middleware tier, and you get the same result. Dependency analysis solves this by showing you the actual network connections between servers.

Azure Migrate offers two flavors of dependency analysis: agent-based and agentless. The agentless option is the one most teams prefer because it requires no software installation on the discovered servers. It uses vCenter APIs and guest OS credentials to collect connection data directly from each VM. This guide walks through setting it up end to end.

## Why Agentless Over Agent-Based

The agent-based approach requires installing the Microsoft Monitoring Agent (MMA) and Dependency Agent on every server you want to analyze. For 50 servers, that is manageable. For 500 or 5,000, it becomes a project in itself. Agentless dependency analysis avoids all of that.

Here is a quick comparison:

| Feature | Agent-Based | Agentless |
|---------|-------------|-----------|
| Software installation required | Yes (two agents per server) | No |
| Supported platforms | Windows, Linux | VMware VMs only |
| Data collection method | Log Analytics workspace | vCenter + guest credentials |
| Visualization duration | Configurable | Up to 30 days |
| Cost | Log Analytics ingestion charges | No additional cost |

The trade-off is that agentless analysis only works with VMware VMs discovered through the Azure Migrate appliance. If you have physical servers or Hyper-V VMs, you will need the agent-based approach for those.

## Prerequisites

Before setting up agentless dependency analysis, ensure you have:

- An Azure Migrate project with the appliance already deployed and discovering VMware VMs
- vCenter Server credentials configured on the appliance
- Guest OS credentials for the VMs you want to analyze (Windows domain credentials or Linux SSH credentials)
- The appliance must have network access to the target VMs on WMI (port 5985/5986 for Windows) and SSH (port 22 for Linux)

If you have not yet set up the Azure Migrate appliance and started discovery, do that first. Dependency analysis builds on top of the discovery data.

## Step 1: Provide Guest OS Credentials on the Appliance

The agentless method needs to log into each VM's guest OS to collect active network connections. You provide these credentials through the appliance configuration manager.

1. Open the appliance configuration manager at `https://<appliance-ip>:44368`
2. Navigate to the "Manage credentials" section
3. Add credentials for your environment

For Windows VMs, you typically need a domain account with local administrator privileges. For Linux VMs, you need an account with sudo access or root credentials.

Here is an example of creating a dedicated service account for this purpose on Windows:

```powershell
# Create a local admin account on Windows servers for Azure Migrate dependency analysis
# This account will be used by the appliance to remotely collect network connection data
$Password = ConvertTo-SecureString "YourSecurePassword123!" -AsPlainText -Force
New-LocalUser -Name "azuremigrate-dep" -Password $Password -Description "Azure Migrate dependency analysis"
Add-LocalGroupMember -Group "Administrators" -Member "azuremigrate-dep"

# Enable WinRM for remote access (required for agentless dependency collection)
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
```

For Linux, the approach differs slightly:

```bash
# Create a service account on Linux for Azure Migrate dependency analysis
# The account needs sudo access to run netstat/ss for connection discovery
sudo useradd -m -s /bin/bash azuremigrate-dep
echo "azuremigrate-dep:YourSecurePassword123!" | sudo chpasswd

# Grant sudo access for network commands without password prompt
echo "azuremigrate-dep ALL=(ALL) NOPASSWD: /usr/bin/netstat, /usr/sbin/ss" | sudo tee /etc/sudoers.d/azuremigrate
```

You can add multiple credential sets on the appliance. It will try each one against each VM until it finds one that works.

## Step 2: Enable Dependency Analysis on Discovered Servers

Once credentials are configured, you enable dependency analysis from the Azure portal.

1. Go to your Azure Migrate project
2. Navigate to "Servers, databases and web apps"
3. Under "Discovery and assessment," click the count of discovered servers
4. Select the servers you want to analyze (you can select multiple)
5. Click "Dependency analysis" and choose "Enable"

You can enable it for all discovered servers at once or select specific groups. If you have thousands of VMs, consider starting with the ones involved in your first migration wave.

The appliance begins collecting dependency data immediately. However, it takes about 2-6 hours for meaningful data to appear in the portal. For the best results, let it run for at least 24 hours to capture daily patterns.

## Step 3: Visualize Dependencies

After collection has been running for a while, you can view the dependency map for any server.

1. Click on a server name in the discovered servers list
2. Go to the "Dependencies" tab
3. Set your time range (1 hour, 6 hours, 1 day, or 30 days)
4. The dependency map renders showing all inbound and outbound connections

The map displays:

- **Server nodes** - each discovered server with dependency data
- **Processes** - the specific processes making or receiving connections
- **Connections** - lines between nodes showing network communication
- **Ports** - the TCP/UDP ports used for each connection
- **Unknown servers** - IP addresses that were not discovered (could be external services or servers outside the discovery scope)

You can expand each server to see individual processes. For example, you might see that a web server's `w3wp.exe` process connects to port 1433 on a database server, and also connects to port 6379 on a Redis cache server.

## Step 4: Create Migration Groups Based on Dependencies

The real value of dependency analysis is using it to form migration groups - sets of servers that should move together.

1. From the dependency map, identify clusters of servers that are tightly connected
2. Go back to the Azure Migrate project and click "Groups"
3. Create a new group and add the interdependent servers
4. Run an assessment on this group to get sizing and cost estimates

A practical approach is to start with a critical application and trace its dependencies outward. For example, start with the front-end web server. Its dependency map shows it connects to an application server and a database server. The application server also connects to a file server and an LDAP server. Now you know all five servers should be in the same migration group.

## Step 5: Handle Edge Cases

### External Dependencies

If your servers connect to external services (SaaS APIs, third-party services), these show up as IP addresses in the dependency map. You do not need to migrate these, but you do need to ensure the network path from Azure to these external endpoints works after migration. Document them and plan firewall rules accordingly.

### Circular Dependencies

Sometimes two groups of servers depend on each other. For instance, application group A calls a microservice in application group B, and vice versa. In these cases, you should migrate both groups together if possible, or set up a VPN/ExpressRoute connection between on-premises and Azure so the two environments can communicate during the transition period.

### Servers That Talk to Everything

Domain controllers, DNS servers, and monitoring servers typically show connections to almost every other server. Do not let these pull your entire environment into a single migration group. Instead, plan to keep these shared services accessible from both environments during migration (or migrate them first).

## Monitoring Collection Status

You can check whether dependency data is being collected successfully:

1. In the Azure Migrate portal, go to the discovered servers list
2. Look at the "Dependency analysis" column
3. Possible statuses include:
   - **Enabled** - collection is active and working
   - **Credential validation failed** - the appliance could not log into the VM
   - **Not available** - the VM was unreachable

For VMs where collection fails, check the network connectivity from the appliance and verify that the provided credentials work. Common issues include Windows Firewall blocking WMI, SSH being disabled on Linux VMs, or the credentials lacking sufficient privileges.

## Data Retention and Limits

Agentless dependency data is retained for up to 30 days. You can analyze up to 1,000 servers simultaneously per appliance. If you have more than 1,000 servers, you can deploy additional appliances and register them to the same Azure Migrate project.

The dependency data itself is stored in the Azure Migrate project and does not incur separate charges. This is a significant advantage over the agent-based approach, which sends data to a Log Analytics workspace where ingestion costs can add up.

## Practical Tips

**Run dependency analysis during business hours.** Weekday traffic patterns look different from weekend ones. If your migration cutover is planned for a weekend, also check weekend dependency patterns to ensure you are not missing batch jobs that only run on specific days.

**Export dependency data.** The portal visualization is useful, but for large environments, exporting to CSV gives you more flexibility to analyze in Excel or Power BI. Use the "Export" option in the discovered servers view.

**Combine with application owners' knowledge.** Dependency analysis shows network connections, but it does not explain the business context. A connection to a server might be critical for the application or it might be a leftover from a decommissioned feature. Validate the dependency map with the application team.

## Wrapping Up

Agentless dependency analysis in Azure Migrate gives you a clear picture of how your servers interact without installing anything on the VMs themselves. Set up the credentials, enable analysis, let it run for a few days, and then use the dependency maps to form smart migration groups. This prevents the all-too-common scenario of migrating a server only to discover that it cannot reach a critical dependency.

Combined with the assessment data from Azure Migrate, dependency analysis rounds out your migration planning toolkit and sets you up for a smooth transition to Azure.
