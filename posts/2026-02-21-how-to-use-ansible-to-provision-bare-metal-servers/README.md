# How to Use Ansible to Provision Bare Metal Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Bare Metal, Server Provisioning, Data Center, Automation

Description: Learn how to automate bare metal server provisioning with Ansible from PXE boot and IPMI management to full OS configuration.

---

Bare metal servers are the foundation of many production environments, and provisioning them has traditionally been a manual, time-consuming process. You rack the server, connect the cables, configure the BIOS, boot from PXE, install the OS, and then spend another hour configuring everything. Ansible can automate most of this workflow, turning a multi-hour process into something that runs with a single command.

This guide covers automating bare metal provisioning with Ansible, including IPMI management, PXE boot orchestration, OS installation, and post-install configuration.

## The Bare Metal Provisioning Pipeline

```mermaid
flowchart TD
    A[Discover Hardware] --> B[Configure IPMI/BMC]
    B --> C[Set PXE Boot]
    C --> D[Power On Server]
    D --> E[PXE Boot & OS Install]
    E --> F[Wait for SSH]
    F --> G[Base Configuration]
    G --> H[Role-Specific Setup]
    H --> I[Verification]
```

## Prerequisites

For bare metal automation, you need:

- Ansible 2.15+ on your control node
- Network access to the servers' IPMI/BMC interfaces
- A PXE boot infrastructure (DHCP + TFTP + HTTP)
- Python `pyghmi` library for IPMI commands
- `ipmitool` for setting one-time PXE boot devices
- The `community.general` collection
- The `ansible.posix` collection for mount management

```bash
# Install required collections and libraries

ansible-galaxy collection install community.general
ansible-galaxy collection install ansible.posix
pip install pyghmi
```

## Inventory for Bare Metal

Bare metal inventory is more detailed than cloud inventory because you need both management (IPMI) and production network addresses.

```yaml
# inventory/bare-metal.yml
---
all:
  children:
    bare_metal:
      hosts:
        server-01:
          ansible_host: 10.10.1.11
          ipmi_address: 10.10.0.11
          ipmi_user: admin
          ipmi_password: "{{ vault_ipmi_password }}"
          mac_address: "aa:bb:cc:dd:ee:01"
          system_uuid: "11111111-1111-1111-1111-111111111111"
          role: compute
        server-02:
          ansible_host: 10.10.1.12
          ipmi_address: 10.10.0.12
          ipmi_user: admin
          ipmi_password: "{{ vault_ipmi_password }}"
          mac_address: "aa:bb:cc:dd:ee:02"
          system_uuid: "22222222-2222-2222-2222-222222222222"
          role: compute
        server-03:
          ansible_host: 10.10.1.13
          ipmi_address: 10.10.0.13
          ipmi_user: admin
          ipmi_password: "{{ vault_ipmi_password }}"
          mac_address: "aa:bb:cc:dd:ee:03"
          system_uuid: "33333333-3333-3333-3333-333333333333"
          role: storage
      vars:
        ansible_user: root
        ansible_ssh_private_key_file: ~/.ssh/deploy
```

## Managing IPMI/BMC

IPMI gives you out-of-band management: power control, console access, and boot device selection. Ansible can drive IPMI commands using the `community.general.ipmi_power` module and command tasks.

```yaml
# playbooks/ipmi-management.yml
---
- name: Manage bare metal servers via IPMI
  hosts: bare_metal
  gather_facts: false
  connection: local

  tasks:
    # Check current power state
    - name: Check server power status
      ansible.builtin.command:
        cmd: >
          ipmitool -I lanplus
          -H {{ ipmi_address }}
          -U {{ ipmi_user }}
          -E
          chassis power status
      register: power_status
      delegate_to: localhost
      changed_when: false
      environment:
        IPMI_PASSWORD: "{{ ipmi_password }}"

    - name: Display power status
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ power_status.stdout }}"

    # Power on servers that are off
    - name: Power on server
      community.general.ipmi_power:
        name: "{{ ipmi_address }}"
        user: "{{ ipmi_user }}"
        password: "{{ ipmi_password }}"
        state: on
      when: "'is off' in power_status.stdout"
```

## Setting PXE Boot

Before triggering OS installation, set the boot device to PXE.

```yaml
# playbooks/set-pxe-boot.yml
---
- name: Configure PXE boot on bare metal servers
  hosts: bare_metal
  gather_facts: false
  connection: local

  tasks:
    # Set next boot to PXE using ipmitool
    - name: Set boot device to PXE for next boot
      ansible.builtin.command:
        cmd: >
          ipmitool -I lanplus
          -H {{ ipmi_address }}
          -U {{ ipmi_user }}
          -E
          chassis bootdev pxe options=efiboot
      delegate_to: localhost
      environment:
        IPMI_PASSWORD: "{{ ipmi_password }}"
      changed_when: true

    # Power cycle the server to trigger PXE boot
    - name: Power cycle server
      community.general.ipmi_power:
        name: "{{ ipmi_address }}"
        user: "{{ ipmi_user }}"
        password: "{{ ipmi_password }}"
        state: reset
```

## PXE Server Configuration

Configure your PXE boot infrastructure with Ansible. This playbook sets up dnsmasq as the DHCP/TFTP server and nginx for HTTP file serving. Before running it, copy the target Ubuntu live-server ISO's `/casper/vmlinuz` and `/casper/initrd` into `tftp_root` as `/vmlinuz` and `/initrd`.

```yaml
# playbooks/setup-pxe-server.yml
---
- name: Configure PXE boot server
  hosts: pxe_server
  become: true

  vars:
    tftp_root: /srv/tftp
    http_root: /srv/http/install
    ubuntu_iso_url: https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso

  tasks:
    # Install required packages
    - name: Install PXE server packages
      ansible.builtin.apt:
        name:
          - dnsmasq
          - nginx
          - shim-signed
          - grub-efi-amd64-signed
          - grub-common
        state: present

    - name: Create TFTP and HTTP roots
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - "{{ tftp_root }}"
        - "{{ http_root }}"

    - name: Copy signed shim for UEFI PXE
      ansible.builtin.copy:
        src: /usr/lib/shim/shimx64.efi.signed.latest
        dest: "{{ tftp_root }}/bootx64.efi"
        remote_src: true
        mode: '0644'

    - name: Copy signed GRUB network loader for UEFI PXE
      ansible.builtin.copy:
        src: /usr/lib/grub/x86_64-efi-signed/grubnetx64.efi.signed
        dest: "{{ tftp_root }}/grubx64.efi"
        remote_src: true
        mode: '0644'

    - name: Copy GRUB font
      ansible.builtin.copy:
        src: /usr/share/grub/unicode.pf2
        dest: "{{ tftp_root }}/unicode.pf2"
        remote_src: true
        mode: '0644'

    # Configure dnsmasq for DHCP and TFTP
    - name: Configure dnsmasq
      ansible.builtin.copy:
        dest: /etc/dnsmasq.d/pxe.conf
        content: |
          # DHCP range for provisioning network
          dhcp-range=10.10.1.100,10.10.1.200,255.255.255.0,1h

          # TFTP settings
          enable-tftp
          tftp-root={{ tftp_root }}

          # PXE boot file for UEFI clients
          dhcp-match=set:efi-x86_64,option:client-arch,7
          dhcp-boot=tag:efi-x86_64,bootx64.efi

          # Static DHCP assignments for known servers
          dhcp-host=aa:bb:cc:dd:ee:01,10.10.1.11,server-01
          dhcp-host=aa:bb:cc:dd:ee:02,10.10.1.12,server-02
          dhcp-host=aa:bb:cc:dd:ee:03,10.10.1.13,server-03
        mode: '0644'
      notify: restart dnsmasq

    # Configure nginx to serve installer and NoCloud files
    - name: Configure nginx installer site
      ansible.builtin.copy:
        dest: /etc/nginx/sites-available/pxe-install
        content: |
          server {
              listen 80;
              server_name _;
              root /srv/http;
              autoindex on;
          }
        mode: '0644'
      notify: restart nginx

    - name: Enable nginx installer site
      ansible.builtin.file:
        src: /etc/nginx/sites-available/pxe-install
        dest: /etc/nginx/sites-enabled/pxe-install
        state: link
      notify: restart nginx

    # Set up GRUB configuration for automated install
    - name: Create GRUB config directory
      ansible.builtin.file:
        path: "{{ tftp_root }}/grub"
        state: directory
        mode: '0755'

    - name: Create GRUB configuration
      ansible.builtin.copy:
        dest: "{{ tftp_root }}/grub/grub.cfg"
        content: |
          set timeout=5
          menuentry "Ubuntu 22.04 Automated Install" {
              linux /vmlinuz ip=dhcp url={{ ubuntu_iso_url }} autoinstall 'ds=nocloud-net;s=http://10.10.0.1/install/__dmi.system-uuid__/'
              initrd /initrd
          }
        mode: '0644'

  handlers:
    - name: restart dnsmasq
      ansible.builtin.service:
        name: dnsmasq
        state: restarted

    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
```

## Autoinstall Configuration

For Ubuntu, create an autoinstall (cloud-init) configuration. For RHEL-based systems, you would use a Kickstart file instead.

```yaml
# playbooks/generate-autoinstall.yml
---
- name: Generate autoinstall configs for each server
  hosts: pxe_server
  become: true

  vars:
    servers:
      - hostname: server-01
        ip: 10.10.1.11
        gateway: 10.10.1.1
        system_uuid: "11111111-1111-1111-1111-111111111111"
        disk: /dev/sda
      - hostname: server-02
        ip: 10.10.1.12
        gateway: 10.10.1.1
        system_uuid: "22222222-2222-2222-2222-222222222222"
        disk: /dev/sda
      - hostname: server-03
        ip: 10.10.1.13
        gateway: 10.10.1.1
        system_uuid: "33333333-3333-3333-3333-333333333333"
        disk: /dev/sda

  tasks:
    # Create autoinstall directory structure
    - name: Create autoinstall directories
      ansible.builtin.file:
        path: "/srv/http/install/{{ item.system_uuid }}"
        state: directory
        mode: '0755'
      loop: "{{ servers }}"

    - name: Generate NoCloud meta-data
      ansible.builtin.copy:
        dest: "/srv/http/install/{{ item.system_uuid }}/meta-data"
        content: |
          instance-id: {{ item.system_uuid }}
          local-hostname: {{ item.hostname }}
        mode: '0644'
      loop: "{{ servers }}"

    # Generate autoinstall configs
    - name: Generate autoinstall user-data
      ansible.builtin.copy:
        dest: "/srv/http/install/{{ item.system_uuid }}/user-data"
        content: |
          #cloud-config
          autoinstall:
            version: 1
            identity:
              hostname: {{ item.hostname }}
              password: "$6$rounds=4096$salt$hashedpassword"
              username: deploy
            ssh:
              install-server: true
              authorized-keys:
                - {{ lookup('file', '~/.ssh/deploy.pub') }}
            storage:
              layout:
                name: lvm
                sizing-policy: all
            network:
              version: 2
              ethernets:
                ens3:
                  addresses:
                    - {{ item.ip }}/24
                  routes:
                    - to: default
                      via: {{ item.gateway }}
                  nameservers:
                    addresses: [10.10.0.53, 10.10.0.54]
            packages:
              - openssh-server
              - python3
              - python3-apt
            late-commands:
              - echo "{{ item.hostname }}" > /target/etc/hostname
        mode: '0644'
      loop: "{{ servers }}"
```

## Waiting for OS Installation

After PXE booting, the OS installation takes several minutes. Ansible needs to wait.

```yaml
# playbooks/wait-for-install.yml
---
- name: Wait for bare metal OS installation to complete
  hosts: bare_metal
  gather_facts: false

  tasks:
    # Wait for SSH to become available after OS install
    - name: Wait for SSH port to open
      ansible.builtin.wait_for:
        host: "{{ ansible_host }}"
        port: 22
        state: started
        timeout: 1800
        delay: 120
      delegate_to: localhost

    # Verify we can actually connect
    - name: Wait for SSH connection to work
      ansible.builtin.wait_for_connection:
        delay: 10
        timeout: 300
```

## Post-Install Configuration

Once the OS is installed, apply base configuration.

```yaml
# playbooks/post-install.yml
---
- name: Post-installation configuration
  hosts: bare_metal
  become: true
  gather_facts: true

  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true

    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - vim
          - htop
          - iotop
          - sysstat
          - net-tools
          - lvm2
          - mdadm
          - smartmontools
          - xfsprogs
          - ntp
          - fail2ban
        state: present

    # Configure storage for additional disks
    - name: Create volume group for data disks
      community.general.lvg:
        vg: data-vg
        pvs:
          - /dev/sdb
          - /dev/sdc
      when: "'storage' in role"

    - name: Create logical volume for data
      community.general.lvol:
        vg: data-vg
        lv: data-lv
        size: 100%FREE
      when: "'storage' in role"

    - name: Create filesystem on data LV
      community.general.filesystem:
        fstype: xfs
        dev: /dev/data-vg/data-lv
      when: "'storage' in role"

    - name: Mount data volume
      ansible.posix.mount:
        path: /data
        src: /dev/data-vg/data-lv
        fstype: xfs
        opts: noatime,nodiratime
        state: mounted
      when: "'storage' in role"

    # Configure SMART monitoring
    - name: Enable SMART on all drives
      ansible.builtin.command:
        cmd: "smartctl -s on {{ item }}"
      loop:
        - /dev/sda
        - /dev/sdb
      changed_when: true
      failed_when: false
```

## Full Orchestration Playbook

Tie everything together into a single orchestration workflow.

```yaml
# playbooks/provision-bare-metal.yml
---
- ansible.builtin.import_playbook: set-pxe-boot.yml

- ansible.builtin.import_playbook: wait-for-install.yml

- ansible.builtin.import_playbook: post-install.yml
```

## Tips for Bare Metal Automation

1. **IPMI networks should be isolated.** Never put BMC interfaces on your production network. They run old firmware with known vulnerabilities.
2. **Test your autoinstall configs thoroughly.** A typo in the disk layout section can wipe the wrong drive. Test on a single server before rolling out to the fleet.
3. **Set BIOS settings with Ansible where possible.** Some vendors (Dell with racadm, HP with iLO REST) support BIOS configuration through their management interfaces.
4. **Keep a hardware inventory database.** Track serial numbers, MAC addresses, IPMI addresses, and physical locations. This becomes your Ansible inventory source.
5. **Budget extra time.** Bare metal provisioning is slower than cloud. OS installs take 10-30 minutes, and firmware updates can require multiple reboots. Set your timeouts accordingly.

Automating bare metal provisioning with Ansible takes more upfront effort than cloud provisioning, but the payoff is significant. Once your PXE infrastructure and playbooks are in place, adding a new server to your fleet is as simple as racking it and running a playbook.
