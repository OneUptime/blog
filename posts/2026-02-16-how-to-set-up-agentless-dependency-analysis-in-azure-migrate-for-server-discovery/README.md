# How to Set Up Agentless Dependency Analysis in Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, Dependency Analysis, Server Discovery, Cloud Migration, VMware, Agentless, Network Mapping

Description: Step-by-step guide to setting up agentless dependency analysis in Azure Migrate to visualize server dependencies and plan migration groups.

---

When you are planning a cloud migration, one of the trickiest parts is figuring out which servers talk to each other. Move a web server without its database, and the application breaks. Migrate a database without the middleware tier, and you get the same result. Dependency analysis solves this by showing you the actual network connections between servers.

Azure Migrate offers two flavors of dependency analysis: agent-based and agentless. The agentless option is the one most teams prefer because it requires no software installation on the discovered servers. For VMware VMs, it uses vCenter and vSphere APIs together with guest OS credentials to collect connection data. For Hyper-V, physical servers, and servers running in other clouds, the appliance connects directly to the servers with the credentials you provide. This guide walks through setting it up end to end.

## Why Agentless Over Agent-Based

The agent-based approach requires installing the Azure Monitor Agent (AMA) and Dependency Agent on every server you want to analyze. For 50 servers, that is manageable. For 500 or 5,000, it becomes a project in itself. Agentless dependency analysis avoids all of that.

Here is a quick comparison:

| Feature | Agent-Based | Agentless |
|---------|-------------|-----------|
| Software installation required | Yes (two agents per server) | No |
| Supported platforms | Windows, Linux | VMware VMs, Hyper-V VMs, physical servers, and servers in other clouds |
| Data collection method | Log Analytics workspace | Azure Migrate appliance + guest credentials |
| Visualization duration | Configurable | Up to 30 days |
| Cost | Log Analytics ingestion charges | No additional cost |

The trade-off is that agentless analysis requires servers to be discovered through an Azure Migrate appliance and to pass the prerequisite checks. If you are using the older classic dependency experience, some workflows and support details differ from the current enhanced experience.

## Prerequisites

Before setting up agentless dependency analysis, ensure you have:

- An Azure Migrate project with the appliance already deployed and discovering servers
- Discovery source credentials configured on the appliance, such as vCenter Server, Hyper-V host or cluster, or physical server details
- Guest OS credentials for the servers you want to analyze, such as Windows domain or nondomain credentials and Linux credentials
- Required connectivity for the environment. For VMware, the appliance must be able to connect to TCP port 443 on the ESXi hosts running the VMs. For Hyper-V and physical servers, Windows servers use WinRM on port 5986 or 5985, and Linux servers use SSH on port 22.

If you have not yet set up the Azure Migrate appliance and started discovery, do that first. Dependency analysis builds on top of the discovery data.

## Step 1: Provide Guest OS Credentials on the Appliance

The agentless method needs guest OS credentials to collect active network connections from each server. You provide these credentials through the appliance configuration manager.

1. Open the appliance configuration manager at `https://<appliance-ip>:44368`
2. Navigate to the "Manage credentials" section
3. Add credentials for your environment

For Windows servers, you typically need a domain or local account with administrator privileges. For Linux servers, you need an account with sudo access or root credentials.

Here is an example of creating a dedicated service account for this purpose on Windows:

```powershell
# Create a local admin account on Windows servers for Azure Migrate dependency analysis

# This account will be used by the appliance to remotely collect network connection data
$Password = ConvertTo-SecureString "YourSecurePassword123!" -AsPlainText -Force
New-LocalUser -Name "azuremigrate-dep" -Password $Password -Description "Azure Migrate dependency analysis"
Add-LocalGroupMember -Group "Administrators" -Member "azuremigrate-dep"

# Enable WinRM for remote access (required for agentless dependency collection)
Enable-PSRemoting -Force
```

For Linux, the approach differs slightly:

```bash
# Create a service account on Linux for Azure Migrate dependency analysis
# The account needs sudo access to run ls and netstat for dependency discovery
sudo useradd -m -s /bin/bash azuremigrate-dep
echo "azuremigrate-dep:YourSecurePassword123!" | sudo chpasswd

# Grant sudo access for the required commands without password prompts
LS_PATH="$(command -v ls)"
NETSTAT_PATH="$(command -v netstat)"
echo "azuremigrate-dep ALL=(ALL) NOPASSWD: ${LS_PATH}, ${NETSTAT_PATH}" | sudo tee /etc/sudoers.d/azuremigrate
sudo chmod 440 /etc/sudoers.d/azuremigrate
```

You can add multiple credential sets on the appliance. It will try each one against each server until it finds one that works.

## Step 2: Review Dependency Analysis on Discovered Servers

Once credentials are configured and discovery runs, Azure Migrate automatically enables agentless dependency analysis for discovered servers that pass validation, up to 1,000 servers per appliance.

1. Go to your Azure Migrate project
2. Go to the Azure Migrate: Discovery and assessment inventory
3. Open the "All inventory" or "Infrastructure inventory" view
4. Check the "Dependencies" or "Dependencies (agentless)" column for each server
5. Use "Manage Dependencies" only if you need to disable analysis on some servers or enable it on other eligible servers after freeing capacity under the 1,000-server-per-appliance limit

If you have thousands of servers, consider disabling analysis on lower-priority servers so the appliance can collect dependency data for the ones involved in your first migration wave.

After dependency analysis is enabled, the appliance polls dependency data every five minutes and sends aggregated data to Azure Migrate every six hours. For the best results, let it run for at least 24 hours to capture daily patterns.

## Step 3: Visualize Dependencies

After collection has been running for a while, you can view the dependency map for any server.

1. Find the server in the discovered servers list
2. Select "View dependencies" in the "Dependencies" or "Dependencies (agentless)" column
3. Set your time range, such as the last 24 hours, last 7 days, last 30 days, or a custom range
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
2. In the dependency visualization, multi-select the related servers and use tags to identify them as an application, or go back to the Azure Migrate project and create a group
3. Add the interdependent servers to the group
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
2. Look at the "Dependencies" or "Dependencies (agentless)" column
3. Possible statuses include:
   - **View dependencies** - validation passed and dependency analysis is enabled
   - **Credentials not available** - no usable server credentials were provided on the appliance
   - **Validation in progress** - prerequisite checks have not finished yet
   - **Validation failed** - the server failed prerequisite checks, such as invalid credentials or insufficient permissions
   - **Not initiated** - Azure Migrate reached the 1,000-server-per-appliance automatic enablement limit
   - **Disabled** - dependency analysis was manually disabled
   - **Not supported** - dependency data cannot be collected for that server, such as a server discovered through CSV import

For servers where collection fails, check the network connectivity from the appliance and verify that the provided credentials work. Common issues include Windows Firewall or WinRM configuration issues for Windows servers, SSH being disabled on Linux servers in Hyper-V or physical discovery scenarios, or the credentials lacking sufficient privileges.

## Data Retention and Limits

Agentless dependency data is retained for up to 30 days. You can analyze up to 1,000 servers simultaneously per appliance. If you have more than 1,000 servers, you can deploy additional appliances and register them to the same Azure Migrate project.

The dependency data itself is stored in the Azure Migrate project and does not incur separate charges. This is a significant advantage over the agent-based approach, which sends data to a Log Analytics workspace where ingestion costs can add up.

## Practical Tips

**Run dependency analysis during business hours.** Weekday traffic patterns look different from weekend ones. If your migration cutover is planned for a weekend, also check weekend dependency patterns to ensure you are not missing batch jobs that only run on specific days.

**Export dependency data.** The portal visualization is useful, but for large environments, exporting to CSV gives you more flexibility to analyze in Excel or Power BI. Use the "Export" option in the discovered servers view.

**Combine with application owners' knowledge.** Dependency analysis shows network connections, but it does not explain the business context. A connection to a server might be critical for the application or it might be a leftover from a decommissioned feature. Validate the dependency map with the application team.

## Wrapping Up

Agentless dependency analysis in Azure Migrate gives you a clear picture of how your servers interact without installing anything on the servers themselves. Set up the credentials, review which servers were enabled, let it run for a few days, and then use the dependency maps to form smart migration groups. This prevents the all-too-common scenario of migrating a server only to discover that it cannot reach a critical dependency.

Combined with the assessment data from Azure Migrate, dependency analysis rounds out your migration planning toolkit and sets you up for a smooth transition to Azure.
