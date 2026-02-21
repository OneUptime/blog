# How to Use Ansible to Install MSI Packages on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, MSI, Package Management

Description: Learn how to install, upgrade, and manage MSI packages on Windows hosts using Ansible with the win_package module and practical examples.

---

Installing software on Windows servers is something every sysadmin does regularly. Whether it is a monitoring agent, a database driver, a runtime, or an internal application, MSI packages are the standard way to distribute and install software on Windows. Doing this manually across multiple servers is tedious and error-prone. Ansible's `win_package` module makes MSI installation automated, repeatable, and idempotent.

## The win_package Module

The `win_package` module is the primary tool for installing MSI (and EXE) packages on Windows. It supports:

- Local MSI/EXE files on the target
- UNC paths (network shares)
- HTTP/HTTPS URLs for direct download
- Product ID-based idempotency
- Silent installation arguments
- Return code handling

## Basic MSI Installation

The simplest case is installing an MSI that has already been copied to the target server:

```yaml
# playbook-install-msi.yml
# Installs an MSI package from a local path on the Windows host
- name: Install MSI package
  hosts: windows
  tasks:
    - name: Copy MSI to target server
      ansible.windows.win_copy:
        src: files/myapp-installer.msi
        dest: C:\Temp\myapp-installer.msi

    - name: Install the application
      ansible.windows.win_package:
        path: C:\Temp\myapp-installer.msi
        product_id: "{12345678-1234-1234-1234-123456789012}"
        state: present
      register: install_result

    - name: Clean up installer
      ansible.windows.win_file:
        path: C:\Temp\myapp-installer.msi
        state: absent

    - name: Reboot if required
      ansible.windows.win_reboot:
      when: install_result.reboot_required
```

The `product_id` is crucial for idempotency. Ansible uses it to check whether the package is already installed. If the product ID is found in the Windows registry, the task is skipped. You can find the product ID by installing the MSI manually and checking the registry at `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\`.

## Installing from a Network Share

For larger environments, keeping installers on a network share avoids copying files to each target:

```yaml
# playbook-install-from-share.yml
# Installs an MSI directly from a network share
- name: Install from network share
  hosts: windows
  tasks:
    - name: Install application from share
      ansible.windows.win_package:
        path: \\fileserver\Software\Installers\agent-setup.msi
        product_id: "{ABCDEF01-2345-6789-ABCD-EF0123456789}"
        state: present
        arguments: /qn INSTALLDIR="C:\Program Files\Agent" CONFIGSERVER=config.corp.local
```

## Installing from a URL

You can install directly from an HTTP or HTTPS URL. Ansible will download the file, install it, and clean up:

```yaml
# playbook-install-from-url.yml
# Downloads and installs an MSI from an HTTP URL
- name: Install from URL
  hosts: windows
  tasks:
    - name: Install 7-Zip
      ansible.windows.win_package:
        path: https://www.7-zip.org/a/7z2301-x64.msi
        product_id: "{23170F69-40C1-2702-2301-000001000000}"
        state: present
        arguments: /qn
```

## MSI Arguments and Silent Installation

Most MSI packages support standard Windows Installer arguments. The most common ones:

| Argument | Description |
|----------|-------------|
| `/qn` | Quiet mode, no UI |
| `/qb` | Basic UI (progress bar only) |
| `/norestart` | Suppress automatic reboot |
| `/L*v logfile.log` | Verbose logging to a file |
| `PROPERTY=value` | Set MSI property values |

```yaml
# playbook-silent-install.yml
# Performs a silent installation with custom properties and logging
- name: Silent MSI installation with custom properties
  hosts: windows
  tasks:
    - name: Install application with custom configuration
      ansible.windows.win_package:
        path: C:\Temp\enterprise-app.msi
        product_id: "{99887766-5544-3322-1100-AABBCCDDEEFF}"
        state: present
        arguments: >-
          /qn
          /norestart
          /L*v C:\Temp\enterprise-app-install.log
          INSTALLDIR="C:\Apps\EnterpriseApp"
          DBSERVER=sqlserver.corp.local
          DBNAME=AppDatabase
          SERVICEACCOUNT=DOMAIN\svc-app
```

The `>-` YAML syntax lets you write the arguments on multiple lines for readability while joining them into a single line.

## Installing EXE Packages

The `win_package` module also handles EXE installers. The main difference is that you need to specify the correct silent install arguments for the specific installer framework:

```yaml
# playbook-install-exe.yml
# Installs an EXE-based application with silent flags
- name: Install EXE package
  hosts: windows
  tasks:
    - name: Install Visual C++ Redistributable
      ansible.windows.win_package:
        path: C:\Temp\vc_redist.x64.exe
        product_id: "{A8557BA2-6528-4BF3-B227-A37B4C3B5E6E}"
        state: present
        arguments: /install /quiet /norestart

    - name: Install Node.js (NSIS installer)
      ansible.windows.win_package:
        path: C:\Temp\node-v20.10.0-x64.msi
        product_id: "{1F923C66-D96C-4BE2-8B0C-E86E1F684713}"
        state: present
        arguments: /qn
```

## Finding the Product ID

If you do not know the product ID, you have several options:

```yaml
# playbook-find-product-id.yml
# Searches for installed product IDs by name
- name: Find product ID
  hosts: windows
  tasks:
    - name: Search for installed products by name
      ansible.windows.win_shell: |
        # Search the uninstall registry for a product name
        $searchName = "7-Zip"
        $paths = @(
          "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
          "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
        )
        foreach ($path in $paths) {
          Get-ItemProperty $path -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like "*$searchName*" } |
            Select-Object DisplayName, PSChildName, DisplayVersion |
            ForEach-Object {
              @{
                Name = $_.DisplayName
                ProductId = $_.PSChildName
                Version = $_.DisplayVersion
              }
            }
        }  | ConvertTo-Json
      register: product_search

    - name: Display found products
      ansible.builtin.debug:
        msg: "{{ product_search.stdout | from_json }}"
```

You can also use the `creates` parameter instead of `product_id` to check for the existence of a specific file:

```yaml
# Use file existence check instead of product_id
    - name: Install app using creates check
      ansible.windows.win_package:
        path: C:\Temp\myapp.msi
        state: present
        creates_path: C:\Program Files\MyApp\myapp.exe
        arguments: /qn
```

## Upgrading Packages

To upgrade an already installed package, use the new installer with the updated product ID:

```yaml
# playbook-upgrade.yml
# Upgrades an application to a new version
- name: Upgrade application
  hosts: windows
  tasks:
    - name: Uninstall old version
      ansible.windows.win_package:
        product_id: "{OLD-PRODUCT-GUID-HERE}"
        state: absent
        arguments: /qn

    - name: Install new version
      ansible.windows.win_package:
        path: C:\Temp\myapp-v2.msi
        product_id: "{NEW-PRODUCT-GUID-HERE}"
        state: present
        arguments: /qn
```

Some MSI packages support in-place upgrades without uninstalling first. This depends on the MSI being built with major upgrade support.

## Uninstalling Packages

To uninstall, set `state: absent` and provide the product ID:

```yaml
# playbook-uninstall.yml
# Uninstalls a package by its product ID
- name: Uninstall package
  hosts: windows
  tasks:
    - name: Uninstall old monitoring agent
      ansible.windows.win_package:
        product_id: "{AGENT-PRODUCT-GUID}"
        state: absent
        arguments: /qn /norestart
```

## Handling Return Codes

MSI installers use specific return codes. The module knows the standard ones (0 for success, 3010 for success with reboot required), but some installers use non-standard codes. You can specify expected return codes:

```yaml
# playbook-return-codes.yml
# Handles custom return codes from a non-standard installer
- name: Install with custom return codes
  hosts: windows
  tasks:
    - name: Install application with custom success codes
      ansible.windows.win_package:
        path: C:\Temp\custom-app.msi
        product_id: "{CUSTOM-GUID}"
        state: present
        arguments: /qn
        expected_return_code:
          - 0
          - 3010
          - 1641
          - 1603
```

## Batch Installation Playbook

Here is a complete playbook for installing a standard set of software on new Windows servers:

```yaml
# playbook-standard-software.yml
# Installs the standard software stack on newly provisioned Windows servers
- name: Install standard server software
  hosts: windows
  vars:
    software_share: \\fileserver\Software

  tasks:
    - name: Create temp directory
      ansible.windows.win_file:
        path: C:\Temp\Installers
        state: directory

    - name: Install .NET Framework 4.8
      ansible.windows.win_package:
        path: "{{ software_share }}\\DotNet\\ndp48-x86-x64-allos-enu.exe"
        product_id: "{92FB6C44-E685-45AD-9B20-CADF4CABA132}"
        state: present
        arguments: /q /norestart
      register: dotnet_install

    - name: Install Visual C++ Redistributable 2019
      ansible.windows.win_package:
        path: "{{ software_share }}\\VCRedist\\vc_redist.x64.exe"
        product_id: "{A8557BA2-6528-4BF3-B227-A37B4C3B5E6E}"
        state: present
        arguments: /install /quiet /norestart

    - name: Install monitoring agent
      ansible.windows.win_package:
        path: "{{ software_share }}\\Monitoring\\agent-setup.msi"
        product_id: "{MON-AGENT-GUID}"
        state: present
        arguments: >-
          /qn
          SERVERURL=https://monitoring.corp.local
          APIKEY={{ vault_monitoring_api_key }}

    - name: Install backup agent
      ansible.windows.win_package:
        path: "{{ software_share }}\\Backup\\backup-agent.msi"
        product_id: "{BACKUP-AGENT-GUID}"
        state: present
        arguments: /qn BACKUPSERVER=backup.corp.local

    - name: Check if reboot is needed
      ansible.builtin.set_fact:
        needs_reboot: "{{ dotnet_install.reboot_required | default(false) }}"

    - name: Reboot if any installation requires it
      ansible.windows.win_reboot:
        reboot_timeout: 600
      when: needs_reboot
```

## Tips for MSI Automation

**Always use product IDs.** Without a product ID or `creates_path`, Ansible cannot check if the software is already installed. It will try to install it every time, which wastes time and can cause problems.

**Log your installations.** Use the `/L*v` MSI logging flag during development and testing. These logs are invaluable for troubleshooting failed installations.

**Test arguments manually first.** Before putting installation arguments in a playbook, test them by running `msiexec /i package.msi /qn` from a PowerShell prompt on the target machine. This catches argument issues early.

**Use Ansible Vault for sensitive properties.** API keys, license keys, and passwords passed as MSI properties should be encrypted with Vault.

**Handle reboots carefully.** Some packages require a reboot. Use `register` to capture the result and conditionally reboot at the end of the playbook rather than after each package. This avoids multiple unnecessary reboots.

MSI package management with Ansible turns a tedious manual process into a reliable, automated workflow. Whether you are provisioning new servers or maintaining existing ones, having your software stack defined in a playbook means every server gets exactly the same software, configured exactly the same way.
