# How to Coordinate OpenTofu and Ansible in CI/CD Pipelines - Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, CI/CD, DevOps, Automation, Infrastructure as Code

Description: Learn how to orchestrate OpenTofu and Ansible together in GitHub Actions and GitLab CI pipelines for end-to-end infrastructure automation.

---

Combining OpenTofu (infrastructure provisioning) and Ansible (configuration management) in a CI/CD pipeline enables fully automated infrastructure deployment. The key challenge is passing OpenTofu outputs to Ansible and sequencing the two tools correctly.

---

## GitHub Actions Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  provision:
    name: Provision with OpenTofu
    runs-on: ubuntu-latest
    outputs:
      web_ips: ${{ steps.tofu.outputs.web_ips }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: tofu init and apply
        id: tofu
        run: |
          tofu init
          tofu apply -auto-approve
          echo "web_ips=$(tofu output -json web_ips)" >> $GITHUB_OUTPUT
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  configure:
    name: Configure with Ansible
    runs-on: ubuntu-latest
    needs: provision
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible

      - name: Write inventory
        run: |
          echo '${{ needs.provision.outputs.web_ips }}' | jq -r '"[web]", .[]' > inventory.ini

      - name: Wait for SSH
        run: |
          ansible all -i inventory.ini -m wait_for_connection -a "timeout=120" -e "ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/key.pem"

      - name: Run playbook
        run: |
          ansible-playbook -i inventory.ini playbooks/configure.yml -e "ansible_user=ubuntu" --private-key ~/.ssh/key.pem
```

---

## GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - provision
  - configure

provision:
  stage: provision
  image: ghcr.io/opentofu/opentofu:latest
  script:
    - tofu init
    - tofu apply -auto-approve
    - tofu output -json > tofu-outputs.json
  artifacts:
    paths:
      - tofu-outputs.json

configure:
  stage: configure
  image: cytopia/ansible:latest
  needs: [provision]
  script:
    - WEB_IP=$(jq -r '.web_ip.value' tofu-outputs.json)
    - echo "[web]" > inventory.ini
    - echo "${WEB_IP} ansible_user=ubuntu" >> inventory.ini
    - ansible-playbook -i inventory.ini playbooks/configure.yml
```

---

## Dynamic Inventory from OpenTofu State

```python
#!/usr/bin/env python3
# dynamic_inventory.py
import subprocess, json

result = subprocess.run(
    ["tofu", "output", "-json"],
    capture_output=True, text=True
)
outputs = json.loads(result.stdout)

inventory = {
    "web": {
        "hosts": outputs["web_ips"]["value"],
        "vars": {"ansible_user": "ubuntu"}
    }
}
print(json.dumps(inventory))
```

```bash
ansible-playbook -i dynamic_inventory.py playbooks/configure.yml
```

---

## Summary

Structure the pipeline as two sequential jobs: OpenTofu provisions infrastructure and outputs IPs as job artifacts, then Ansible consumes those IPs to configure the instances. Use GitHub Actions job `outputs` or GitLab `artifacts` to pass data between stages. A dynamic inventory script that calls `tofu output -json` keeps the inventory in sync with the OpenTofu state file.
