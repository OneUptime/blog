# How to Use Ansible for IoT Device Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IoT, Device Management, Automation

Description: Manage IoT device fleets with Ansible for firmware updates, configuration management, and monitoring across thousands of distributed devices.

---

Managing IoT devices at scale presents unique challenges. Devices run on constrained hardware, have intermittent network access, and may be running different firmware versions. Ansible can manage IoT devices as long as they run SSH and Python, which covers most Linux-based IoT gateways and devices like Raspberry Pi.

This post covers strategies for managing IoT device fleets with Ansible.

## IoT Device Inventory

Dynamic inventory is essential for IoT fleets because devices come and go:

```yaml
# inventories/iot/plugin_inventory.yml
# Dynamic inventory from device management database
plugin: community.general.linode
regions:
  - us-east

# Or use a custom inventory script
# plugin: custom_iot_inventory
```

For simpler setups, a YAML inventory works:

```yaml
# inventories/iot/hosts.yml
all:
  children:
    gateways:
      hosts:
        gw-factory-01:
          ansible_host: 192.168.1.100
          device_type: raspberry-pi-4
          firmware_version: "2.1.0"
          location: factory-floor-a
        gw-factory-02:
          ansible_host: 192.168.1.101
          device_type: raspberry-pi-4
          firmware_version: "2.1.0"
          location: factory-floor-b
    sensors:
      vars:
        ansible_user: iot
        ansible_python_interpreter: /usr/bin/python3
      hosts:
        sensor-temp-001:
          ansible_host: 192.168.2.10
          device_type: esp32-gateway
          sensor_type: temperature
        sensor-humidity-001:
          ansible_host: 192.168.2.11
          device_type: esp32-gateway
          sensor_type: humidity
```

## Device Bootstrap

Initial setup for new IoT devices:

```yaml
# playbooks/bootstrap-iot-device.yml
# Bootstrap a new IoT device with base configuration
---
- name: Bootstrap IoT device
  hosts: "{{ target_device }}"
  become: true
  vars:
    mqtt_broker: mqtt.internal.example.com
    device_update_channel: stable

  tasks:
    - name: Set device hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Configure network with static IP
      ansible.builtin.template:
        src: network-config.j2
        dest: /etc/network/interfaces.d/eth0
        mode: '0644'
      notify: restart networking
      when: static_ip is defined

    - name: Install IoT agent dependencies
      ansible.builtin.apt:
        name:
          - python3-pip
          - mosquitto-clients
          - sqlite3
          - curl
        state: present
        update_cache: true

    - name: Install Python IoT libraries
      ansible.builtin.pip:
        name:
          - paho-mqtt
          - requests
          - psutil
        state: present

    - name: Deploy device agent
      ansible.builtin.template:
        src: iot-agent.py.j2
        dest: /opt/iot/agent.py
        mode: '0755'

    - name: Create systemd service for IoT agent
      ansible.builtin.template:
        src: iot-agent.service.j2
        dest: /etc/systemd/system/iot-agent.service
        mode: '0644'
      notify:
        - daemon reload
        - start iot agent

    - name: Configure watchdog timer
      ansible.builtin.template:
        src: watchdog.conf.j2
        dest: /etc/watchdog.conf
        mode: '0644'
      notify: restart watchdog

    - name: Enable hardware watchdog
      ansible.builtin.service:
        name: watchdog
        state: started
        enabled: true

    - name: Register device with management platform
      ansible.builtin.uri:
        url: "https://{{ device_mgmt_api }}/api/v1/devices/register"
        method: POST
        body_format: json
        body:
          device_id: "{{ inventory_hostname }}"
          device_type: "{{ device_type }}"
          location: "{{ location }}"
          firmware: "{{ firmware_version }}"
      delegate_to: localhost
```

## Firmware Updates

Rolling firmware updates across IoT devices:

```yaml
# playbooks/firmware-update.yml
# Update firmware on IoT devices with safety checks
---
- name: Update IoT device firmware
  hosts: "{{ target_group | default('gateways') }}"
  become: true
  serial: 1
  max_fail_percentage: 5

  tasks:
    - name: Check current firmware version
      ansible.builtin.command: cat /opt/iot/firmware_version
      register: current_firmware
      changed_when: false

    - name: Skip if already on target version
      ansible.builtin.meta: end_host
      when: current_firmware.stdout == target_firmware_version

    - name: Download firmware package
      ansible.builtin.get_url:
        url: "{{ firmware_repo }}/{{ target_firmware_version }}/firmware.tar.gz"
        dest: /tmp/firmware-update.tar.gz
        checksum: "sha256:{{ firmware_checksum }}"
        mode: '0644'

    - name: Create backup of current firmware
      ansible.builtin.command:
        cmd: "cp -a /opt/iot/firmware /opt/iot/firmware.backup"
      changed_when: true

    - name: Extract new firmware
      ansible.builtin.unarchive:
        src: /tmp/firmware-update.tar.gz
        dest: /opt/iot/firmware/
        remote_src: true

    - name: Run firmware update script
      ansible.builtin.command:
        cmd: /opt/iot/firmware/update.sh
      register: update_result
      changed_when: true

    - name: Reboot device if required
      ansible.builtin.reboot:
        reboot_timeout: 300
        post_reboot_delay: 30
      when: update_result.stdout is search('reboot required')

    - name: Verify device is healthy after update
      ansible.builtin.uri:
        url: "http://localhost:{{ device_health_port }}/health"
        status_code: 200
      retries: 20
      delay: 10
      register: health
      until: health.status == 200

    - name: Verify firmware version
      ansible.builtin.command: cat /opt/iot/firmware_version
      register: new_firmware
      changed_when: false
      failed_when: new_firmware.stdout != target_firmware_version

    - name: Clean up
      ansible.builtin.file:
        path: /tmp/firmware-update.tar.gz
        state: absent
```

## Device Health Monitoring

```yaml
# roles/iot_monitoring/tasks/main.yml
# Configure health monitoring on IoT devices
---
- name: Deploy health check script
  ansible.builtin.copy:
    content: |
      #!/bin/bash
      # IoT device health check script
      TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0)
      DISK=$(df / --output=pcent | tail -1 | tr -d ' %')
      MEM=$(free | awk '/Mem:/ {printf("%.0f", $3/$2*100)}')
      UPTIME=$(cat /proc/uptime | awk '{print $1}')
      MQTT_PID=$(pidof mosquitto_sub || echo 0)
      echo "{\"temp_c\":$((TEMP/1000)),\"disk_pct\":$DISK,\"mem_pct\":$MEM,\"uptime\":$UPTIME,\"mqtt_alive\":$([[ $MQTT_PID -gt 0 ]] && echo true || echo false)}"
    dest: /opt/iot/health-check.sh
    mode: '0755'

- name: Schedule health reporting
  ansible.builtin.cron:
    name: "IoT health report"
    minute: "*/5"
    job: >
      /opt/iot/health-check.sh |
      mosquitto_pub -h {{ mqtt_broker }} -t "devices/{{ inventory_hostname }}/health" -s
      2>/dev/null || true
    user: root
```

## Batch Configuration Updates

Push configuration changes to entire device fleets:

```yaml
# playbooks/update-iot-config.yml
# Update configuration on all IoT devices
---
- name: Update IoT device configuration
  hosts: gateways
  become: true
  serial: "20%"

  tasks:
    - name: Deploy updated MQTT configuration
      ansible.builtin.template:
        src: mqtt.conf.j2
        dest: /opt/iot/config/mqtt.conf
        mode: '0644'
      notify: restart iot agent

    - name: Deploy updated sensor polling config
      ansible.builtin.template:
        src: sensors.yml.j2
        dest: /opt/iot/config/sensors.yml
        mode: '0644'
      notify: restart iot agent

    - name: Verify agent is running after config change
      ansible.builtin.service:
        name: iot-agent
        state: started
      register: agent_status
      failed_when: agent_status.status.ActiveState != 'active'
```

## Key Takeaways

IoT device management with Ansible works well for Linux-based devices with SSH access. Use dynamic inventory for large fleets. Bootstrap devices with a standard playbook that installs agents, configures networking, and registers with your management platform. Roll out firmware updates one device at a time with health verification at each step. Use MQTT or similar protocols for health reporting since HTTP may not always be available. Handle intermittent connectivity gracefully by using ansible-pull where possible and setting appropriate timeouts for push-based operations.
