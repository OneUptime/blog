# How to Set Up Student Environments with Portainer Teams - Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Education, Team, Docker, Multi-Tenant, Training

Description: Use Portainer's Teams feature to create isolated student environments on a shared Docker host, giving each learner their own scoped access to containers, stacks, and volumes.

---

Portainer Teams allow you to segment access to a Docker environment by group. In an educational context, each student or project group gets their own team with scoped permissions - they can deploy and manage containers within their team's access controls without interfering with others. This is the foundation of a practical multi-student Docker lab.

## Step 1: Create a Dedicated Learning Environment

In Portainer, add the shared Docker host as a standalone environment:

1. Go to **Environment-related > Environments > Add environment**
2. Choose **Docker Standalone** and click **Start Wizard**
3. Name it `docker-lab`
4. Connect via the Edge Agent, agent, Docker API, or Docker socket

## Step 2: Create Teams

Go to **User-related > Teams** and add teams:

```text
Team: cohort-2026-a
Team: cohort-2026-b
Team: project-team-1
```

Create one team per class section or project group.

## Step 3: Create Student User Accounts

Go to **User-related > Users > Add user**:

```text
Username: student01
Password: (set or generate)
Administrator: disabled
```

Assign each student to their team by opening **User-related > Teams**, selecting the team, and clicking **Add** next to the user.

## Step 4: Assign Team Access to the Environment

Open **Environment-related > Environments**, locate `docker-lab`, and select **Manage access**. Assign teams with the **Role** dropdown:

```text
cohort-2026-a → Standard User
cohort-2026-b → Standard User
```

This lets students create and manage resources their team owns. To keep cohorts separated, set each stack or container's access control to **Restricted** for the owning team; existing resources are administrator-only by default unless you make them public or assign them to users or teams.

## Step 5: Pre-deploy Exercise Stacks Per Team

Optionally, pre-deploy starter stacks via Portainer's API and assign each stack's resource control to the target team so students can hit the ground running:

```bash
# Portainer API - deploy a stack and assign it to a specific team
# Requires jq and an API key for an administrator or instructor with access to the environment.
# Set ENDPOINT_ID to the docker-lab environment ID and TEAM_ID to the target team ID.

STACK_RESPONSE=$(curl -sS -X POST "https://portainer:9443/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "student01-starter",
    "StackFileContent": "services:\n  web:\n    image: nginx:alpine\n    ports:\n      - \"8100:80\"",
    "Env": [],
    "FromAppTemplate": false
  }')

RESOURCE_CONTROL_ID=$(printf '%s' "$STACK_RESPONSE" | jq -r '.ResourceControl.Id')

curl -sS -X PUT "https://portainer:9443/api/resource_controls/${RESOURCE_CONTROL_ID}" \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"Public\": false,
    \"AdministratorsOnly\": false,
    \"Users\": [],
    \"Teams\": [${TEAM_ID}]
  }"
```

## Step 6: Configure Resource Limits

For Docker Standalone labs, set resource limits on each exercise container or Compose service to prevent any student from monopolizing the shared host:

- Memory limit per container: 512 MB
- Maximum CPU usage: 1 CPU

For a hard cap on the number of containers per student, use separate lab hosts, Kubernetes namespaces with quotas, or automation around the Portainer API. Portainer CE team access on Docker Standalone does not provide a per-team maximum-container quota.

## Step 7: Student Workflow

Once configured, students log in to the Portainer UI and see only their team's resources:

1. Deploy containers from **App Templates** or the container creation form
2. View logs and use the Console for debugging
3. Create stacks for multi-service exercises
4. View volumes and inspect network configurations; with the Portainer Agent, browse volume contents

## Summary

Portainer Teams provide the access scoping needed for a shared Docker learning lab. Each student works in a team-scoped view, instructors retain admin visibility across all teams, and shared resources can be constrained with per-container limits and external quotas. The entire setup requires only a single Docker host and Portainer CE - no Kubernetes, no cloud infrastructure required.
