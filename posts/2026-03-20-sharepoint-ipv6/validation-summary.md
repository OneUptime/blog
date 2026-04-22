# Validation Summary: How to Configure SharePoint for IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- SharePoint Server
- IPv6
- IIS / WebAdministration PowerShell
- SharePoint Alternate Access Mappings
- SQL Server client aliases
- Windows Firewall
- Windows PowerShell networking cmdlets

## Sources Consulted
- Microsoft Learn: IP support in SharePoint Server - https://learn.microsoft.com/en-us/sharepoint/install/ip-support
- Microsoft Learn: Configure alternate access mappings for SharePoint Server - https://learn.microsoft.com/en-us/sharepoint/administration/configure-alternate-access-mappings
- Microsoft Learn: New-SPAlternateURL - https://learn.microsoft.com/en-us/powershell/module/microsoft.sharepoint.powershell/new-spalternateurl
- Microsoft Learn: New-WebBinding - https://learn.microsoft.com/en-us/powershell/module/webadministration/new-webbinding
- Microsoft Learn: IIS binding element - https://learn.microsoft.com/en-us/iis/configuration/system.applicationHost/sites/site/bindings/binding
- Microsoft Learn: Update a web application URL and IIS bindings for SharePoint Server Subscription Edition - https://learn.microsoft.com/en-us/sharepoint/administration/change-web-application-bindings
- Microsoft Learn: Configure SQL Server security for SharePoint Server - https://learn.microsoft.com/en-us/sharepoint/security-for-sharepoint-server/configure-sql-server-security-for-sharepoint-environments
- Microsoft Learn: New-NetFirewallRule - https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule
- Microsoft Learn: Test-NetConnection - https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn: Invoke-WebRequest - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8::sharepoint` and `2001:db8::sql-server`. IPv6 hextets must be hexadecimal, so these were replaced with valid documentation-prefix examples or DNS names that can resolve to IPv6.
- The AAM examples used raw IPv6 literal SharePoint URLs. Microsoft states that SharePoint end-user URLs over IPv6 must use DNS names with AAAA records and that browsing to SharePoint URLs using IPv6 literal addresses is not supported. The AAM examples were changed to DNS-name URLs and the PowerShell example now adds an internal DNS-name mapping with `-Internal`.
- The IIS binding examples used `::` as the all-IPv6 binding address. Microsoft IIS examples use `*` for All Unassigned, and IIS documentation describes that setting as all IP addresses. The examples now use `*` for all addresses and show a valid specific IPv6 literal separately.
- The HTTPS binding example created a binding without assigning a certificate. The example now includes a certificate thumbprint placeholder and calls `AddSslCertificate`, matching Microsoft WebAdministration guidance.
- The SQL Server client alias registry example used connection-string syntax (`tcp:[...],1433`) instead of the SQL client alias registry value format. It was changed to `DBMSSOCN,sqlserver.example.com,1433`, and the snippet now creates the `ConnectTo` key and alias value if needed.
- The verification examples tested SharePoint by raw IPv6 literal URL and used the deprecated `Invoke-WebRequest -UseBasicParsing` switch. They now test the DNS name, request detailed `Test-NetConnection` output so the IPv6 remote address can be confirmed, and omit `-UseBasicParsing`.

## Review Notes
The post is now technically accurate as a general SharePoint Server IPv6 configuration guide. In a future revision, it could call out that SharePoint Server Subscription Edition can manage web application IIS bindings through Central Administration or `Set-SPWebApplication`, while older farms often require checking both SharePoint AAM and IIS state carefully.
