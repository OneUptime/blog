# How to Automate RHEL Image Builds with Ansible and composer-cli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Image Builder, Composer-cli, Automation, CI/CD, Linux

Description: Automate RHEL image builds using Ansible playbooks that drive composer-cli, enabling CI/CD pipelines for custom OS images.

---

Automating RHEL image builds with Ansible lets you integrate OS image creation into CI/CD pipelines. Ansible can push blueprints, trigger builds, wait for completion, and download the resulting images.

## Ansible Playbook for Image Building

```yaml
# build-image.yml
---
- name: Build custom RHEL image
  hosts: image-builder-host
  become: true
  vars:
    blueprint_name: "web-server"
    image_type: "qcow2"
    output_dir: "/var/lib/images"

  tasks:
    - name: Copy blueprint to the Image Builder host
      copy:
        src: blueprints/web-server.toml
        dest: /tmp/web-server.toml

    - name: Push the blueprint to Image Builder
      command: composer-cli blueprints push /tmp/web-server.toml
      changed_when: true

    - name: Depsolve the blueprint to verify dependencies
      command: "composer-cli blueprints depsolve {{ blueprint_name }}"
      register: depsolve_result
      changed_when: false

    - name: Start the image compose
      command: "composer-cli compose start {{ blueprint_name }} {{ image_type }}"
      register: compose_start
      changed_when: true

    - name: Extract compose UUID from output
      set_fact:
        compose_uuid: "{{ compose_start.stdout | regex_search('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') }}"

    - name: Wait for compose to complete
      command: "composer-cli compose info {{ compose_uuid }}"
      register: compose_status
      until: "'FINISHED' in compose_status.stdout or 'FAILED' in compose_status.stdout"
      retries: 60
      delay: 30
      changed_when: false

    - name: Fail if compose did not succeed
      fail:
        msg: "Image compose failed: {{ compose_status.stdout }}"
      when: "'FAILED' in compose_status.stdout"

    - name: Create output directory
      file:
        path: "{{ output_dir }}"
        state: directory
        mode: '0755'

    - name: Download the composed image
      command: "composer-cli compose image {{ compose_uuid }}"
      args:
        chdir: "{{ output_dir }}"
      changed_when: true

    - name: Display the output file
      find:
        paths: "{{ output_dir }}"
        patterns: "{{ compose_uuid }}*"
      register: image_files

    - name: Show image details
      debug:
        msg: "Image built: {{ item.path }} ({{ item.size }} bytes)"
      loop: "{{ image_files.files }}"
```

## Running the Build

```bash
# Run the image build playbook
ansible-playbook build-image.yml -i inventory.ini

# Pass variables to override defaults
ansible-playbook build-image.yml \
  -i inventory.ini \
  -e "blueprint_name=database-server" \
  -e "image_type=ami"
```

## Integration with CI/CD

Create a shell wrapper for pipeline integration:

```bash
#!/bin/bash
# /usr/local/bin/build-and-upload.sh
# Called from CI/CD pipeline

BLUEPRINT="$1"
IMAGE_TYPE="$2"

# Push blueprint
composer-cli blueprints push "blueprints/${BLUEPRINT}.toml"

# Start build and capture UUID
UUID=$(composer-cli compose start "$BLUEPRINT" "$IMAGE_TYPE" | grep -oP '[0-9a-f-]{36}')

# Wait for completion
while true; do
  STATUS=$(composer-cli compose info "$UUID" | head -1)
  echo "$STATUS"
  echo "$STATUS" | grep -q "FINISHED" && break
  echo "$STATUS" | grep -q "FAILED" && exit 1
  sleep 30
done

# Download the image
composer-cli compose image "$UUID"
echo "Build complete: ${UUID}"
```

This approach lets you version-control your blueprints in Git and trigger image builds automatically when blueprint files change.
