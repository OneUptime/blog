# Validation Summary: How to Install Azure CLI on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Azure CLI (`az`)
- Ubuntu (apt / Microsoft package repository)
- Azure Resource Manager (resource groups, locks, ARM templates)
- Azure Virtual Machines
- Azure Kubernetes Service (AKS) and node pools
- Azure Storage (blobs, file shares, SAS)
- Microsoft Entra ID (Azure AD) users, groups, applications
- Service principals and RBAC role assignments
- JMESPath queries and Azure CLI output formats
- Azure CLI extensions

## Sources Consulted
- Install the Azure CLI on Linux — https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux (apt step-by-step: keyrings, deb822 `.sources` format, one-line script)
- Azure CLI configuration options — https://learn.microsoft.com/en-us/cli/azure/azure-cli-configuration (valid `az config` keys for the `core` and `logging` sections)
- Azure CLI command reference — https://learn.microsoft.com/en-us/cli/azure/ (cross-checked az login, vm, aks, storage, ad, sp, role, extension subcommands and flags)

## Issues Found

1. **Invalid config key `core.timeout`** (Troubleshooting → Performance Issues). The post used `az config set core.timeout=300` to "increase timeout for slow operations." No such configuration key exists in the Azure CLI; the official configuration reference lists no `core.timeout`. Removed the invalid command (the `--no-wait` / `az ... wait` pattern shown immediately after is the correct guidance for long-running operations).

2. **Misleading comment on `core.only_show_errors`** (Performance Issues). The line `az config set core.only_show_errors=false` was captioned "Enable command execution time display," which it does not do — the setting controls whether warnings (preview/deprecated/experimental notices) are shown. Corrected the comment to describe the setting's actual behavior.

3. **`core.disable_confirm_prompt` misplaced under SSL** (Troubleshooting → Certificate and SSL Issues). Under "Disable SSL verification," the post ran `az config set core.disable_confirm_prompt=true`. That key toggles confirmation prompts and has nothing to do with SSL/certificate verification. Removed it; the actual bypass is the `AZURE_CLI_DISABLE_CONNECTION_VERIFICATION=1` environment variable shown on the next line.

4. **Telemetry mislabeled as debug logging** (Troubleshooting → Logging and Debugging). Under "Enable debug logging," the post set `az config set core.collect_telemetry=true`. Telemetry collection sends anonymous usage data to Microsoft and produces no user-inspectable debug logs. Removed the line and kept the correct `logging.enable_log_file=true`, updating the comment to "Enable file logging for debugging."

## Review Notes
- The installation instructions (Method 1) match Microsoft's current official apt procedure exactly: `/etc/apt/keyrings/microsoft.gpg` signing key plus the deb822 `azure-cli.sources` file. The one-line script (`https://aka.ms/InstallAzureCLIDeb`) and the pip-based method are both still valid alternatives, though Microsoft generally recommends the package-repository approach.
- VM image aliases (`Ubuntu2404`, `Win2022Datacenter`), VM/AKS/storage/AD/service-principal commands, RBAC role assignments, JMESPath query examples, and extension management commands were all checked and are syntactically correct and current.
- Minor non-blocking caveats (left as-is): some `az vm list --query "[?powerState=='VM running']"` examples require `--show-details` for the `powerState` field to be populated (the post's full complex example correctly includes `--show-details`); and `az rest --url "https://status.azure.com/api/status"` is illustrative of `az rest` usage rather than a guaranteed public API endpoint. Neither is a technical error in the command syntax.
- The `pip3 install azure-cli` method works but ties the CLI to a system Python; the apt repository remains the more maintainable choice for most users.
