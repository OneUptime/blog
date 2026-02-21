# How to Use Ansible win_iis_website Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, IIS, Web Server

Description: Automate IIS website creation and configuration on Windows Server using the Ansible win_iis_website module with real examples.

---

Internet Information Services (IIS) is the web server built into Windows Server. If you run ASP.NET applications, host internal web tools, or serve static content on Windows, chances are you are running IIS. Managing IIS websites manually through the GUI works fine for a single server, but when you are deploying across multiple environments (dev, staging, production) or managing a fleet of web servers, automation becomes essential.

The `community.windows.win_iis_website` module lets you create, configure, start, stop, and remove IIS websites entirely through Ansible playbooks.

## Prerequisites

IIS must be installed on the target server before you can create websites. Here is how to ensure it is installed:

```yaml
# playbook-install-iis.yml
# Installs IIS with common features needed for hosting web applications
- name: Install IIS
  hosts: windows
  tasks:
    - name: Install IIS web server role
      ansible.windows.win_feature:
        name:
          - Web-Server
          - Web-Common-Http
          - Web-Asp-Net45
          - Web-ISAPI-Ext
          - Web-ISAPI-Filter
          - Web-Mgmt-Console
        state: present
      register: iis_install

    - name: Reboot if required
      ansible.windows.win_reboot:
      when: iis_install.reboot_required
```

You also need the `community.windows` collection:

```bash
# Install the community.windows collection
ansible-galaxy collection install community.windows
```

## Creating a Basic Website

Here is the simplest way to create an IIS website:

```yaml
# playbook-basic-site.yml
# Creates a basic IIS website with HTTP binding on port 80
- name: Create basic IIS website
  hosts: windows
  tasks:
    - name: Create site directory
      ansible.windows.win_file:
        path: C:\inetpub\myapp
        state: directory

    - name: Create IIS website
      community.windows.win_iis_website:
        name: MyApplication
        physical_path: C:\inetpub\myapp
        port: 80
        state: started
```

This creates a website named "MyApplication" that listens on port 80 and serves content from `C:\inetpub\myapp`. The `state: started` parameter ensures the site is running after creation.

## Site States

The `state` parameter accepts several values:

| State | Description |
|-------|-------------|
| `started` | Site exists and is running |
| `stopped` | Site exists but is not running |
| `restarted` | Site is restarted (useful for config changes) |
| `absent` | Site is completely removed |

## Configuring Hostname Bindings

In production, you typically bind sites to specific hostnames rather than just ports. This lets you run multiple sites on the same IP address and port.

```yaml
# playbook-hostname-binding.yml
# Creates a website with hostname binding for virtual hosting
- name: Create site with hostname binding
  hosts: windows
  tasks:
    - name: Create site directory
      ansible.windows.win_file:
        path: C:\inetpub\store
        state: directory

    - name: Create website with hostname
      community.windows.win_iis_website:
        name: OnlineStore
        physical_path: C:\inetpub\store
        port: 80
        hostname: store.example.com
        ip: "*"
        state: started
```

## HTTPS Bindings with SSL Certificates

For HTTPS sites, you need to specify the SSL certificate hash and the certificate store:

```yaml
# playbook-https-site.yml
# Creates an HTTPS-enabled website with SSL certificate binding
- name: Create HTTPS website
  hosts: windows
  vars:
    cert_thumbprint: "ABC123DEF456789..."

  tasks:
    - name: Create site directory
      ansible.windows.win_file:
        path: C:\inetpub\secureapp
        state: directory

    - name: Create HTTPS website
      community.windows.win_iis_website:
        name: SecureApp
        physical_path: C:\inetpub\secureapp
        port: 443
        hostname: secure.example.com
        ssl: true
        state: started
      register: site_result

    - name: Bind SSL certificate to the site
      ansible.windows.win_shell: |
        # Bind the certificate to the HTTPS binding
        $binding = Get-WebBinding -Name "SecureApp" -Protocol "https"
        $binding.AddSslCertificate("{{ cert_thumbprint }}", "My")
      when: site_result.changed
```

## Application Pool Configuration

Every IIS website runs inside an application pool. While `win_iis_website` does not directly create app pools, you can use the `win_iis_webapppool` module alongside it:

```yaml
# playbook-with-apppool.yml
# Creates a website with a dedicated application pool
- name: Create website with dedicated app pool
  hosts: windows
  vars:
    app_name: CustomerPortal
    app_path: C:\inetpub\customerportal
    app_pool_user: DOMAIN\svc-customerportal
    app_pool_pass: "{{ vault_app_pool_password }}"

  tasks:
    - name: Create site directory
      ansible.windows.win_file:
        path: "{{ app_path }}"
        state: directory

    - name: Create dedicated application pool
      community.windows.win_iis_webapppool:
        name: "{{ app_name }}Pool"
        state: started
        attributes:
          processModel.identityType: SpecificUser
          processModel.userName: "{{ app_pool_user }}"
          processModel.password: "{{ app_pool_pass }}"
          managedRuntimeVersion: v4.0
          managedPipelineMode: Integrated
          startMode: AlwaysRunning
          autoStart: true

    - name: Create the website
      community.windows.win_iis_website:
        name: "{{ app_name }}"
        physical_path: "{{ app_path }}"
        port: 80
        hostname: portal.example.com
        application_pool: "{{ app_name }}Pool"
        state: started
```

The `application_pool` parameter on the website module links the site to a specific app pool. This is important for isolation, identity management, and resource control.

## Full Deployment Playbook

Here is a comprehensive playbook that deploys an entire web application stack, including IIS features, app pool, website, and configuration:

```yaml
# playbook-full-deploy.yml
# Complete IIS website deployment with app pool, bindings, and configuration
- name: Deploy web application
  hosts: web_servers
  vars:
    site_name: InternalDashboard
    site_path: C:\inetpub\dashboard
    site_hostname: dashboard.corp.local
    pool_name: DashboardPool
    dotnet_version: v4.0

  tasks:
    - name: Ensure IIS is installed
      ansible.windows.win_feature:
        name:
          - Web-Server
          - Web-Asp-Net45
        state: present

    - name: Create application directory structure
      ansible.windows.win_file:
        path: "{{ item }}"
        state: directory
      loop:
        - "{{ site_path }}"
        - "{{ site_path }}\\logs"
        - "{{ site_path }}\\temp"

    - name: Create application pool
      community.windows.win_iis_webapppool:
        name: "{{ pool_name }}"
        state: started
        attributes:
          managedRuntimeVersion: "{{ dotnet_version }}"
          managedPipelineMode: Integrated
          processModel.identityType: ApplicationPoolIdentity
          recycling.periodicRestart.time: "02:00:00"
          failure.rapidFailProtection: true

    - name: Create the IIS website
      community.windows.win_iis_website:
        name: "{{ site_name }}"
        physical_path: "{{ site_path }}"
        port: 80
        hostname: "{{ site_hostname }}"
        application_pool: "{{ pool_name }}"
        state: started
      register: site_created

    - name: Configure site logging
      ansible.windows.win_shell: |
        # Set custom log file directory and format
        Set-WebConfigurationProperty `
          -PSPath "IIS:\Sites\{{ site_name }}" `
          -Filter "system.applicationHost/sites/site/logFile" `
          -Name "directory" `
          -Value "{{ site_path }}\logs"

        Set-WebConfigurationProperty `
          -PSPath "IIS:\Sites\{{ site_name }}" `
          -Filter "system.applicationHost/sites/site/logFile" `
          -Name "logFormat" `
          -Value "W3C"

    - name: Set NTFS permissions for app pool identity
      ansible.windows.win_acl:
        path: "{{ site_path }}"
        user: "IIS APPPOOL\\{{ pool_name }}"
        rights: ReadAndExecute
        type: allow
        state: present
        inherit: ContainerInherit, ObjectInherit
        propagation: None

    - name: Grant write access to logs and temp
      ansible.windows.win_acl:
        path: "{{ item }}"
        user: "IIS APPPOOL\\{{ pool_name }}"
        rights: Modify
        type: allow
        state: present
        inherit: ContainerInherit, ObjectInherit
        propagation: None
      loop:
        - "{{ site_path }}\\logs"
        - "{{ site_path }}\\temp"
```

## Managing Multiple Sites

For servers hosting multiple websites, use a loop-driven approach:

```yaml
# playbook-multi-site.yml
# Deploys multiple websites on the same IIS server
- name: Deploy multiple sites
  hosts: windows
  vars:
    websites:
      - name: SiteA
        hostname: sitea.example.com
        port: 80
        path: C:\inetpub\sitea
      - name: SiteB
        hostname: siteb.example.com
        port: 80
        path: C:\inetpub\siteb
      - name: SiteC
        hostname: sitec.example.com
        port: 8080
        path: C:\inetpub\sitec

  tasks:
    - name: Create site directories
      ansible.windows.win_file:
        path: "{{ item.path }}"
        state: directory
      loop: "{{ websites }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Create websites
      community.windows.win_iis_website:
        name: "{{ item.name }}"
        physical_path: "{{ item.path }}"
        port: "{{ item.port }}"
        hostname: "{{ item.hostname }}"
        state: started
      loop: "{{ websites }}"
      loop_control:
        label: "{{ item.name }}"
```

## Stopping and Removing Sites

During maintenance or decommissioning, you can stop or remove sites:

```yaml
# playbook-stop-remove.yml
# Stops a website during maintenance, then removes it when decommissioned
- name: Site maintenance operations
  hosts: windows
  tasks:
    - name: Stop site for maintenance
      community.windows.win_iis_website:
        name: MyApplication
        state: stopped

    # To permanently remove the site:
    - name: Remove decommissioned site
      community.windows.win_iis_website:
        name: OldApplication
        state: absent
```

Note that removing a site does not delete the physical files. You need a separate `win_file` task to clean up the directory.

## Troubleshooting Common Issues

**Port conflicts**: If another site is already using the same port and hostname combination, site creation will fail. Check existing bindings with `Get-WebBinding` in PowerShell.

**App pool crashes**: If your site shows a 503 error after creation, the application pool might be crashing. Check the Windows Event Log and ensure the app pool identity has the required permissions.

**Missing .NET features**: ASP.NET sites need the correct .NET features installed. Make sure you install `Web-Asp-Net45` (or `Web-Asp-Net`) as a prerequisite.

**Physical path permissions**: The application pool identity needs at least Read access to the site's physical path. Use `win_acl` to set this up.

IIS automation with Ansible is a huge time saver for anyone managing Windows web infrastructure. The `win_iis_website` module, combined with `win_iis_webapppool` and the other Windows modules, gives you everything you need to manage your web servers as code.
