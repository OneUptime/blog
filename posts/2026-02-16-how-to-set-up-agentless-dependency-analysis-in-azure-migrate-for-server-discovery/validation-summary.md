# Validation Summary: How to Set Up Agentless Dependency Analysis in Azure Migrate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Migrate: Discovery and assessment
- Agentless dependency analysis
- Agent-based dependency analysis
- Azure Migrate appliance
- VMware vSphere and vCenter Server
- Hyper-V
- Physical server discovery
- Windows PowerShell remoting / WinRM
- Linux sudo, ls, and netstat
- Azure Monitor Agent and Dependency Agent

## Sources Consulted
- Microsoft Learn: Set up Agentless Dependency Analysis in Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/how-to-create-group-machine-dependencies-agentless
- Microsoft Learn: Dependency analysis in Azure Migrate Discovery and assessment - https://learn.microsoft.com/en-us/azure/migrate/concepts-dependency-visualization
- Microsoft Learn: Discovery and dependency analysis - Common questions - https://learn.microsoft.com/en-us/azure/migrate/common-questions-discovery-dependency-analysis
- Microsoft Learn: Provide server credentials to discover software inventory, dependencies, web apps, and SQL Server instances and databases - https://learn.microsoft.com/en-us/azure/migrate/add-server-credentials
- Microsoft Learn: VMware server discovery support in Azure Migrate and Modernize - https://learn.microsoft.com/en-us/azure/migrate/migrate-support-matrix-vmware
- Microsoft Learn: Troubleshoot issues with agentless and agent-based dependency analysis - https://learn.microsoft.com/en-us/azure/migrate/troubleshoot-dependencies

## Issues Found
- The post said agentless dependency analysis only works for VMware VMs. Current Microsoft documentation states that agentless dependency analysis is generally available for VMware VMs, Hyper-V VMs, physical servers, and servers running in other clouds. Updated the comparison table, prerequisite language, and trade-off description.
- The post described manual enablement as the normal workflow. Current enhanced dependency analysis automatically runs on eligible discovered servers, up to 1,000 servers per appliance. Updated Step 2 to describe reviewing auto-enabled dependencies and using Manage Dependencies only for enable/disable management.
- The post listed Windows and Linux target server ports as if they applied uniformly. For VMware agentless dependency analysis, the appliance connects to ESXi hosts on TCP 443 and gathers data through vSphere APIs. For Hyper-V and physical servers, Windows uses WinRM 5986/5985 and Linux uses SSH 22. Updated the prerequisites accordingly.
- The post referenced Microsoft Monitoring Agent for agent-based dependency analysis. MMA was retired on August 31, 2024, and Microsoft documentation now describes using Azure Monitor Agent with the Dependency Agent. Updated the agent-based comparison text.
- The Linux sudoers example granted access to netstat and ss. Microsoft documentation requires sudo access for ls and netstat, or equivalent Linux capabilities on those binaries. Updated the example to grant passwordless sudo for ls and netstat and set the sudoers file mode to 440.
- The Windows example set WSMan TrustedHosts to "*", which is not required for the target server prerequisite and is overly broad. Removed that command while leaving the WinRM enablement example.
- The monitoring status list used outdated or imprecise labels. Updated it with current documented statuses such as View dependencies, Credentials not available, Validation in progress, Validation failed, Not initiated, Disabled, and Not supported.
- The visualization and grouping steps referenced older portal behavior. Updated them to use the current View dependencies column and current enhanced dependency visualization/application tagging language.

## Review Notes
- The post is now aligned with the current enhanced Azure Migrate dependency analysis experience. Some classic Azure Migrate dependency workflows still exist for existing users, so the post now includes a short caveat that classic workflow details may differ.
