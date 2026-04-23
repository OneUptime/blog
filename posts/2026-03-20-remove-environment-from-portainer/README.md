# How to Remove an Environment from Portainer - From

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment, Cleanup, Configuration, DevOps

Description: Safely remove an environment from Portainer without affecting the underlying Docker or Kubernetes infrastructure.

---

How to Remove an Environment from Portainer in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

## Overview

Portainer provides rich tooling for managing environments at scale. Following best practices ensures your team can efficiently navigate and manage multiple environments.

## Step-by-Step Instructions

### Via the Portainer UI

1. Log in to Portainer as an administrator
2. Under **Administration**, navigate to **Environment-related** > **Environments**
3. Select the checkbox next to the environment you want to remove
4. Click **Remove**
5. Confirm the removal

### Via the API

In the Portainer API, environments are still managed under the `/api/endpoints` routes.

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List all environments and note the ID you want to remove

curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
for e in json.load(sys.stdin):
    print('{}: {}'.format(e['Id'], e['Name']))
"

# Remove the environment from Portainer
ENV_ID=1

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE \
  "https://localhost:9443/api/endpoints/${ENV_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  --insecure

# A successful deletion returns: 204
```

## Important Note for Agent-Based Environments

Removing an environment from Portainer removes the environment record from Portainer. It does not uninstall the Portainer Agent or Edge Agent from the target Docker or Kubernetes environment. For Docker environments, existing stacks become orphaned and can be re-associated after you add the environment again.

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., `prod`, `staging`)
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
