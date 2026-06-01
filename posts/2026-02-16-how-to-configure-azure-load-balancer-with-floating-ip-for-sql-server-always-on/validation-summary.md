# Validation Summary: How to Configure Azure Load Balancer with Floating IP for SQL Server Always On

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- SQL Server Always On Availability Groups
- Windows Server Failover Clustering
- PowerShell
- Windows Firewall

## Sources Consulted
- Microsoft Learn: Configure an Azure load balancer for an AG VNN listener - SQL Server on Azure VMs: https://learn.microsoft.com/en-us/azure/azure-sql/virtual-machines/windows/availability-group-vnn-azure-load-balancer-configure?view=azuresql
- Microsoft Learn: Use PowerShell or Azure CLI to configure a single subnet Always On availability group for SQL Server on Azure VMs: https://learn.microsoft.com/en-us/azure/azure-sql/virtual-machines/windows/availability-group-az-commandline-configure?view=azuresql
- Microsoft Learn: az network lb rule: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn: az network lb probe: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: az network nic ip-config address-pool: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool
- Microsoft Learn: Azure Load Balancer Floating IP configuration: https://learn.microsoft.com/en-ca/azure/load-balancer/load-balancer-floating-ip

## Issues Found
- The health probe section described creating a custom TCP listener that runs only on the primary replica. Microsoft guidance for SQL Server Always On AG VNN listeners uses the WSFC IP Address resource `ProbePort` cluster parameter so the cluster replies to load balancer health probes on the node that owns the listener IP resource. I replaced the custom listener script with Windows Firewall and optional dynamic port exclusion steps.
- The troubleshooting section still referred to a custom probe listener. I changed it to verify the firewall rule and the `ProbePort` cluster parameter.
- The manual failover example was marked as PowerShell even though it is T-SQL. I changed the code fence to `sql` and updated the comments to T-SQL comment syntax.

## Review Notes
The Azure CLI examples use current documented commands and flags, including `az network lb probe create --threshold`, `az network lb rule create --enable-floating-ip`, and `az network nic ip-config address-pool add --lb-name`. The post correctly uses Standard Load Balancer, floating IP/direct server return, matching frontend and backend SQL ports, a `/32` cluster subnet mask, and a distinct probe port per listener. For SQL Server 2019 CU8 and later on Windows Server 2016 and later, Microsoft also documents Distributed Network Name listeners as an alternative to the traditional VNN plus Azure Load Balancer design.
