# How to Restore Portainer from a Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Restore, Disaster-recovery, Backup

Description: A guide to restoring Portainer from a backup after data loss, corruption, or failed upgrades, covering both manual and API-based restoration methods.

## Overview

Being able to restore Portainer from a backup is just as important as creating the backup. This guide covers how to restore Portainer CE and Business Edition from various backup types including volume tar archives, database file copies, and Portainer's native backup format.

## Restore from Docker Volume Backup (tar archive)

This is the most common restore scenario:

```bash
# Step 1: Stop and remove current Portainer container

docker stop portainer 2>/dev/null || true
docker rm portainer 2>/dev/null || true

# Step 2: Remove corrupted/old data volume (or rename it)
docker volume rm portainer_data 2>/dev/null || true
docker volume create portainer_data

# Step 3: Restore data from backup
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/portainer-backup-20260319.tar.gz"

# Verify restoration
docker run --rm \
  -v portainer_data:/data \
  alpine ls -la /data

# Step 4: Start Portainer with restored data
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

echo "Portainer restored successfully"
```

## Restore from BoltDB File Copy

This restores the Portainer database file only. It does not restore the rest of `/data` such as stack files, certificates, or other Portainer-managed files.

```bash
# Stop Portainer
docker stop portainer

# Replace the database file
# Use portainer.edb instead of portainer.db if database encryption is enabled
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine sh -c 'cp /backup/portainer-20260319.db /data/portainer.db'

# Start Portainer
docker start portainer
```

## Restore Portainer from Native Backup

```bash
# Via the Portainer UI on a fresh instance
# Initial setup screen → Restore Portainer from backup → Select backup file
# Note: Restore is only available before the instance is initialized and the data volume must be empty

# Via API on a fresh, uninitialized instance
# Omit the password field if the backup is not encrypted
curl -s -k \
  -X POST https://portainer:9443/api/restore \
  -F "file=@portainer-backup-20260319.tar.gz.encrypted" \
  -F "password=encryption-password"
```

## Restore on Kubernetes

```bash
# Scale down Portainer deployment first
kubectl scale deployment portainer --replicas=0 -n portainer

# Wait for the Portainer pod to terminate
kubectl wait --for=delete pod \
  -l app.kubernetes.io/name=portainer,app.kubernetes.io/instance=portainer \
  -n portainer \
  --timeout=60s

# Start a temporary restore pod that mounts the Portainer PVC
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: portainer-restore
  namespace: portainer
spec:
  restartPolicy: Never
  containers:
    - name: restore
      image: alpine
      command: ["sh", "-c", "sleep infinity"]
      volumeMounts:
        - name: portainer-data
          mountPath: /data
        - name: backup
          mountPath: /backup
  volumes:
    - name: portainer-data
      persistentVolumeClaim:
        claimName: portainer
    - name: backup
      emptyDir: {}
EOF

# Wait for the restore pod, copy the backup archive into it, then extract
kubectl wait --for=condition=Ready pod/portainer-restore -n portainer --timeout=60s
kubectl cp ./portainer-backup.tar.gz portainer/portainer-restore:/backup/portainer-backup.tar.gz
kubectl exec -n portainer portainer-restore -- sh -c 'cd /data && tar xzf /backup/portainer-backup.tar.gz'

# Clean up the restore pod and scale Portainer back up
kubectl delete pod portainer-restore -n portainer
kubectl scale deployment portainer --replicas=1 -n portainer
```

## Post-Restore Verification

```bash
# Check Portainer is running
docker ps | grep portainer

# Check logs for errors
docker logs portainer --tail=20

# Verify data is restored
# Log in to Portainer UI and verify:
# - Environments are configured
# - Users are present
# - Stacks are visible (though they may need reconnecting)
```

## Troubleshooting Restore Issues

### Database Version Mismatch

If you are rolling back to an older Portainer version, start Portainer with the version that matches the database backup:

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.33.7
```

### Corrupted Backup

```bash
# Verify backup integrity before restoring
tar tzf portainer-backup.tar.gz | head
# If this shows files, backup is valid
# If error, backup is corrupted - use another backup
```

## Conclusion

Restoring Portainer from a backup is straightforward when you follow the correct steps. The key is to stop Portainer before restoring data to avoid corruption, restore to a fresh volume, or deploy a fresh instance with an empty data volume when using Portainer's built-in restore, and verify the restoration by logging in and checking your configuration. Always test your restore procedure before a real incident - restore to a test environment periodically to confirm backups are working correctly.
