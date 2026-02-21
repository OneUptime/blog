# How to Use Ansible to Automate Database Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Database, Backups, PostgreSQL, MySQL

Description: Automate database backup workflows with Ansible including scheduled dumps, compression, encryption, retention policies, and offsite storage.

---

Database backups are the safety net you hope you never need but absolutely must have. When a developer accidentally drops a production table, or ransomware hits your infrastructure, your backup is the difference between a brief recovery and a catastrophic data loss. Ansible automates the entire backup workflow: scheduling dumps, compressing and encrypting them, shipping them offsite, and cleaning up old backups based on retention policies.

## Role Defaults

```yaml
# roles/db_backup/defaults/main.yml - Database backup configuration
backup_base_dir: /opt/backups
backup_retention_days: 30
backup_encryption_enabled: true
backup_encryption_key: "{{ vault_backup_encryption_key }}"
backup_compress: true
backup_offsite_enabled: true
backup_offsite_bucket: "s3://company-backups/databases"

# Databases to back up
backup_databases:
  - name: app_production
    type: postgresql
    host: localhost
    port: 5432
    user: backup_user
    password: "{{ vault_db_backup_password }}"
    schedule:
      minute: "0"
      hour: "2"

  - name: wordpress
    type: mysql
    host: localhost
    port: 3306
    user: backup_user
    password: "{{ vault_mysql_backup_password }}"
    schedule:
      minute: "0"
      hour: "3"
```

## Main Tasks

```yaml
# roles/db_backup/tasks/main.yml - Set up automated database backups
---
- name: Install backup dependencies
  apt:
    name:
      - postgresql-client
      - default-mysql-client
      - gzip
      - gpg
      - awscli
    state: present
    update_cache: yes

- name: Create backup directories
  file:
    path: "{{ backup_base_dir }}/{{ item.name }}"
    state: directory
    owner: root
    group: root
    mode: '0700'
  loop: "{{ backup_databases }}"

- name: Deploy backup script for PostgreSQL databases
  template:
    src: backup_postgresql.sh.j2
    dest: "/usr/local/bin/backup-{{ item.name }}.sh"
    owner: root
    group: root
    mode: '0700'
  loop: "{{ backup_databases }}"
  when: item.type == 'postgresql'

- name: Deploy backup script for MySQL databases
  template:
    src: backup_mysql.sh.j2
    dest: "/usr/local/bin/backup-{{ item.name }}.sh"
    owner: root
    group: root
    mode: '0700'
  loop: "{{ backup_databases }}"
  when: item.type == 'mysql'

- name: Schedule backup cron jobs
  cron:
    name: "Backup {{ item.name }}"
    minute: "{{ item.schedule.minute }}"
    hour: "{{ item.schedule.hour }}"
    job: "/usr/local/bin/backup-{{ item.name }}.sh >> /var/log/backup-{{ item.name }}.log 2>&1"
    user: root
  loop: "{{ backup_databases }}"

- name: Deploy backup verification script
  template:
    src: verify_backup.sh.j2
    dest: /usr/local/bin/verify-backups.sh
    mode: '0700'

- name: Schedule daily backup verification
  cron:
    name: "Verify database backups"
    minute: "0"
    hour: "8"
    job: "/usr/local/bin/verify-backups.sh | logger -t backup-verify"
    user: root
```

## PostgreSQL Backup Script Template

```bash
#!/bin/bash
# roles/db_backup/templates/backup_postgresql.sh.j2
# Automated PostgreSQL backup for {{ item.name }}

set -euo pipefail

DB_NAME="{{ item.name }}"
DB_HOST="{{ item.host }}"
DB_PORT="{{ item.port }}"
DB_USER="{{ item.user }}"
BACKUP_DIR="{{ backup_base_dir }}/${DB_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
RETENTION_DAYS={{ backup_retention_days }}

export PGPASSWORD="{{ item.password }}"

echo "[$(date)] Starting backup of ${DB_NAME}"

# Create the dump
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
  --format=custom --compress=9 \
  "${DB_NAME}" > "${BACKUP_FILE}.dump"

{% if backup_compress %}
# Compress the backup
gzip "${BACKUP_FILE}.dump"
BACKUP_FILE="${BACKUP_FILE}.dump.gz"
{% else %}
BACKUP_FILE="${BACKUP_FILE}.dump"
{% endif %}

{% if backup_encryption_enabled %}
# Encrypt the backup
gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase "{{ backup_encryption_key }}" \
  "${BACKUP_FILE}"
rm -f "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gpg"
{% endif %}

{% if backup_offsite_enabled %}
# Upload to offsite storage
aws s3 cp "${BACKUP_FILE}" "{{ backup_offsite_bucket }}/${DB_NAME}/" --quiet
{% endif %}

# Clean up old local backups
find "${BACKUP_DIR}" -name "*.dump*" -mtime +${RETENTION_DAYS} -delete

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"
```

## MySQL Backup Script Template

```bash
#!/bin/bash
# roles/db_backup/templates/backup_mysql.sh.j2
# Automated MySQL backup for {{ item.name }}

set -euo pipefail

DB_NAME="{{ item.name }}"
DB_HOST="{{ item.host }}"
DB_PORT="{{ item.port }}"
DB_USER="{{ item.user }}"
BACKUP_DIR="{{ backup_base_dir }}/${DB_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
RETENTION_DAYS={{ backup_retention_days }}

echo "[$(date)] Starting backup of ${DB_NAME}"

# Create the dump with single-transaction for consistency
mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
  -p"{{ item.password }}" \
  --single-transaction --routines --triggers \
  "${DB_NAME}" > "${BACKUP_FILE}"

{% if backup_compress %}
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"
{% endif %}

{% if backup_encryption_enabled %}
gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase "{{ backup_encryption_key }}" \
  "${BACKUP_FILE}"
rm -f "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gpg"
{% endif %}

{% if backup_offsite_enabled %}
aws s3 cp "${BACKUP_FILE}" "{{ backup_offsite_bucket }}/${DB_NAME}/" --quiet
{% endif %}

find "${BACKUP_DIR}" -name "*.sql*" -mtime +${RETENTION_DAYS} -delete

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"
```

## Backup Verification

```bash
#!/bin/bash
# roles/db_backup/templates/verify_backup.sh.j2
# Verify that recent backups exist and are valid

ERRORS=0
{% for db in backup_databases %}
LATEST=$(ls -t {{ backup_base_dir }}/{{ db.name }}/ 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "ERROR: No backup found for {{ db.name }}"
  ERRORS=$((ERRORS + 1))
else
  AGE=$(( ($(date +%s) - $(stat -c %Y "{{ backup_base_dir }}/{{ db.name }}/$LATEST")) / 3600 ))
  if [ "$AGE" -gt 26 ]; then
    echo "WARNING: Latest backup for {{ db.name }} is ${AGE} hours old"
    ERRORS=$((ERRORS + 1))
  else
    SIZE=$(du -h "{{ backup_base_dir }}/{{ db.name }}/$LATEST" | cut -f1)
    echo "OK: {{ db.name }} - latest backup: $LATEST ($SIZE, ${AGE}h ago)"
  fi
fi
{% endfor %}

exit $ERRORS
```

## Running the Playbook

```bash
# Set up automated backups
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass

# Trigger an immediate backup
ansible -i inventory/hosts.ini db_servers -m command -a "/usr/local/bin/backup-app_production.sh" --become
```

## Summary

This Ansible playbook creates a complete database backup system with compression, encryption, offsite storage, retention management, and automated verification. The scripts are generated per-database with the right credentials and settings baked in. Backup verification runs daily and logs warnings if any backup is missing or stale. You get peace of mind knowing that your data is protected, without having to remember to run backups manually.
