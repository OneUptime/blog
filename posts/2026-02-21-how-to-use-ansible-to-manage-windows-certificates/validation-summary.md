# Validation Summary: How to Use Ansible to Manage Windows Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- Windows certificate stores
- PowerShell
- IIS HTTPS certificate bindings
- Ansible Vault

## Sources Consulted
- Ansible `ansible.windows.win_certificate_store` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_certificate_store_module.html
- Ansible `ansible.windows.win_uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_uri_module.html
- Microsoft PowerShell Certificate provider documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/about/about_certificate_provider
- Microsoft `New-SelfSignedCertificate` documentation: https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate
- Microsoft `ConvertTo-Json` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json
- Microsoft `Invoke-WebRequest` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest
- Microsoft `Get-WebBinding` documentation: https://learn.microsoft.com/en-us/powershell/module/webadministration/get-webbinding
- Microsoft IIS `Binding.CertificateHash` documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.administration.binding.certificatehash

## Issues Found
- Added `become` with `runas` as `SYSTEM` to password-protected PFX imports. The Ansible module documentation notes that some PKCS#12 operations require CredSSP, Kerberos delegation, or `become`, and IIS usage generally needs machine key storage.
- Added `C:\Temp` and `C:\CertBackups` directory creation before copying or writing certificate files. The original examples assumed these directories already existed.
- Replaced `ConvertTo-Json -AsArray` in the PowerShell discovery snippets with Windows PowerShell 5.1-compatible `ConvertTo-Json -InputObject` usage. `-AsArray` was introduced after Windows PowerShell 5.1, which is still the common shell used by Ansible Windows automation.
- Changed JSON objects emitted from PowerShell to `[PSCustomObject]` values so Ansible receives predictable object arrays for `from_json`.
- Removed `127.0.0.1` from the `New-SelfSignedCertificate -DnsName` example because that parameter is for DNS names, not IP address subject alternative names.
- Replaced the renewal workflow's hard-coded backup PFX password with a vaulted `backup_password` variable and marked the backup task `no_log: true`.
- Replaced `Invoke-WebRequest -SkipCertificateCheck` with `ansible.windows.win_uri` and `validate_certs: false`. `-SkipCertificateCheck` is not available in Windows PowerShell 5.1, while `win_uri` is the supported Ansible module for Windows HTTP checks.
- Made IIS certificate hash retrieval handle byte-array hashes by converting them to a hexadecimal thumbprint string before using the value to find the existing certificate.

## Review Notes
The examples are now technically valid for current Ansible Windows collection behavior and remain compatible with typical Windows PowerShell 5.1 targets. The IIS renewal workflow still assumes a single HTTPS binding for the site; environments with multiple HTTPS bindings should filter by port, IP address, or host header.
