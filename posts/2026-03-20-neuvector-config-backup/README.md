# How to Back Up NeuVector Configuration - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Backup, Security, Kubernetes, Configuration Management, SUSE Rancher

Description: Learn how to back up NeuVector security configuration including all policies, groups, admission rules, and settings for disaster recovery and environment replication.

---

NeuVector stores its configuration in an internal database. Regular backups protect against accidental policy deletion, cluster failures, and provide the ability to restore to a known-good security state.

---

## Step 1: Export Configuration via API

```bash
# Authenticate to NeuVector

TOKEN=$(curl -sk -X POST \
  https://neuvector.example.com/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"admin"}}' \
  | jq -r '.token.token')

# Export the complete configuration
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/file/config \
  --output nv-config-backup-$(date +%Y%m%d%H%M%S).conf
```

---

## Step 2: Schedule Automated Backups

Create a CronJob that exports and stores NeuVector configuration to an S3 bucket:

```yaml
# nv-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-backup
  namespace: neuvector
spec:
  schedule: "0 2 * * *"   # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: neuvector-backup-sa
          containers:
            - name: backup
              image: alpine/curl:latest
              env:
                - name: NV_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-backup-creds
                      key: password
                - name: AWS_DEFAULT_REGION
                  value: us-east-1
              command:
                - sh
                - -c
                - |
                  # Authenticate
                  TOKEN=$(curl -sk -X POST https://neuvector-svc.neuvector.svc.cluster.local/v1/auth \
                    -H "Content-Type: application/json" \
                    -d "{\"password\":{\"username\":\"backup-user\",\"password\":\"$NV_PASSWORD\"}}" \
                    | grep -o '"token":"[^"]*' | tail -n1 | cut -d'"' -f4)
                  # Export and upload
                  FILENAME="nv-backup-$(date +%Y%m%d%H%M%S).conf"
                  curl -sk -H "X-Auth-Token: $TOKEN" \
                    https://neuvector-svc.neuvector.svc.cluster.local/v1/file/config \
                    --output /tmp/$FILENAME
                  aws s3 cp /tmp/$FILENAME s3://my-neuvector-backups/
          restartPolicy: OnFailure
```

---

## Step 3: Back Up NeuVector Secrets

The NeuVector admin credentials and certificates should also be backed up:

```bash
# Export NeuVector secrets
kubectl get secrets -n neuvector -o yaml > neuvector-secrets-$(date +%Y%m%d).yaml

# Back up the NeuVector TLS certificate
kubectl get secret neuvector-tls-secret -n neuvector -o yaml > neuvector-tls-backup.yaml
```

Store these in a secrets manager (Vault, AWS Secrets Manager) rather than in plain files.

---

## Step 4: Restore from Backup

```bash
# Authenticate to the target NeuVector instance
TOKEN=$(curl -sk -X POST \
  https://neuvector-new.example.com/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"admin"}}' \
  | jq -r '.token.token')

# Restore configuration from backup file (uploaded as multipart/form-data)
curl -sk -X POST \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector-new.example.com/v1/file/config \
  -F "configuration=@nv-config-backup-20260320.conf"
```

---

## Step 5: Verify Restoration

```bash
# Check group count after restore
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector-new.example.com/v1/group?scope=local \
  | jq '.groups | length'

# Check network rule count
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector-new.example.com/v1/policy/rule \
  | jq '.rules | length'
```

---

## Best Practices

- Store backups in an S3 bucket with versioning enabled so you can roll back to any previous backup.
- Test the restoration process quarterly to verify backups are valid.
- Create a dedicated read-only NeuVector user for backup jobs - never use the admin account.
- Back up before every NeuVector upgrade as a safety net.
