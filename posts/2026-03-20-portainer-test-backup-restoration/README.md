# How to Test Portainer Backup Restoration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Testing, Disaster Recovery, Verification, Docker

Description: Learn how to test that Portainer backup restoration works correctly before a real disaster occurs, using a test container alongside your production instance.

---

A backup you haven't tested is not a backup. This guide shows how to verify Portainer backup restoration without disturbing your production Portainer instance, using a separate test container on a different port.

## Why Test Restores?

- Confirms the backup file is complete and not corrupted
- Verifies the backup procedure captures all necessary Portainer data
- Practices the restore procedure so you're confident in an emergency
- Checks that the restored Portainer version is compatible with your backup

## Step 1: Restore to a Test Container

Run a fresh Portainer instance on a different port with an empty data volume, ideally using the same image tag as production, then restore from the backup on the initial setup page:

```bash
# Create a test volume
docker volume create portainer_test_data

# Start a fresh Portainer instance on port 9444
docker run -d \
  --name portainer-test \
  -p 9444:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_test_data:/data \
  portainer/portainer-ce:lts
```

Open `https://localhost:9444`, expand **Restore Portainer from backup** on the initial setup page, select your `tar.gz` backup file, and restore it. If the backup was encrypted, enter the password before restoring.

## Step 2: Verify the Restore Checklist

Open `https://localhost:9444` and verify:

```bash
# Automated verification via API
TEST_TOKEN=$(curl -sk -X POST https://localhost:9444/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Check environments were restored
ENVS=$(curl -sk -H "Authorization: Bearer $TEST_TOKEN" https://localhost:9444/api/endpoints | jq length)
echo "Environments restored: $ENVS"

# Check stacks were restored
STACKS=$(curl -sk -H "Authorization: Bearer $TEST_TOKEN" https://localhost:9444/api/stacks | jq length)
echo "Stacks restored: $STACKS"

# Check users were restored
USERS=$(curl -sk -H "Authorization: Bearer $TEST_TOKEN" https://localhost:9444/api/users | jq length)
echo "Users restored: $USERS"
```

## Step 3: Document What Was Lost

If any data is missing from the restore:

```bash
# Get tokens for the production and test Portainer instances
PROD_TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

TEST_TOKEN=$(curl -sk -X POST https://localhost:9444/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Compare production vs restored data
PROD_STACKS=$(curl -sk -H "Authorization: Bearer $PROD_TOKEN" https://localhost:9443/api/stacks | jq -r '.[].Name' | sort)
TEST_STACKS=$(curl -sk -H "Authorization: Bearer $TEST_TOKEN" https://localhost:9444/api/stacks | jq -r '.[].Name' | sort)

diff <(echo "$PROD_STACKS") <(echo "$TEST_STACKS")
# Any differences indicate restore discrepancies to investigate
```

## Step 4: Clean Up the Test Environment

```bash
# Remove the test container and volume
docker stop portainer-test && docker rm portainer-test
docker volume rm portainer_test_data
```

## Scheduling Regular Restore Tests

Add a monthly restore test to your calendar and run it against a fresh Portainer instance with an empty data volume.
