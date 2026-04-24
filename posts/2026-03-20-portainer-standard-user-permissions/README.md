# How to Configure Standard User Permissions in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Standard User, RBAC, Permission, Access Control

Description: Configure what Standard Users can see and do in Portainer environments including resource visibility and deployment capabilities.

## Introduction

The Standard User role provides full management capabilities over the resources a user is allowed to manage within environments they can access, without global admin privileges. This guide covers what Standard Users can do, how to configure their environment access, and how to restrict capabilities further using resource controls.

## Standard User Capabilities

In environments they have access to, and for resources they are allowed to manage, Standard Users can:

**Container Management:**
- Create, start, stop, restart, kill, pause containers
- Remove containers
- Access container logs
- Execute commands in running containers (terminal)
- Inspect container configuration

**Image Management:**
- Pull images from registries
- Build images from Dockerfiles
- Add and remove image tags

**Stack/Service Management:**
- Deploy and update stacks from compose files
- Update and remove stacks
- Manage services in Docker Swarm

**Volume and Network Management:**
- Create and remove volumes when volume management for non-administrators is enabled
- Create and remove networks
- Manage network configurations

**Registry Access:**
- Use registries the admin has made available

## What Standard Users Cannot Do

- Add, edit, or remove environments
- Create or manage other users
- Configure global settings (authentication, templates)
- Access environments not assigned to them
- Add or configure registries

## Assigning Standard User Access to Environments

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Assign team 2 (developers) to environment 1 with Standard User role

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d '{
    "TeamAccessPolicies": {
      "2": {"RoleId": 3}
    }
  }'
# RoleId 3 = Standard User

# Assign individual user (ID: 5) to environment 1
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d '{
    "UserAccessPolicies": {
      "5": {"RoleId": 3}
    }
  }'
```

Resource Controls (Ownership)

Portainer supports resource-level ownership to control which users can manage specific containers:

### Public Resources
All Standard Users with access to the environment can manage public resources.

### Restricted Resources
Only the users or teams explicitly granted access (and admins) can manage restricted resources.

When a Standard User creates a container, they can set it as:
- **Public**: Visible and manageable by all users who can access the environment
- **Restricted**: Only the creator and designated users/teams can manage it

```bash
# Create a container with restricted access via Portainer's Docker API proxy
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/create?name=my-private-container" \
  -d '{
    "Image": "nginx:latest",
    "Labels": {
      "io.portainer.accesscontrol.users": "alice"
    }
  }'
```

## Configuring Available Docker Features

Admins can control which Docker features are available to non-administrator users per environment:

1. Go to **Host** → **Setup** for Docker Standalone environments, or **Swarm** → **Setup** for Docker Swarm environments
2. Under **Docker Security Settings**:
   - **Disable the use of host PID 1 for non-administrators**
   - **Disable privileged mode for non-administrators**
   - **Disable bind mounts for non-administrators**
   - **Disable device mappings for non-administrators**
   - **Disable container capabilities for non-administrators**
   - **Disable sysctl settings for non-administrators**
   - **Disable the use of Stacks for non-administrators**
3. Under **Host and Filesystem**:
   - **Enable volume management for non-administrators** if Standard Users should be able to manage volumes

These settings apply to all non-administrator users in that environment, including Standard Users.

## Available Registries for Standard Users

For custom registries, admins add them globally and then grant access within each environment:

1. Go to **Host** → **Registries** for Docker Standalone environments, or **Swarm** → **Registries** for Docker Swarm environments
2. Click **Add registry** if the registry has not already been added globally
3. For an existing registry, click **Manage access** and grant the required users or teams access

Standard Users can then use the registries they have been granted access to, but cannot add or configure registries themselves.

## Conclusion

The Standard User role provides a comprehensive set of management capabilities for assigned resources while keeping global administration centralized. Fine-tune access using environment-level security settings to enable or disable specific Docker capabilities, and use resource controls to allow ownership-based access to individual containers and stacks. Most development and operations staff should be Standard Users in the environments where they need access.
