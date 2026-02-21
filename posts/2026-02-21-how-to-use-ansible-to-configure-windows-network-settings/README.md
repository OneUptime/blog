# How to Use Ansible to Configure Windows Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, Networking, DNS

Description: Automate Windows network configuration with Ansible including IP addresses, DNS settings, network adapters, and firewall rules.

---

Network configuration is one of the first things you set up on a new Windows server, and one of the most critical to get right. A wrong IP address, missing DNS server, or incorrect subnet mask can take a server offline. When you are managing dozens or hundreds of servers, doing this through the GUI or even through individual PowerShell sessions does not scale. Ansible lets you define network configuration as code and apply it consistently across your entire fleet.

This post covers configuring IP addresses, DNS settings, network adapter properties, and Windows Firewall rules with Ansible.

## Setting Static IP Addresses

The `ansible.windows.win_shell` module with PowerShell networking cmdlets is the most flexible way to configure IP addresses:

```yaml
# playbook-static-ip.yml
# Configures a static IP address on a Windows server
- name: Configure static IP address
  hosts: windows
  vars:
    interface_name: "Ethernet0"
    ip_address: "192.168.1.100"
    prefix_length: 24
    gateway: "192.168.1.1"
    dns_servers:
      - "192.168.1.10"
      - "192.168.1.11"

  tasks:
    - name: Remove existing IP configuration
      ansible.windows.win_shell: |
        $adapter = Get-NetAdapter -Name "{{ interface_name }}"
        # Remove existing IP addresses
        Remove-NetIPAddress -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
        # Remove existing gateway
        Remove-NetRoute -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue

    - name: Set static IP address
      ansible.windows.win_shell: |
        $adapter = Get-NetAdapter -Name "{{ interface_name }}"
        New-NetIPAddress `
          -InterfaceIndex $adapter.ifIndex `
          -IPAddress "{{ ip_address }}" `
          -PrefixLength {{ prefix_length }} `
          -DefaultGateway "{{ gateway }}"
        Write-Output "IP configured: {{ ip_address }}/{{ prefix_length }}"

    - name: Set DNS servers
      ansible.windows.win_dns_client:
        adapter_names: "{{ interface_name }}"
        dns_servers: "{{ dns_servers }}"
```

## Configuring DNS Settings

The `win_dns_client` module provides a clean way to manage DNS server addresses:

```yaml
# playbook-dns.yml
# Configures DNS settings across all Windows servers
- name: Configure DNS settings
  hosts: windows
  tasks:
    - name: Set primary and secondary DNS servers
      ansible.windows.win_dns_client:
        adapter_names: "Ethernet0"
        dns_servers:
          - 10.0.0.10
          - 10.0.0.11
          - 8.8.8.8

    - name: Set DNS suffix search list
      ansible.windows.win_shell: |
        Set-DnsClientGlobalSetting -SuffixSearchList @("corp.local", "internal.local", "dev.local")

    - name: Configure DNS registration
      ansible.windows.win_shell: |
        # Enable dynamic DNS registration
        $adapter = Get-NetAdapter -Name "Ethernet0"
        Set-DnsClient -InterfaceIndex $adapter.ifIndex `
          -RegisterThisConnectionsAddress $true `
          -UseSuffixWhenRegistering $true
```

## Managing Network Adapter Properties

You can configure adapter-level settings like speed, duplex, and VLAN tagging:

```yaml
# playbook-adapter-config.yml
# Configures network adapter properties
- name: Configure network adapter
  hosts: windows
  tasks:
    - name: Rename network adapter for clarity
      ansible.windows.win_shell: |
        $adapter = Get-NetAdapter | Where-Object { $_.MacAddress -eq "00-15-5D-01-02-03" }
        if ($adapter -and $adapter.Name -ne "Production-NIC") {
          Rename-NetAdapter -Name $adapter.Name -NewName "Production-NIC"
          Write-Output "RENAMED"
        } else {
          Write-Output "ALREADY_NAMED"
        }

    - name: Enable jumbo frames (MTU 9014)
      ansible.windows.win_shell: |
        Set-NetAdapterAdvancedProperty `
          -Name "Production-NIC" `
          -RegistryKeyword "*JumboPacket" `
          -RegistryValue "9014"

    - name: Disable power management on adapter
      ansible.windows.win_shell: |
        # Prevent Windows from turning off the adapter to save power
        $adapter = Get-NetAdapter -Name "Production-NIC"
        $powerMgmt = Get-CimInstance -ClassName MSPower_DeviceWakeEnable `
          -Namespace root/wmi |
          Where-Object { $_.InstanceName -like "*$($adapter.PnPDeviceID)*" }
        if ($powerMgmt) {
          Set-CimInstance -InputObject $powerMgmt -Property @{Enable=$false}
        }

    - name: Configure RSS (Receive Side Scaling)
      ansible.windows.win_shell: |
        Enable-NetAdapterRss -Name "Production-NIC"
        Set-NetAdapterRss -Name "Production-NIC" -NumberOfReceiveQueues 4
```

## Configuring Network Profiles

Windows assigns a network profile (Domain, Private, or Public) to each connection, which affects firewall rules:

```yaml
# playbook-network-profile.yml
# Sets the network profile for server connections
- name: Configure network profiles
  hosts: windows
  tasks:
    - name: Set network profile to Private
      ansible.windows.win_shell: |
        # Get all connected network adapters
        $profiles = Get-NetConnectionProfile
        foreach ($profile in $profiles) {
          if ($profile.NetworkCategory -ne "DomainAuthenticated") {
            Set-NetConnectionProfile `
              -InterfaceIndex $profile.InterfaceIndex `
              -NetworkCategory Private
          }
        }
        Get-NetConnectionProfile | Select-Object Name, NetworkCategory | ConvertTo-Json
      register: profile_result

    - name: Display network profiles
      ansible.builtin.debug:
        msg: "{{ profile_result.stdout | from_json }}"
```

## Windows Firewall Management

The `community.windows.win_firewall_rule` module provides a clean interface for managing Windows Firewall rules:

```yaml
# playbook-firewall.yml
# Configures Windows Firewall rules for a web server
- name: Configure Windows Firewall
  hosts: web_servers
  tasks:
    - name: Enable Windows Firewall on all profiles
      community.windows.win_firewall:
        state: enabled
        profiles:
          - Domain
          - Private
          - Public

    - name: Allow HTTP traffic
      community.windows.win_firewall_rule:
        name: "HTTP Inbound"
        localport: 80
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes
        profiles:
          - Domain
          - Private

    - name: Allow HTTPS traffic
      community.windows.win_firewall_rule:
        name: "HTTPS Inbound"
        localport: 443
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes
        profiles:
          - Domain
          - Private

    - name: Allow ICMP (ping)
      community.windows.win_firewall_rule:
        name: "ICMP Allow Ping"
        protocol: icmpv4
        icmp_type_code:
          - "8:*"
        action: allow
        direction: in
        state: present
        enabled: yes

    - name: Block all other inbound traffic (default deny)
      community.windows.win_firewall_rule:
        name: "Block All Other Inbound"
        action: block
        direction: in
        protocol: any
        state: present
        enabled: yes
        profiles:
          - Public
```

## Configuring Static Routes

For servers that need to reach networks beyond the default gateway:

```yaml
# playbook-routes.yml
# Adds static routes for reaching internal network segments
- name: Configure static routes
  hosts: windows
  vars:
    static_routes:
      - destination: "10.10.0.0/16"
        gateway: "192.168.1.254"
        metric: 100
      - destination: "172.16.0.0/12"
        gateway: "192.168.1.253"
        metric: 200

  tasks:
    - name: Add static routes
      ansible.windows.win_shell: |
        $dest = "{{ item.destination }}"
        $parts = $dest.Split("/")
        $network = $parts[0]
        $prefix = $parts[1]
        $gw = "{{ item.gateway }}"

        # Check if route already exists
        $existing = Get-NetRoute -DestinationPrefix $dest -ErrorAction SilentlyContinue
        if (-not $existing) {
          New-NetRoute -DestinationPrefix $dest -NextHop $gw -RouteMetric {{ item.metric }}
          Write-Output "ADDED: $dest via $gw"
        } else {
          Write-Output "EXISTS: $dest"
        }
      loop: "{{ static_routes }}"
      loop_control:
        label: "{{ item.destination }}"
```

## NIC Teaming

For servers with multiple network adapters, NIC teaming provides redundancy and increased bandwidth:

```yaml
# playbook-nic-teaming.yml
# Configures NIC teaming for redundancy
- name: Configure NIC teaming
  hosts: windows
  tasks:
    - name: Create NIC team
      ansible.windows.win_shell: |
        $team = Get-NetLbfoTeam -Name "ProductionTeam" -ErrorAction SilentlyContinue
        if (-not $team) {
          New-NetLbfoTeam -Name "ProductionTeam" `
            -TeamMembers "Ethernet0","Ethernet1" `
            -TeamingMode SwitchIndependent `
            -LoadBalancingAlgorithm Dynamic `
            -Confirm:$false
          Write-Output "CREATED"
        } else {
          Write-Output "EXISTS"
        }
      register: team_result

    - name: Wait for team adapter to become available
      ansible.windows.win_shell: |
        $timeout = 30
        $elapsed = 0
        while ($elapsed -lt $timeout) {
          $adapter = Get-NetAdapter -Name "ProductionTeam" -ErrorAction SilentlyContinue
          if ($adapter -and $adapter.Status -eq "Up") {
            Write-Output "Team adapter is UP"
            break
          }
          Start-Sleep -Seconds 2
          $elapsed += 2
        }
      when: team_result.stdout | trim == "CREATED"

    - name: Configure IP on team adapter
      ansible.windows.win_shell: |
        New-NetIPAddress `
          -InterfaceAlias "ProductionTeam" `
          -IPAddress "192.168.1.100" `
          -PrefixLength 24 `
          -DefaultGateway "192.168.1.1"
      when: team_result.stdout | trim == "CREATED"
```

## Complete Network Configuration Playbook

Here is a comprehensive playbook that handles the full network setup for a new server:

```yaml
# playbook-full-network.yml
# Complete network configuration for newly provisioned servers
- name: Complete network configuration
  hosts: windows
  vars:
    primary_nic: "Ethernet0"
    ip_address: "{{ hostvars[inventory_hostname]['server_ip'] }}"
    subnet_prefix: 24
    gateway: "192.168.1.1"
    dns_primary: "10.0.0.10"
    dns_secondary: "10.0.0.11"
    dns_suffix: "corp.local"

  tasks:
    - name: Set static IP address
      ansible.windows.win_shell: |
        $adapter = Get-NetAdapter -Name "{{ primary_nic }}"
        Remove-NetIPAddress -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
        Remove-NetRoute -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
        New-NetIPAddress -InterfaceIndex $adapter.ifIndex `
          -IPAddress "{{ ip_address }}" `
          -PrefixLength {{ subnet_prefix }} `
          -DefaultGateway "{{ gateway }}"

    - name: Configure DNS
      ansible.windows.win_dns_client:
        adapter_names: "{{ primary_nic }}"
        dns_servers:
          - "{{ dns_primary }}"
          - "{{ dns_secondary }}"

    - name: Set DNS suffix
      ansible.windows.win_shell: |
        Set-DnsClientGlobalSetting -SuffixSearchList @("{{ dns_suffix }}")

    - name: Disable IPv6 if not needed
      ansible.windows.win_shell: |
        Disable-NetAdapterBinding -Name "{{ primary_nic }}" -ComponentID ms_tcpip6

    - name: Disable NetBIOS over TCP/IP
      ansible.windows.win_shell: |
        $adapter = Get-WmiObject Win32_NetworkAdapterConfiguration |
          Where-Object { $_.IPAddress -contains "{{ ip_address }}" }
        $adapter.SetTcpipNetbios(2)

    - name: Verify network configuration
      ansible.windows.win_shell: |
        $config = Get-NetIPConfiguration -InterfaceAlias "{{ primary_nic }}"
        @{
          Interface = $config.InterfaceAlias
          IPv4 = $config.IPv4Address.IPAddress
          Gateway = $config.IPv4DefaultGateway.NextHop
          DNS = ($config.DNSServer.ServerAddresses -join ", ")
        } | ConvertTo-Json
      register: net_verify

    - name: Display final network configuration
      ansible.builtin.debug:
        msg: "{{ net_verify.stdout | from_json }}"
```

## Practical Considerations

**Be careful with remote IP changes.** If you change the IP address of a server you are connecting to via WinRM, you will lose the connection mid-playbook. Either use a management network that stays the same, or use a two-phase approach where you update DNS/inventory between phases.

**Test in check mode first.** Network changes can be disruptive. Use `--check` to verify what would change before applying.

**Keep DNS settings consistent.** Inconsistent DNS across servers is a common source of Active Directory issues. Define DNS servers in group variables and apply them uniformly.

**Document your network layout.** Keep your inventory file as the source of truth for IP assignments. This makes it easy to see which server has which IP without logging into each one.

Network automation with Ansible eliminates the human errors that plague manual network configuration. Once you have your playbooks dialed in, provisioning a new server's network becomes a single command rather than a series of manual steps.
