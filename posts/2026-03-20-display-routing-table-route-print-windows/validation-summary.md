# Validation Summary: How to Display the Routing Table with route print on Windows

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Windows `route` command (`route print`)
- Windows PowerShell `Get-NetRoute`
- Windows networking and routing tables
- IPv4 routing concepts

## Sources Consulted
- Microsoft Learn, `route` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn, `Get-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps
- Microsoft Learn, `findstr` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn, troubleshooting article showing `route print -4` output and recommending `Get-NetRoute -PolicyStore PersistentStore`: https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/incorrect-default-gateways-in-persistent-routes
- Microsoft Learn, Azure SQL Managed Instance connectivity troubleshooting example using `route print -4`: https://learn.microsoft.com/el-gr/azure/azure-sql/managed-instance/connect-application-instance?view=azuresql-mi
- IANA IPv4 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112

## Issues Found
- The post said the output had three sections, but Windows route output can also include a separate `Persistent Routes` section. I corrected that description so it matches documented and observed output.
- The filtering examples used `findstr` for route selection. The `route` command has its own documented print filtering syntax, so I changed the default-route and subnet examples to `route print 0.0.0.0` and `route print 10.*`.
- The `findstr /i "persistent"` example did not actually show persistent route entries; it would only match the header line. I replaced it with the Microsoft-documented PowerShell command `Get-NetRoute -AddressFamily IPv4 -PolicyStore PersistentStore`, which reliably returns persistent IPv4 routes.
- The PowerShell comment claimed the example showed the IPv4 routing table "with full details", but `Format-Table` does not display every property. I corrected the wording without changing the overall example.
- I tightened the column explanations for `Interface` and `Metric` so they align better with Windows route selection behavior.

## Review Notes
- Microsoft’s main `route` syntax page does not document the `-4` switch, but current Microsoft Learn troubleshooting content includes `route print -4` examples that output the IPv4 routing table. The post’s `route print -4` usage is therefore retained.
- The route metric is not the only factor in route choice; prefix specificity is considered first. The updated wording now reflects that metrics are compared among equally specific routes.
