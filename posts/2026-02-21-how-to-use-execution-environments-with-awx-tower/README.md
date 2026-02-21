# How to Use Execution Environments with AWX/Tower

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Ansible Tower, Execution Environments, Automation

Description: Configure AWX and Ansible Automation Platform to use custom Execution Environments for job templates, workflows, and project updates.

---

AWX and Ansible Automation Platform (formerly Tower) are the go-to solutions for running Ansible at scale through a web interface and API. Starting with AWX 18+ and AAP 2.0+, Execution Environments replaced the older concept of virtual environments for isolating playbook dependencies. This post covers how to register, configure, and use EEs in AWX and Tower for running job templates and workflows.

## How AWX/Tower Uses Execution Environments

In older versions, AWX/Tower used Python virtual environments to isolate dependencies. Each project could point to a different venv. The problem was managing these venvs across all your Tower nodes, keeping them in sync, and dealing with conflicting package versions.

Execution Environments replace all of that with container images. When a job runs, AWX/Tower pulls the specified EE image and executes the playbook inside it. Every Tower node runs the exact same container image, so there are no drift or version mismatch issues.

## Registering an EE in AWX

First, build and push your EE to a container registry that AWX can reach. Then register it through the AWX web UI or API.

Through the API:

```bash
# Register a new Execution Environment in AWX
curl -X POST "https://awx.example.com/api/v2/execution_environments/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "name": "Production EE",
    "image": "quay.io/myorg/ansible-ee:2.1.0",
    "pull": "missing",
    "description": "Production Execution Environment with AWS and Azure collections"
  }'
```

The `pull` field accepts these values:
- `"missing"` - Only pull if the image is not already cached on the node
- `"always"` - Pull every time a job runs (ensures latest version)
- `"never"` - Never pull, image must be pre-loaded on nodes

Through the CLI using `awx`:

```bash
# Install the AWX CLI
pip install awxkit

# Register an EE
awx execution_environments create \
  --name "Production EE" \
  --image "quay.io/myorg/ansible-ee:2.1.0" \
  --pull "missing" \
  --description "Production EE with AWS and Azure collections"

# List existing EEs
awx execution_environments list --all
```

## Configuring Registry Credentials

If your EE is in a private registry, AWX needs credentials to pull the image.

Create a credential for the container registry:

```bash
# Create a registry credential in AWX
curl -X POST "https://awx.example.com/api/v2/credentials/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "name": "Quay.io Registry",
    "credential_type": 17,
    "organization": 1,
    "inputs": {
      "host": "quay.io",
      "username": "myorg+cibot",
      "password": "REGISTRY_TOKEN",
      "verify_ssl": true
    }
  }'
```

Then associate the credential with the EE:

```bash
# Get the credential ID from the previous response
CRED_ID=5

# Update the EE to use the registry credential
curl -X PATCH "https://awx.example.com/api/v2/execution_environments/1/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d "{
    \"credential\": ${CRED_ID}
  }"
```

## Assigning EEs to Job Templates

Each job template can specify which EE to use. This lets you use different EEs for different types of automation.

```bash
# Create a job template that uses a specific EE
curl -X POST "https://awx.example.com/api/v2/job_templates/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "name": "Deploy Web Application",
    "job_type": "run",
    "inventory": 1,
    "project": 1,
    "playbook": "deploy.yml",
    "execution_environment": 3,
    "credentials": [1, 2]
  }'

# Update an existing job template to use a different EE
curl -X PATCH "https://awx.example.com/api/v2/job_templates/10/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "execution_environment": 3
  }'
```

## Setting a Default EE for the Organization

You can set a default EE at the organization level so that all job templates inherit it unless explicitly overridden:

```bash
# Set the default EE for an organization
curl -X PATCH "https://awx.example.com/api/v2/organizations/1/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "default_environment": 3
  }'
```

The EE resolution order in AWX is:
1. Job template EE (highest priority)
2. Organization default EE
3. Global default EE (lowest priority)

## Using EEs in Workflow Job Templates

Workflow templates can use different EEs for different nodes in the workflow. Each node can override the EE of its underlying job template.

```bash
# Create a workflow job template
curl -X POST "https://awx.example.com/api/v2/workflow_job_templates/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "name": "Full Deployment Pipeline",
    "organization": 1,
    "description": "Build, test, and deploy with separate EEs per stage"
  }'
```

Then add nodes with different EEs:

```bash
# Add a build node using a build-specific EE
curl -X POST "https://awx.example.com/api/v2/workflow_job_templates/1/workflow_nodes/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "unified_job_template": 10,
    "execution_environment": 3
  }'
```

## Verifying EE Usage in Job Output

When a job runs, you can see which EE was used in the job details:

```bash
# Get job details including EE information
curl -s "https://awx.example.com/api/v2/jobs/42/" \
  -H "Authorization: Bearer ${AWX_TOKEN}" | python3 -m json.tool | grep -A5 execution
```

The job output also shows the container image being used at the beginning of the run.

## Managing EE Versions in AWX

When you release a new version of your EE, you have two approaches:

**Mutable tags (rolling updates)**: Use a tag like `latest` or `2.1` and set pull policy to `always`. AWX will automatically use the newest image.

```bash
# EE with mutable tag - always pulls latest
curl -X PATCH "https://awx.example.com/api/v2/execution_environments/3/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "image": "quay.io/myorg/ansible-ee:latest",
    "pull": "always"
  }'
```

**Immutable tags (explicit updates)**: Use specific version tags like `2.1.3` and update the EE definition when you want to upgrade.

```bash
# EE with immutable tag - explicit version control
curl -X PATCH "https://awx.example.com/api/v2/execution_environments/3/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "image": "quay.io/myorg/ansible-ee:2.1.3",
    "pull": "missing"
  }'
```

I prefer immutable tags for production. They give you a clear audit trail of exactly which image was used for each job, and you can roll back by simply pointing to the previous version.

## Troubleshooting EE Issues in AWX

When jobs fail because of EE problems, here are the common issues and fixes.

**Image pull failures**: Check that the registry credential is correct and the AWX nodes can reach the registry.

```bash
# Test registry access from an AWX node
ssh awx-node-01 "podman pull quay.io/myorg/ansible-ee:2.1.0"
```

**Missing collections or Python packages**: The EE image does not contain what the playbook needs. Check the image contents.

```bash
# Inspect the EE image
podman run --rm quay.io/myorg/ansible-ee:2.1.0 ansible-galaxy collection list
podman run --rm quay.io/myorg/ansible-ee:2.1.0 pip list
```

**Permission issues**: The ansible-runner user inside the container might not have the right permissions.

```bash
# Check the user inside the container
podman run --rm quay.io/myorg/ansible-ee:2.1.0 id
podman run --rm quay.io/myorg/ansible-ee:2.1.0 ls -la /runner
```

## EE for Project Updates

AWX also uses an EE for project sync operations (pulling playbook code from Git). You can specify a separate EE for this purpose:

```bash
# Set the EE used for project updates
curl -X PATCH "https://awx.example.com/api/v2/projects/1/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -d '{
    "default_environment": 2
  }'
```

The project sync EE needs Git and any authentication tools required to access your source code repositories.

## Practical Multi-EE Setup

Here is a typical setup for a mid-size organization:

```
EE 1: Base EE (community.general, ansible.posix)
  -> Used for: General infrastructure tasks

EE 2: AWS EE (amazon.aws, community.aws, boto3)
  -> Used for: AWS cloud automation

EE 3: Azure EE (azure.azcollection, Azure SDK)
  -> Used for: Azure cloud automation

EE 4: Network EE (cisco.ios, arista.eos, junipernetworks.junos)
  -> Used for: Network device automation

EE 5: Security EE (ansible.posix, community.crypto, custom security tools)
  -> Used for: Security compliance and hardening
```

Each EE contains only the dependencies needed for its use case, keeping images lean and reducing the attack surface.

## Wrapping Up

Execution Environments in AWX/Tower bring consistency and reproducibility to your automation platform. Register your EEs with proper registry credentials, assign them to job templates based on what dependencies each playbook needs, and use immutable version tags for production workloads. The move from virtual environments to EEs is one of the best improvements in the Ansible ecosystem because it eliminates an entire class of "it worked yesterday" problems.
