# How to Remove an Environment from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment, Administration, Cleanup

Description: Safely remove an environment from Portainer including cleanup of associated resources and data.

## Introduction

When an environment is decommissioned or no longer needed in Portainer, you should remove it cleanly to avoid stale entries and confusion. Removing an environment from Portainer does NOT affect the containers or services running on that environment - it only removes Portainer's connection to it.

## Before Removing

Check if any stacks or services are deployed that are managed via Portainer:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

ENDPOINT_ID=1

# List stacks in this environment

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -G \
  --data-urlencode "filters={\"EndpointID\":${ENDPOINT_ID}}" \
  "https://portainer.example.com/api/stacks" \
  | python3 -c "import sys,json; [print(s['Name']) for s in json.load(sys.stdin)]"
```

## Remove via Web UI

1. Go to **Environments**
2. Check the box next to the environment to remove
3. Click **Remove**
4. Confirm the removal

## Remove via API

```bash
# Delete environment by ID
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}"
```

## Cleanup Agent (If Applicable)

After removing the environment from Portainer, clean up the agent on the target host:

```bash
# Stop and remove the Portainer agent container
docker stop portainer_agent
docker rm portainer_agent

# Or for Swarm:
docker service rm portainer-agent_agent
```

## Cleanup Kubernetes Agent

```bash
# Remove Portainer Agent from Kubernetes
kubectl delete namespace portainer
```

## What Happens to Existing Resources

- Containers and services on the removed environment continue running
- Portainer no longer shows or manages them
- Stack definitions associated with the removed environment become orphaned in Portainer and need re-association to be fully recovered
- Access policies for the environment are deleted from Portainer

## Conclusion

Removing environments from Portainer does not stop the actual workloads, but the removal itself cannot be reversed. Clean up the agent components from the target host if you also want to remove Portainer from the decommissioned environment.
