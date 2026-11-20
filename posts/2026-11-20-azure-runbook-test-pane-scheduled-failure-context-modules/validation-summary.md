# Validation summary

Reviewed official draft/published execution, schedule-linked parameters, context isolation, output streams, module inspection, runtime environments, and Hybrid Worker documentation.

Verified the official PowerShell7.4.6 release SHA256 and ran its macOS arm64 binary locally. Az.Accounts5.3.0 and Az.Resources8.1.0 imported successfully from official packages. The published probe exactly matches the tested file and passed the native PowerShell parser. Mocked Azure command tests verified stage records and rejection of a wrong tenant before resource access. Mermaid structure has seven nodes/six edges. Generated social image visually reviewed without clipping.

Module imports and PowerShell execution are real; Azure calls were replaced by test functions. No real identity endpoint, RBAC, published/scheduled job, Hybrid Worker, network path, or concurrent Automation job was tested. Mermaid was not rendered.

## Sources

- https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules
- https://learn.microsoft.com/en-us/azure/automation/manage-runbooks
- https://learn.microsoft.com/en-us/azure/automation/automation-hrw-run-runbooks
- https://learn.microsoft.com/en-us/azure/automation/automation-runbook-output-and-messages
- https://learn.microsoft.com/en-us/azure/automation/context-switching
- https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-module
- https://www.powershellgallery.com/packages/Az.Accounts/5.3.0
- https://www.powershellgallery.com/packages/Az.Resources/8.1.0
- https://learn.microsoft.com/en-us/azure/automation/runtime-environment-overview

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
