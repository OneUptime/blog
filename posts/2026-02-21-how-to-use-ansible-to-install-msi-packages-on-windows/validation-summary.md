# Validation Summary: How to Use Ansible to Install MSI Packages on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows.win_package
- ansible.windows.win_copy
- ansible.windows.win_file
- ansible.windows.win_reboot
- Windows Installer MSI packages
- msiexec command-line options
- PowerShell registry queries
- YAML playbooks

## Sources Consulted
- Ansible `ansible.windows.win_package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_package_module.html
- Microsoft `msiexec` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec
- Microsoft Standard Installer command-line options: https://learn.microsoft.com/en-us/windows/win32/msi/standard-installer-command-line-options
- Microsoft Windows Installer error codes: https://learn.microsoft.com/en-us/windows/win32/msi/error-codes
- Microsoft MSI installation error 1603 documentation: https://learn.microsoft.com/en-us/troubleshoot/windows-server/application-management/msi-installation-error-1603

## Issues Found
- The post described `product_id` as strictly required for idempotency. Current `ansible.windows.win_package` documentation says local MSI paths can be used for idempotency checks and that `product_id` should be set for EXE installers, URLs, network shares, or when credential delegation is not being used. Updated the wording to reflect that distinction.
- The EXE installer section labeled a `.msi` Node.js installer as an NSIS installer. Changed the task name to identify it as a Node.js MSI package.
- The custom `expected_return_code` example included `1603` as a success code. Microsoft documents 1603 as a fatal installation error, so it should not be treated as expected success. Removed `1603` from the list.
- The return-code explanation implied only 0 and 3010 were standard MSI success codes. Updated the text to clarify that Ansible defaults to 0 and 3010, while Windows Installer also defines 1641 as success with reboot initiated.

## Review Notes
The examples are illustrative and include placeholder product IDs for internal applications. Real deployments should verify product codes against each specific MSI or installer version.
